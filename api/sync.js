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
    if (req.method === 'GET') {
      const rollNo = (req.query.rollNo || '').trim().toUpperCase();
      if (!rollNo) {
        return res.status(400).json({ error: 'rollNo parameter is required.' });
      }

      const result = await sql`
        SELECT calendar_json, attendance_json, subjects_json, target_threshold, updated_at
        FROM user_data WHERE roll_no = ${rollNo}
      `;

      if (result.length === 0) {
        return res.status(200).json({ success: true, data: null });
      }

      return res.status(200).json({ success: true, data: result[0] });
    }

    if (req.method === 'POST') {
      const { rollNo, calendar, attendance, subjects, targetThreshold } = req.body || {};
      const formattedRoll = (rollNo || '').trim().toUpperCase();

      if (!formattedRoll) {
        return res.status(400).json({ error: 'rollNo is required for syncing data.' });
      }

      await sql`
        INSERT INTO user_data (roll_no, calendar_json, attendance_json, subjects_json, target_threshold, updated_at)
        VALUES (${formattedRoll}, ${JSON.stringify(calendar)}, ${JSON.stringify(attendance)}, ${JSON.stringify(subjects)}, ${targetThreshold || 75}, CURRENT_TIMESTAMP)
        ON CONFLICT (roll_no) DO UPDATE SET
          calendar_json = EXCLUDED.calendar_json,
          attendance_json = EXCLUDED.attendance_json,
          subjects_json = EXCLUDED.subjects_json,
          target_threshold = EXCLUDED.target_threshold,
          updated_at = CURRENT_TIMESTAMP;
      `;

      return res.status(200).json({ success: true, message: 'Data synced successfully to Neon DB.' });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('API Sync Error:', error);
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
