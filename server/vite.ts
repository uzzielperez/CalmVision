import express, { type Express } from "express";
import fs from 'fs';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
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

export async function setupVite(app: Express, server: Server) {
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
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// Update the serveStatic function to handle missing files
// Update the serveStatic function to handle Render's environment
export function serveStatic(app: express.Express) {
  // Check multiple possible locations for the dist directory
  const possiblePaths = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'build'),
    '/opt/render/project/src/dist',
    '/opt/render/project/dist'
  ];
  
  log(`Checking possible static file locations...`);
  
  // Log all possible paths and whether they exist
  possiblePaths.forEach(path => {
    log(`Checking path: ${path} - ${fs.existsSync(path) ? 'EXISTS' : 'NOT FOUND'}`);
  });
  
  // Find the first path that exists
  const clientDistPath = possiblePaths.find(path => fs.existsSync(path));
  
  if (clientDistPath) {
    log(`Found static files at: ${clientDistPath}`);
    
    // List files in the directory for debugging
    try {
      const files = fs.readdirSync(clientDistPath);
      log(`Files in ${clientDistPath}: ${files.join(', ')}`);
      
      // Check if public directory exists
      const publicPath = path.join(clientDistPath, 'public');
      if (fs.existsSync(publicPath)) {
        log(`Found public directory at: ${publicPath}`);
        const publicFiles = fs.readdirSync(publicPath);
        log(`Files in public directory: ${publicFiles.join(', ')}`);
      }
    } catch (err) {
      log(`Error reading directory: ${err}`);
    }
    
    // Serve static files from the dist directory
    app.use(express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    // Also serve files from the public subdirectory if it exists
    const publicPath = path.join(clientDistPath, 'public');
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }
    
    // Serve index.html for client-side routing
    app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        // First check for index.html in the root dist directory
        let indexPath = path.join(clientDistPath, 'index.html');
        
        // If not found, check in the public subdirectory
        if (!fs.existsSync(indexPath)) {
          indexPath = path.join(clientDistPath, 'public', 'index.html');
        }
        
        if (fs.existsSync(indexPath)) {
          log(`Serving index.html from: ${indexPath}`);
          res.sendFile(indexPath);
        } else {
          log(`Warning: index.html not found in any expected location`);
          res.status(404).send('Application files not found. Please check build configuration.');
        }
      } else {
        next();
      }
    });
  } else {
    log(`Warning: Could not find static files directory in any expected location`);
    
    // Add a fallback route for non-API routes when dist doesn't exist
    app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.status(404).send('Application files not found. Please check build configuration.');
      } else {
        next();
      }
    });
  }
}
