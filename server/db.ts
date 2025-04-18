// At the top of db.ts
import * as dotenv from 'dotenv';
dotenv.config();
import * as schema from "@shared/schema";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Use a mock database for development
let db: any;

if (process.env.NODE_ENV === 'development') {
  // Use mock DB for development to avoid WebSocket issues
  console.log("Using mock database for development");
  
  // Create a mock DB with the same interface
  db = {
    insert: () => ({ 
      values: () => ({ 
        returning: async () => [{ 
          id: 1, 
          prompt: 'Mock prompt', 
          content: 'Mock meditation content', 
          createdAt: new Date() 
        }] 
      }) 
    }),
    select: () => ({ 
      from: () => ({ 
        where: () => [{ 
          id: 1, 
          prompt: 'Mock prompt', 
          content: 'Mock meditation content', 
          createdAt: new Date() 
        }],
        orderBy: () => [{ 
          id: 1, 
          prompt: 'Mock prompt', 
          content: 'Mock meditation content', 
          createdAt: new Date() 
        }] 
      }) 
    }),
    update: () => ({ 
      set: () => ({ 
        where: () => ({ 
          returning: async () => [{ 
            id: 1, 
            prompt: 'Mock prompt', 
            content: 'Mock content', 
            rating: 5, 
            createdAt: new Date() 
          }] 
        }) 
      }) 
    }),
    delete: () => ({ where: async () => null })
  };
} else {
  // For production, use Neon
  console.log("Using Neon PostgreSQL for production");
  
  // Import ws module
  try {
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
  } catch (error) {
    console.error("Failed to load ws module:", error);
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db };
