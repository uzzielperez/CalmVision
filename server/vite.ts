import express from "express";
import fs from 'fs';
import path from "path";

// Assuming log function is defined as in your original script
export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app) {
  // Possible locations for static files
  const possibleDistPaths = [
    path.resolve(process.cwd(), 'server', 'public'), // ./server/public
    path.resolve(process.cwd(), 'dist'), // ./dist
    '/opt/render/project/src/server/public', // Render-specific path
    '/opt/render/project/src/dist', // Render-specific dist path
  ];

  let clientDistPath = null;
  let assetsPath = null;

  // Find the first valid directory containing index.html
  for (const dirPath of possibleDistPaths) {
    if (fs.existsSync(dirPath)) {
      const indexPath = path.join(dirPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        clientDistPath = dirPath;
        log(`Found index.html at: ${indexPath}`);
        // Check for assets directory
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

  // If no valid directory is found, log error and set up fallback
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

  // Log directory contents for debugging
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

  // Handle /dist/index.js by finding the hashed JS file in assets
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

  // Serve assets directly
  if (assetsPath) {
    app.use('/assets', express.static(assetsPath, {
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
  }

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