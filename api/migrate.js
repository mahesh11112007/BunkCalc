import { getDb } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: 'Database connection string (DATABASE_URL) is not configured.' });
  }

  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        roll_no VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        college_name VARCHAR(255),
        pin VARCHAR(100) NOT NULL,
        program VARCHAR(255),
        target_threshold INT DEFAULT 75,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_data table
    await sql`
      CREATE TABLE IF NOT EXISTS user_data (
        roll_no VARCHAR(50) PRIMARY KEY REFERENCES users(roll_no) ON DELETE CASCADE,
        calendar_json JSONB NOT NULL,
        attendance_json JSONB NOT NULL,
        subjects_json JSONB NOT NULL,
        target_threshold INT DEFAULT 75,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return res.status(200).json({ 
      success: true, 
      message: 'Database migration completed successfully. Tables created.' 
    });
  } catch (error) {
    console.error('Migration Error:', error);
    return res.status(500).json({ error: 'Migration failed: ' + error.message });
  }
}
