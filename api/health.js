import { getDb } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  
  if (!sql) {
    return res.status(503).json({ 
      status: 'error',
      database: 'not_connected',
      message: 'DATABASE_URL environment variable is not configured' 
    });
  }

  try {
    // Test database connection with a simple query
    const result = await sql`SELECT NOW() as current_time`;
    
    // Check if tables exist
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'user_data')
    `;
    
    const tables = tablesCheck.map(t => t.table_name);
    
    return res.status(200).json({ 
      status: 'success',
      database: 'connected',
      message: 'Database connection successful',
      server_time: result[0].current_time,
      tables: {
        users: tables.includes('users'),
        user_data: tables.includes('user_data')
      },
      all_tables_exist: tables.includes('users') && tables.includes('user_data')
    });
  } catch (error) {
    console.error('Health Check Error:', error);
    return res.status(503).json({ 
      status: 'error',
      database: 'connection_failed',
      message: 'Database connection failed: ' + error.message 
    });
  }
}
