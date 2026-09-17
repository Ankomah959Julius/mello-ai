import pool from '../config/database.js';

export async function findOrCreateUser(whatsappNumber = 'web-user-default', name = 'Web User') {
  // Check if user exists
  let result = await pool.query(
    'SELECT * FROM users WHERE whatsapp_number = $1',
    [whatsappNumber]
  );

  if (result.rows.length > 0) {
    // Update last_seen
    await pool.query(
      'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [result.rows[0].id]
    );
    return result.rows[0];
  }

  // Create new user
  result = await pool.query(
    'INSERT INTO users (whatsapp_number, name, last_seen) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
    [whatsappNumber, name]
  );

  return result.rows[0];
}

export async function getUserById(userId) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

export default {
  findOrCreateUser,
  getUserById,
};
