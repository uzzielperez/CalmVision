import express from "express";
import fs from 'fs';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: express.Express, server: any) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: express.Express) {
  const possibleDistPaths = [
    path.resolve(process.cwd(), 'server', 'public'),
    path.resolve(process.cwd(), 'dist'),
    '/opt/render/project/src/server/public',
    '/opt/render/project/src/dist',
  ];

  let clientDistPath: string | null = null;
  let assetsPath: string | null = null;

  for (const dirPath of possibleDistPaths) {
    if (fs.existsSync(dirPath)) {
      const indexPath = path.join(dirPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        clientDistPath = dirPath;
        log(`Found index.html at: ${indexPath}`);
        const potentialAssetsPath = path.join(dirPath, 'assets');
        if (fs.existsSync(potentialAssetsPath)) {
          assetsPath = potentialAssetsPath;
          log(`Found assets directory at: ${assetsPath}`);
        } else {
          log(`Assets directory not found at: ${potentialAssetsPath}`);
        }
        break;
      }
    }
  }

  if (!clientDistPath) {
    log(`Error: No static files directory found in: ${possibleDistPaths.join(', ')}`);
    app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.status(404).send('Application files not found. Please check build configuration.');
      } else {
        next();
      }
    });
    return;
  }

  log(`Serving static files from: ${clientDistPath}`);

  try {
    const files = fs.readdirSync(clientDistPath);
    log(`Files in ${clientDistPath}: ${files.join(', ')}`);
    if (assetsPath) {
      const assetFiles = fs.readdirSync(assetsPath);
      log(`Files in ${assetsPath}: ${assetFiles.join(', ')}`);
    }
  } catch (err) {
    log(`Error reading directory ${clientDistPath}: ${err}`);
  }

  app.get('/dist/index.js', (req, res) => {
    if (!assetsPath) {
      log(`Cannot serve /dist/index.js: Assets directory not found`);
      res.status(404).send('Assets directory not found');
      return;
    }

    try {
      const assetFiles = fs.readdirSync(assetsPath);
      const mainJsFile = assetFiles.find(file => file.startsWith('index-') && file.endsWith('.js'));
      if (!mainJsFile) {
        log(`No hashed index.js file found in ${assetsPath}. Available files: ${assetFiles.join(', ')}`);
        res.status(404).send('JavaScript file not found');
        return;
      }

      const jsPath = path.join(assetsPath, mainJsFile);
      log(`Serving hashed JS file: ${jsPath}`);
      res.set('Content-Type', 'application/javascript');
      res.sendFile(jsPath);
    } catch (err) {
      log(`Error reading assets directory ${assetsPath}: ${err}`);
      res.status(404).send('Error accessing JavaScript file');
    }
  });

  if (assetsPath) {
    app.use('/assets', express.static(assetsPath, {
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
  }

  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }

    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      log(`Serving index.html for route: ${req.path}`);
      res.sendFile(indexPath);
    } else {
      log(`Error: index.html not found at ${indexPath}`);
      res.status(404).send('Application files not found.');
    }
  });
}