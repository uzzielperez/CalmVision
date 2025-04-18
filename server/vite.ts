import express, { type Express } from "express";
import fs from 'fs';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viteLogger = createLogger();

// Enhanced logging function
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Production static file paths
const STATIC_PATHS = [
  path.resolve(__dirname, '../server/public'),       // Local development
  '/opt/render/project/src/server/public',          // Render.com primary
  path.resolve(process.cwd(), 'dist'),              // Fallback dist
  '/opt/render/project/src/dist',                   // Render.com alternative
];

// Vite dev server setup
export async function setupVite(app: Express, server: Server) {
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
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(__dirname, "../client/index.html"),
        "utf-8"
      );
      const updatedTemplate = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const html = await vite.transformIndexHtml(req.originalUrl, updatedTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// Production static file serving
export function serveStatic(app: express.Express) {
  const staticDir = path.join(process.cwd(), 'server', 'public');
  
  // Debug logging
  log('Static files directory:', staticDir);
  log('Directory contents:', fs.readdirSync(staticDir).join(', '));

  // Verify assets directory
  const assetsDir = path.join(staticDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    log(`Found ${assets.length} assets in ${assetsDir}`);
    
    // Find main JS and CSS files
    const jsFile = assets.find(f => /index-\w+\.js$/.test(f));
    const cssFile = assets.find(f => /index-\w+\.css$/.test(f));
    
    if (jsFile) log(`Main JS file: ${jsFile}`);
    if (cssFile) log(`Main CSS file: ${cssFile}`);
  } else {
    log(`Assets directory not found at ${assetsDir}`);
  }

  // Serve static files with proper headers
  app.use(express.static(staticDir, {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }
    }
  }));

  // Serve assets with caching
  app.use('/assets', express.static(assetsDir, {
    maxAge: '1y',
    immutable: true
  }));

  // Client-side routing fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return res.status(404).end();
    }
    
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}