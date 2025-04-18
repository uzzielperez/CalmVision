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

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app, server) {
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
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

export function serveStatic(app) {
  const clientDistPath = path.resolve(process.cwd(), 'server', 'public');
  
  if (!fs.existsSync(clientDistPath)) {
    log(`Error: Static files directory not found at ${clientDistPath}`);
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
  
  // Log available files for debugging
  try {
    const files = fs.readdirSync(clientDistPath);
    log(`Files in ${clientDistPath}: ${files.join(', ')}`);
    const assetsPath = path.join(clientDistPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      log(`Files in assets: ${assetFiles.join(', ')}`);
    }
  } catch (err) {
    log(`Error reading directory: ${err}`);
  }

  // Handle requests for /dist/index.js by finding the hashed JS file
  app.get('/dist/index.js', (req, res) => {
    const assetsPath = path.join(clientDistPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      log(`Assets directory not found at: ${assetsPath}`);
      res.status(404).send('File not found');
      return;
    }

    try {
      const assetFiles = fs.readdirSync(assetsPath);
      const mainJsFile = assetFiles.find(file => file.startsWith('index-') && file.endsWith('.js'));
      if (!mainJsFile) {
        log(`No hashed index.js file found in ${assetsPath}`);
        res.status(404).send('File not found');
        return;
      }

      const jsPath = path.join(assetsPath, mainJsFile);
      log(`Serving hashed JS file: ${jsPath}`);
      res.set('Content-Type', 'application/javascript');
      res.sendFile(jsPath);
    } catch (err) {
      log(`Error reading assets directory: ${err}`);
      res.status(404).send('File not found');
    }
  });

  // Serve assets directly
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Serve other static files
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Serve index.html for client-side routing
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