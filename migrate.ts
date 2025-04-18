import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { meditations } from './shared/schema';

// Load environment variables
dotenv.config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Starting migration...');
    
    // Create migrations folder structure if it doesn't exist
    const migrationsDir = './drizzle';
    const metaDir = path.join(migrationsDir, 'meta');
    
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir);
    }
    
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir);
    }
    
    // Create _journal.json if it doesn't exist
    const journalPath = path.join(metaDir, '_journal.json');
    if (!fs.existsSync(journalPath)) {
      fs.writeFileSync(journalPath, JSON.stringify({ entries: [] }));
    }
    
    // Set up the database connection
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Direct SQL approach if the migrations aren't working
    console.log('Attempting direct schema update...');
    try {
      // Check if model column exists
      const checkResult = await sql`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'meditations' AND column_name = 'model'
        );
      `;
      
      const modelColumnExists = checkResult[0]?.exists || false;
      
      if (!modelColumnExists) {
        console.log('Adding model column to meditations table');
        await sql`ALTER TABLE meditations ADD COLUMN IF NOT EXISTS model TEXT;`;
        console.log('Model column added successfully');
      } else {
        console.log('Model column already exists');
      }
    } catch (sqlError) {
      console.error('Error running direct SQL:', sqlError);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 