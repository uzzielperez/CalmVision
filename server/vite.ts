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
// Update the serveStatic function to prioritize the correct directory
// Update the serveStatic function to handle JavaScript files correctly
export function serveStatic(app: express.Express) {
  // Check multiple possible locations for the static files directory
  const possiblePaths = [
    // Prioritize the path where files are actually being built
    '/opt/render/project/src/server/public',
    path.resolve(process.cwd(), 'server/public'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'build'),
    '/opt/render/project/src/dist',
    '/opt/render/project/dist'
  ];
  
  // Find the first path that exists AND contains index.html
  let clientDistPath = null;
  for (const dirPath of possiblePaths) {
    if (fs.existsSync(dirPath)) {
      const indexPath = path.join(dirPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        clientDistPath = dirPath;
        log(`Found index.html at: ${indexPath}`);
        break;
      }
    }
  }
  
  // If no path with index.html was found, use the first existing path
  if (!clientDistPath) {
    clientDistPath = possiblePaths.find(dirPath => fs.existsSync(dirPath));
  }
  
  if (clientDistPath) {
    log(`Serving static files from: ${clientDistPath}`);
    
    // List files in the directory for debugging
    try {
      const files = fs.readdirSync(clientDistPath);
      log(`Files in ${clientDistPath}: ${files.join(', ')}`);
      
      // Check for assets directory
      const assetsPath = path.join(clientDistPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const assetFiles = fs.readdirSync(assetsPath);
        log(`Files in assets: ${assetFiles.join(', ')}`);
        
        // Find the main JS file in assets
        const mainJsFile = assetFiles.find(file => file.endsWith('.js') && file.includes('index-'));
        if (mainJsFile) {
          log(`Found main JS file: ${mainJsFile}`);
          
          // Add a direct route for /dist/index.js to serve the actual file
          app.get('/dist/index.js', (req, res) => {
            log(`Serving main JS file: ${mainJsFile}`);
            const jsPath = path.join(assetsPath, mainJsFile);
            res.set('Content-Type', 'application/javascript');
            res.sendFile(jsPath);
          });
        }
      } else {
        log(`Assets directory not found at: ${assetsPath}`);
        
        // Print directory tree for debugging
        log(`Printing directory tree for debugging:`);
        try {
          // Function to recursively list directories
          const listDir = (dir, depth = 0) => {
            const indent = '  '.repeat(depth);
            log(`${indent}${path.basename(dir)}/`);
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const itemPath = path.join(dir, item);
              const stats = fs.statSync(itemPath);
              
              if (stats.isDirectory()) {
                listDir(itemPath, depth + 1);
              } else {
                log(`${indent}  ${item}`);
              }
            }
          };
          
          // Start from the parent directory to see the full structure
          const parentDir = path.dirname(clientDistPath);
          log(`Starting directory tree from: ${parentDir}`);
          listDir(parentDir);
        } catch (err) {
          log(`Error printing directory tree: ${err}`);
        }
        
        // Handle /dist/index.js request when assets directory doesn't exist
        app.get('/dist/index.js', (req, res) => {
          log(`Creating fallback JavaScript file for ${req.path}`);
          
          // Create a simple JavaScript file that will at least load without errors
          const fallbackJs = `
            console.log("Loading fallback JavaScript file");
            // Initialize the application with minimal functionality
            window.addEventListener('DOMContentLoaded', () => {
              document.body.innerHTML += '<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">Application assets could not be loaded. Please check the build configuration.</div>';
            });
          `;
          
          res.set('Content-Type', 'application/javascript');
          res.send(fallbackJs);
        });
      }
    } catch (err) {
      log(`Error reading directory: ${err}`);
    }
    
    // Fix: Check multiple locations for JS files
    app.get('/dist/*.js', (req, res) => {
      const requestedFile = req.path.replace('/dist/', '');
      log(`Looking for JS file: ${requestedFile}`);
      
      // Skip if it's index.js as we have a specific handler for that
      if (requestedFile === 'index.js') {
        return;
      }
      
      // Try multiple possible locations for the JS file
      const possibleJsLocations = [
        path.join(clientDistPath, requestedFile),                // server/public/index.js
        path.join('/opt/render/project/src/dist', requestedFile), // dist/index.js
        path.join(process.cwd(), 'dist', requestedFile),         // ./dist/index.js
        path.join(clientDistPath, 'assets', requestedFile)       // server/public/assets/index.js
      ];
      
      // Find the first location that exists
      let jsPath = possibleJsLocations.find(p => fs.existsSync(p));
      
      // If not found, check for hashed files in assets directory
      const assetsPath = path.join(clientDistPath, 'assets');
      if (!jsPath && fs.existsSync(assetsPath)) {
        try {
          const assetFiles = fs.readdirSync(assetsPath);
          log(`Checking assets directory for JS files: ${assetFiles.join(', ')}`);
          
          // Look for files that match the pattern (e.g., index-[hash].js)
          const baseFileName = requestedFile.replace('.js', '');
          const matchingFile = assetFiles.find(file => 
            file.startsWith(baseFileName + '-') && file.endsWith('.js')
          );
          
          if (matchingFile) {
            jsPath = path.join(assetsPath, matchingFile);
            log(`Found matching hashed JS file: ${matchingFile}`);
          }
        } catch (err) {
          log(`Error reading assets directory: ${err}`);
        }
      }
      
      if (jsPath) {
        log(`Found JS file at: ${jsPath}`);
        res.set('Content-Type', 'application/javascript');
        res.sendFile(jsPath);
      } else {
        log(`JS file not found in any location: ${requestedFile}`);
        log(`Tried: ${possibleJsLocations.join(', ')}`);
        res.status(404).send('File not found');
      }
    });
    
    // Also handle assets JS files
    app.get('/assets/*.js', (req, res) => {
      const jsPath = path.join(clientDistPath, req.path);
      log(`Serving asset JS file from: ${jsPath}`);
      
      if (fs.existsSync(jsPath)) {
        res.set('Content-Type', 'application/javascript');
        res.sendFile(jsPath);
      } else {
        log(`Asset JS file not found: ${jsPath}`);
        res.status(404).send('File not found');
      }
    });
    
    // Serve static files from the directory
    app.use(express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    // Check for assets directory and serve it too
    const assetsPath = path.join(clientDistPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      app.use('/assets', express.static(assetsPath, {
        setHeaders: (res, filePath) => {
          if (path.extname(filePath) === '.js') {
            res.setHeader('Content-Type', 'application/javascript');
          }
        }
      }));
    }
    
    // Serve index.html for client-side routing - but only for non-asset routes
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      // Skip asset files
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return next();
      }
      
      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        log(`Serving index.html for route: ${req.path}`);
        
        // Read the index.html file and modify it to point to the correct JS file
        try {
          // Log the content of index.html for debugging
          const htmlContent = fs.readFileSync(indexPath, 'utf8');
          log(`Index.html content preview: ${htmlContent.substring(0, 200)}...`);
          
          const assetsPath = path.join(clientDistPath, 'assets');
          if (fs.existsSync(assetsPath)) {
            const assetFiles = fs.readdirSync(assetsPath);
            log(`Available asset files: ${assetFiles.join(', ')}`);
            
            const mainJsFile = assetFiles.find(file => file.endsWith('.js') && file.includes('index-'));
            
            if (mainJsFile) {
              log(`Found main JS file: ${mainJsFile}`);
              
              // Check if index.html contains script tags and what they reference
              const scriptTagMatch = htmlContent.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
              if (scriptTagMatch) {
                log(`Script tags found: ${scriptTagMatch.join(', ')}`);
              } else {
                log(`No script tags found in index.html`);
              }
              
              // Create a modified version of the HTML with the correct script path
              let modifiedHtml = htmlContent;
              
              // Replace any references to /dist/index.js with the correct path
              if (modifiedHtml.includes('/dist/index.js')) {
                log(`Replacing /dist/index.js with /assets/${mainJsFile} in index.html`);
                modifiedHtml = modifiedHtml.replace('/dist/index.js', `/assets/${mainJsFile}`);
                
                // Send the modified HTML
                res.set('Content-Type', 'text/html');
                return res.send(modifiedHtml);
              } else {
                // If there's no direct reference to /dist/index.js, look for other script tags
                // that might need to be updated
                const scriptSrcRegex = /<script[^>]*src="([^"]*)"[^>]*>/g;
                let match;
                let scriptFound = false;
                
                while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
                  const scriptSrc = match[1];
                  log(`Found script with src: ${scriptSrc}`);
                  
                  // If we find a script that looks like it might be the main entry point
                  if (scriptSrc.includes('index') || scriptSrc.includes('main') || scriptSrc.includes('bundle')) {
                    log(`Replacing ${scriptSrc} with /assets/${mainJsFile}`);
                    modifiedHtml = modifiedHtml.replace(scriptSrc, `/assets/${mainJsFile}`);
                    scriptFound = true;
                  }
                }
                
                if (scriptFound) {
                  // Send the modified HTML
                  res.set('Content-Type', 'text/html');
                  return res.send(modifiedHtml);
                } else {
                  // If we couldn't find any script tags to replace, add our own
                  log(`Adding script tag for ${mainJsFile}`);
                  modifiedHtml = modifiedHtml.replace('</head>', `<script type="module" src="/assets/${mainJsFile}"></script></head>`);
                  res.set('Content-Type', 'text/html');
                  return res.send(modifiedHtml);
                }
              }
            } else {
              log(`No main JS file found in assets directory`);
            }
          } else {
            log(`Assets directory not found at: ${assetsPath}`);
          }
        } catch (err) {
          log(`Error modifying index.html: ${err}`);
        }
        
        // If we couldn't modify the HTML, just send the file as-is
        res.sendFile(indexPath);
      } else {
        log(`Warning: index.html not found at ${indexPath}`);
        res.status(404).send('Application files not found.');
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