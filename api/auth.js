import { getDb } from './db.js';

export default async function handler(req, res) {
  // Enable CORS
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
    const { action, rollNo, pin, name, email, collegeName, program, targetThreshold } = req.body || {};
    const formattedRoll = (rollNo || '').trim().toUpperCase();

    if (action === 'getAllUsers') {
      const allUsers = await sql`
        SELECT u.roll_no, u.name, u.email, u.college_name, u.program, u.target_threshold, u.created_at,
               d.attendance_json, d.updated_at
        FROM users u
        LEFT JOIN user_data d ON u.roll_no = d.roll_no
        ORDER BY u.created_at DESC;
      `;
      return res.status(200).json({ success: true, users: allUsers });
    }

    if (!formattedRoll) {
      return res.status(400).json({ error: 'Roll number is required.' });
    }

    if (action === 'signup') {
      // Check if user exists
      const existing = await sql`SELECT roll_no FROM users WHERE roll_no = ${formattedRoll}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'An account with this Roll Number already exists.' });
      }

      // Create User
      const newUser = await sql`
        INSERT INTO users (roll_no, name, email, college_name, pin, program, target_threshold)
        VALUES (${formattedRoll}, ${name}, ${email || ''}, ${collegeName || ''}, ${pin}, ${program || 'B.Tech CSE'}, ${targetThreshold || 75})
        RETURNING roll_no, name, email, college_name, program, target_threshold;
      `;

      return res.status(201).json({ success: true, user: newUser[0] });
    } else if (action === 'login') {
      const user = await sql`SELECT roll_no, name, email, college_name, pin, program, target_threshold FROM users WHERE roll_no = ${formattedRoll}`;
      if (user.length === 0 || user[0].pin !== pin) {
        return res.status(401).json({ error: 'Invalid Roll Number or PIN.' });
      }

      const { pin: _, ...userProfile } = user[0];
      return res.status(200).json({ success: true, user: userProfile });
    } else if (action === 'updateProfile') {
      const { pin: newPin } = req.body || {};
      // Only update pin if a non-empty string is provided, otherwise keep existing
      const pinToSet = (newPin && String(newPin).trim().length > 0) ? String(newPin).trim() : null;
      let updated;
      if (pinToSet) {
        updated = await sql`
          UPDATE users
          SET name = ${name}, email = ${email || ''}, college_name = ${collegeName || ''}, program = ${program || ''}, pin = ${pinToSet}
          WHERE roll_no = ${formattedRoll}
          RETURNING roll_no, name, email, college_name, program, target_threshold;
        `;
      } else {
        updated = await sql`
          UPDATE users
          SET name = ${name}, email = ${email || ''}, college_name = ${collegeName || ''}, program = ${program || ''}
          WHERE roll_no = ${formattedRoll}
          RETURNING roll_no, name, email, college_name, program, target_threshold;
        `;
      }
      return res.status(200).json({ success: true, user: updated[0] });
    }

    return res.status(400).json({ error: 'Invalid action parameter.' });
  } catch (error) {
    console.error('API Auth Error:', error);
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
