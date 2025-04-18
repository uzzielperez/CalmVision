import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  try {
    console.log('Running database migration...');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`ALTER TABLE meditations ADD COLUMN IF NOT EXISTS model TEXT`;
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 