import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDatabase } from '../db-setup.js';
import path from 'path';

const app = express();
// Add request logging middleware
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add explicit MIME type handling for JavaScript files
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Remove this static file serving as it might conflict with serveStatic
// if (app.get("env") !== "development") {
//   app.use(express.static(path.join(process.cwd(), 'dist'), {
//     setHeaders: (res, filePath) => {
//       if (path.extname(filePath) === '.js') {
//         res.setHeader('Content-Type', 'application/javascript');
//       }
//     }
//   }));
// }

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function startServer() {
  // Run database migrations/setup
  try {
    await setupDatabase();
  } catch (error) {
    console.error('Database setup error:', error);
    // Continue even if database setup fails
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Let serveStatic handle all static file serving
    serveStatic(app);
    
    // Remove this as it's now handled in serveStatic
    // app.get('*', (req, res) => {
    //   res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    // });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
}

startServer().catch(console.error);
