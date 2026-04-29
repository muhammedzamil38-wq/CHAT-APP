import { pool } from "../config/db.js";

export const adminRepository = {
  isUserBanned: async (userId) => {
    const result = await pool.query(
      `SELECT id FROM banned_users WHERE user_id = $1`,
      [userId]
    );
    return result.rows.length > 0;
  },

  banUser: async (userId, bannedBy, reason) => {
    await pool.query(
      `INSERT INTO banned_users (user_id, banned_by, reason) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, bannedBy, reason]
    );
  },

  unbanUser: async (userId) => {
    await pool.query(
      `DELETE FROM banned_users WHERE user_id = $1`,
      [userId]
    );
  },

  getAllUsers: async () => {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.bio, u.avatar_url AS "avatarUrl", u.is_admin AS "isAdmin", u.created_at AS "createdAt",
        (SELECT id FROM banned_users WHERE user_id = u.id) IS NOT NULL AS "isBanned"
       FROM users u
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }
};
