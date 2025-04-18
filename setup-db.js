import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function setupDatabase() {
  try {
    console.log('Creating database schema if needed...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Create meditations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS meditations (
        id SERIAL PRIMARY KEY,
        prompt TEXT NOT NULL,
        content TEXT,
        rating INTEGER,
        model TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log('Database schema setup complete');
  } catch (error) {
    console.error('Database setup error:', error);
  }
}

setupDatabase();

// Make sure public directory exists
const publicDir = path.join(process.cwd(), 'server', 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory:', publicDir);
  fs.mkdirSync(publicDir, { recursive: true });
}