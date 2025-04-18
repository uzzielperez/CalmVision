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
      const alternativeAssetsPath = path.join(process.cwd(), 'dist', 'public', 'assets');
      
      // Log all possible asset paths for debugging
      log(`Checking primary assets path: ${assetsPath}`);
      log(`Checking alternative assets path: ${alternativeAssetsPath}`);
      
      let actualAssetsPath = null;
      if (fs.existsSync(assetsPath)) {
        actualAssetsPath = assetsPath;
        log(`Using primary assets path: ${assetsPath}`);
      } else if (fs.existsSync(alternativeAssetsPath)) {
        actualAssetsPath = alternativeAssetsPath;
        log(`Using alternative assets path: ${alternativeAssetsPath}`);
      }
      
      if (actualAssetsPath) {
        const assetFiles = fs.readdirSync(actualAssetsPath);
        log(`Files in assets: ${assetFiles.join(', ')}`);
        
        // Find the main JS file in assets with hash
        const mainJsFile = assetFiles.find(file => file.endsWith('.js') && file.includes('index-'));
        if (mainJsFile) {
          log(`Found main JS file: ${mainJsFile}`);
          
          // Add a direct route for /dist/index.js to serve the actual file
          app.get('/dist/index.js', (req, res) => {
            log(`Serving main JS file: ${mainJsFile}`);
            const jsPath = path.join(actualAssetsPath, mainJsFile);
            res.set('Content-Type', 'application/javascript');
            res.sendFile(jsPath);
          });
          
          // Also serve the CSS file if it exists
          const mainCssFile = assetFiles.find(file => file.endsWith('.css') && file.includes('index-'));
          if (mainCssFile) {
            log(`Found main CSS file: ${mainCssFile}`);
            app.get('/dist/index.css', (req, res) => {
              log(`Serving main CSS file: ${mainCssFile}`);
              const cssPath = path.join(actualAssetsPath, mainCssFile);
              res.set('Content-Type', 'text/css');
              res.sendFile(cssPath);
            });
          }
        } else {
          // Assets directory exists but no main JS file found
          log(`Assets directory exists but is empty or missing main JS file`);
          
          // Create a fallback JS file in the assets directory
          const fallbackJsPath = path.join(assetsPath, 'index-fallback.js');
          const fallbackJs = `
            console.log("Loading fallback JavaScript file");
            // Initialize the application with minimal functionality
            window.addEventListener('DOMContentLoaded', () => {
              document.body.innerHTML = '<div style="padding: 40px; font-family: system-ui, sans-serif;">' +
                '<h1>CalmVision</h1>' +
                '<p>The application assets could not be loaded properly.</p>' +
                '<p>This could be due to a build issue or missing files.</p>' +
                '<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px 0;">Error: Main JavaScript file not found in assets directory</div>' +
                '<p>Please check the build configuration and deployment process.</p>' +
                '</div>';
            });
          `;
          
          try {
            fs.writeFileSync(fallbackJsPath, fallbackJs);
            log(`Created fallback JS file at: ${fallbackJsPath}`);
            
            // Add a route to serve this file
            app.get('/dist/index.js', (req, res) => {
              log(`Serving fallback JS file from assets directory`);
              res.set('Content-Type', 'application/javascript');
              res.sendFile(fallbackJsPath);
            });
          } catch (err) {
            log(`Error creating fallback JS file: ${err}`);
            
            // If we can't create the file, serve the JS directly
            app.get('/dist/index.js', (req, res) => {
              log(`Serving inline fallback JS`);
              res.set('Content-Type', 'application/javascript');
              res.send(fallbackJs);
            });
          }
        }
      } else {
        log(`Assets directory not found at: ${assetsPath}`);
        
        // Try to find and copy build files from other locations
        log(`Attempting to locate and copy build files to the expected location...`);
        
        // Define possible build locations to check
        const possibleBuildLocations = [
          path.join(process.cwd(), 'dist', 'assets'),
          path.join(process.cwd(), 'build', 'assets'),
          path.join(process.cwd(), 'client', 'dist', 'assets'),
          path.join(process.cwd(), 'client', 'build', 'assets'),
          path.join(process.cwd(), 'dist', 'public', 'assets'),
          '/opt/render/project/src/dist/assets',
          '/opt/render/project/dist/assets'
        ];
        
        // Check each location for build files
        let foundBuildFiles = false;
        for (const buildPath of possibleBuildLocations) {
          if (fs.existsSync(buildPath)) {
            try {
              const buildFiles = fs.readdirSync(buildPath);
              log(`Found build files at: ${buildPath}`);
              log(`Files: ${buildFiles.join(', ')}`);
              
              // Look for the JS and CSS files
              const jsFile = buildFiles.find(file => file.endsWith('.js') && file.includes('index-'));
              const cssFile = buildFiles.find(file => file.endsWith('.css') && file.includes('index-'));
              
              if (jsFile || cssFile) {
                log(`Found build assets: JS=${jsFile || 'none'}, CSS=${cssFile || 'none'}`);
                
                // Create the assets directory if it doesn't exist
                fs.mkdirSync(assetsPath, { recursive: true });
                
                // Copy the files to the expected location
                if (jsFile) {
                  const sourcePath = path.join(buildPath, jsFile);
                  const destPath = path.join(assetsPath, jsFile);
                  fs.copyFileSync(sourcePath, destPath);
                  log(`Copied JS file from ${sourcePath} to ${destPath}`);
                  
                  // Set up a route to serve this file
                  app.get('/dist/index.js', (req, res) => {
                    log(`Serving copied JS file: ${jsFile}`);
                    res.set('Content-Type', 'application/javascript');
                    res.sendFile(path.join(assetsPath, jsFile));
                  });
                }
                
                if (cssFile) {
                  const sourcePath = path.join(buildPath, cssFile);
                  const destPath = path.join(assetsPath, cssFile);
                  fs.copyFileSync(sourcePath, destPath);
                  log(`Copied CSS file from ${sourcePath} to ${destPath}`);
                  
                  // Set up a route to serve this file
                  app.get('/dist/index.css', (req, res) => {
                    log(`Serving copied CSS file: ${cssFile}`);
                    res.set('Content-Type', 'text/css');
                    res.sendFile(path.join(assetsPath, cssFile));
                  });
                }
                
                foundBuildFiles = true;
                break;
              }
            } catch (err) {
              log(`Error accessing build path ${buildPath}: ${err}`);
            }
          }
        }
        
        if (foundBuildFiles) {
          log(`Successfully copied build files to the expected location`);
        } else {
          // Print directory tree for debugging if we couldn't find the build files
          log(`Could not find build files in any expected location. Printing directory tree...`);
          
          // Function to recursively list directories with more depth
          const listDir = (dir, depth = 0, maxDepth = 4) => {
            if (depth > maxDepth) {
              log(`${' '.repeat(depth * 2)}... (max depth reached)`);
              return;
            }
            
            const indent = ' '.repeat(depth * 2);
            log(`${indent}${path.basename(dir)}/`);
            
            try {
              const items = fs.readdirSync(dir);
              for (const item of items) {
                const itemPath = path.join(dir, item);
                try {
                  const stats = fs.statSync(itemPath);
                  
                  if (stats.isDirectory()) {
                    listDir(itemPath, depth + 1, maxDepth);
                  } else {
                    // For JS and CSS files, show more details
                    if (item.endsWith('.js') || item.endsWith('.css')) {
                      const sizeKb = Math.round(stats.size / 1024 * 100) / 100;
                      log(`${indent}  ${item} (${sizeKb} KB)`);
                    } else {
                      log(`${indent}  ${item}`);
                    }
                  }
                } catch (err) {
                  log(`${indent}  Error accessing ${itemPath}: ${err.message}`);
                }
              }
            } catch (err) {
              log(`${indent}Error reading directory ${dir}: ${err.message}`);
            }
          };
          
          // Start from multiple possible locations to find the build files
          log(`Starting directory tree from project root:`);
          listDir(process.cwd(), 0);
          
          // Also check the render-specific paths
          if (fs.existsSync('/opt/render/project')) {
            log(`Starting directory tree from Render project root:`);
            listDir('/opt/render/project', 0);
          }
          
          // Create assets directory and basic JS file if it doesn't exist
          log(`Creating assets directory and basic JS file`);
          fs.mkdirSync(assetsPath, { recursive: true });
          
          const basicJsFile = path.join(assetsPath, 'index-fallback.js');
          const basicJsContent = `
            console.log("Loading fallback JavaScript file");
            // Initialize the application with minimal functionality
            window.addEventListener('DOMContentLoaded', () => {
              document.body.innerHTML += '<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">Application assets could not be loaded properly. Using fallback mode.</div>';
            });
          `;
          fs.writeFileSync(basicJsFile, basicJsContent);
          log(`Created fallback JS file at: ${basicJsFile}`);
          
          // Add a route to serve this file
          app.get('/dist/index.js', (req, res) => {
            log(`Serving fallback JS file: ${basicJsFile}`);
            res.set('Content-Type', 'application/javascript');
            res.sendFile(basicJsFile);
          });
          
          // Don't return here, let the code continue
          // return;  <- Remove this line
        } catch (err) {
          log(`Error creating assets directory or printing tree: ${err}`);
          
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
        path.join(clientDistPath, 'assets', requestedFile),      // server/public/assets/index.js
        path.join(process.cwd(), 'dist', 'public', 'assets', requestedFile) // dist/public/assets/index.js
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
          
          // Check for assets in multiple locations
          const assetsPath = path.join(clientDistPath, 'assets');
          const alternativeAssetsPath = path.join(process.cwd(), 'dist', 'public', 'assets');
          
          // Hardcode the exact filenames from the build output
          const mainJsFile = 'index-Fms9jRiH.js';
          const mainCssFile = 'index-DYIp0JvB.css';
          
          let actualAssetsPath = null;
          if (fs.existsSync(assetsPath)) {
            actualAssetsPath = assetsPath;
          } else if (fs.existsSync(alternativeAssetsPath)) {
            actualAssetsPath = alternativeAssetsPath;
            log(`Using alternative assets path for HTML modification: ${alternativeAssetsPath}`);
          }
          
          if (actualAssetsPath) {
            // Create a modified version of the HTML with the correct script path
            let modifiedHtml = htmlContent;
            
            // Add both JS and CSS files
            let scriptsAdded = false;
            
            // Replace any references to /dist/index.js with the correct path
            if (modifiedHtml.includes('/dist/index.js')) {
              log(`Replacing /dist/index.js with /assets/${mainJsFile} in index.html`);
              modifiedHtml = modifiedHtml.replace('/dist/index.js', `/assets/${mainJsFile}`);
              scriptsAdded = true;
            }
            
            // Add CSS if needed
            if (!modifiedHtml.includes(mainCssFile)) {
              log(`Adding CSS link for ${mainCssFile}`);
              modifiedHtml = modifiedHtml.replace('</head>', `<link rel="stylesheet" href="/assets/${mainCssFile}"></head>`);
            }
            
            // If we couldn't find any script tags to replace, add our own
            if (!scriptsAdded) {
              log(`Adding script tag for ${mainJsFile}`);
              modifiedHtml = modifiedHtml.replace('</head>', `<script type="module" src="/assets/${mainJsFile}"></script></head>`);
            }
            
            // Send the modified HTML
            res.set('Content-Type', 'text/html');
            return res.send(modifiedHtml);
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