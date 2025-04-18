import { neon } from '@neondatabase/serverless';

async function migrateAndStart() {
  try {
    console.log('Running migration...');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`ALTER TABLE meditations ADD COLUMN IF NOT EXISTS model TEXT;`;
    console.log('Migration successful');
    
    // Import and run the main application
    const { default: app } = await import('./dist/index.js');
    return app;
  } catch (error) {
    console.error('Migration or startup failed:', error);
    process.exit(1);
  }
}

migrateAndStart(); 