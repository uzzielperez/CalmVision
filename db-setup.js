import { neon } from '@neondatabase/serverless';

// Will be run on startup
export async function setupDatabase() {
  try {
    console.log('Checking and updating database schema...');
    const sql = neon(process.env.DATABASE_URL);
    
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
    
    return true;
  } catch (error) {
    console.error('Database setup failed:', error);
    // Don't crash the application on migration failure
    return false;
  }
} 