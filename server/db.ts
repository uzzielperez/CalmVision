// At the top of db.ts
import * as dotenv from 'dotenv';
dotenv.config();
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Only use WebSockets in production and make sure ws is properly loaded
if (process.env.NODE_ENV === 'production') {
  try {
    // Dynamic import to handle module loading properly
    import('ws').then(wsModule => {
      neonConfig.webSocketConstructor = wsModule.default || wsModule;
      console.log("WebSocket module loaded successfully for Neon database");
    }).catch(err => {
      console.error("Failed to load WebSocket module:", err);
      // Fallback to HTTP
      neonConfig.useSecureWebSocket = false;
    });
  } catch (error) {
    console.error("Error setting up WebSocket:", error);
    // Fallback to HTTP
    neonConfig.useSecureWebSocket = false;
  }
} else {
  // For development, use mock database instead of real connection
  console.log("Development mode: Not using WebSockets");
  neonConfig.useSecureWebSocket = false;
  neonConfig.webSocketConstructor = undefined;
}

// Make sure DATABASE_URL is set
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create the database pool with error handling
let pool;
try {
  pool = new Pool({ connectionString: DATABASE_URL });
  console.log("Database pool created successfully");
} catch (error) {
  console.error("Failed to create database pool:", error);
  throw error;
}

export const db = drizzle({ client: pool, schema });
