import { pool } from "../config/db.js";

export const adminRepository = {
  getAllUsers: async () => {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.is_admin AS "isAdmin", u.created_at AS "createdAt",
              b.id IS NOT NULL AS "isBanned", b.reason AS "banReason"
       FROM users u
       LEFT JOIN banned_users b ON b.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  },

  banUser: async (userId, bannedBy, reason = "Violation of mission protocols") => {
    const result = await pool.query(
      `INSERT INTO banned_users (user_id, banned_by, reason) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET reason = $3
       RETURNING *`,
      [userId, bannedBy, reason]
    );
    return result.rows[0];
  },

  unbanUser: async (userId) => {
    await pool.query(`DELETE FROM banned_users WHERE user_id = $1`, [userId]);
  },

  isBanned: async (userId) => {
    const result = await pool.query(
      `SELECT id FROM banned_users WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rowCount > 0;
  }
};
