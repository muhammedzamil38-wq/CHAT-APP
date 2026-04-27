import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);');
    await pool.query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;');
    console.log('Migration successful: username added and phone made nullable.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
