import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDatabase } from '../db-setup.js';
import path from 'path';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Request logging middleware
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API response logging
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
      log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  log(`Error ${status}: ${message}`);
});

async function startServer() {
  try {
    await setupDatabase();
  } catch (error) {
    console.error('Database setup error:', error);
  }

  await registerRoutes(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Production static file serving
    const staticDir = path.join(process.cwd(), 'server', 'public');
    
    // Serve static assets with proper caching
    app.use('/assets', express.static(path.join(staticDir, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));

    // Serve other static files
    app.use(express.static(staticDir));

    // Client-side routing fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });

    log(`Production static files served from: ${staticDir}`);
  }

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});