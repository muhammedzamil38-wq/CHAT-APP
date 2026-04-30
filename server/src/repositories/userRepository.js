import { pool } from "../config/db.js";

export const userRepository = {
  create: async (email, passwordHash, username, role = 'user') => {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned"`,
      [email, passwordHash, username, role]
    );
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned" FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return result.rows[0] ?? null;
  },

  findById: async (id) => {
    const result = await pool.query(
      `SELECT id, email, username, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned" FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  updateProfile: async (id, { username, bio, avatarUrl }) => {
    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username), 
           bio = COALESCE($2, bio), 
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, email, username, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned"`,
      [username, bio, avatarUrl, id]
    );
    return result.rows[0];
  },

  findAll: async (excludeId) => {
    const result = await pool.query(
      `SELECT id, email, username, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned" FROM users WHERE id != $1`,
      [excludeId]
    );
    return result.rows;
  },

  searchUsers: async (query, excludeId) => {
    const result = await pool.query(
      `SELECT id, email, username, bio, avatar_url AS "avatarUrl", role, is_banned AS "isBanned" FROM users 
       WHERE (email ILIKE $1 OR username ILIKE $1) AND id != $2 AND is_banned = false`,
      [`%${query}%`, excludeId]
    );
    return result.rows;
  },

  addFriend: async (userId, friendId) => {
    const result = await pool.query(
      `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING *`,
      [userId, friendId]
    );
    return result.rows[0];
  },

  findFriends: async (userId) => {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.bio, u.avatar_url AS "avatarUrl", u.role, u.is_banned AS "isBanned",
        (SELECT text FROM messages 
         WHERE (sender_id = u.id AND recipient_id = $1) 
            OR (sender_id = $1 AND recipient_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
        (SELECT created_at FROM messages 
         WHERE (sender_id = u.id AND recipient_id = $1) 
            OR (sender_id = $1 AND recipient_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS "lastMessageAt"
       FROM users u
       JOIN friends f ON (f.friend_id = u.id AND f.user_id = $1)
          OR (f.user_id = u.id AND f.friend_id = $1)
       WHERE u.id != $1
       ORDER BY "lastMessageAt" DESC NULLS LAST`,
      [userId]
    );
    return result.rows;
  },

  deleteUser: async (id) => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  },

  promoteToAdmin: async (email) => {
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
  },

  setBanStatus: async (id, isBanned) => {
    const result = await pool.query(
      `UPDATE users SET is_banned = $1 WHERE id = $2 AND role != 'admin' RETURNING id, is_banned AS "isBanned"`,
      [isBanned, id]
    );
    return result.rows[0];
  },

  createReport: async (reporterId, reportedId, reason) => {
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3) RETURNING id`,
      [reporterId, reportedId, reason]
    );
    return result.rows[0];
  },

  getAllReports: async () => {
    const result = await pool.query(
      `SELECT r.id, r.reason, r.created_at AS "createdAt", 
              rep.email AS "reporterEmail", rep.username AS "reporterUsername", 
              sus.id AS "reportedId", sus.email AS "reportedEmail", sus.username AS "reportedUsername", sus.is_banned AS "isBanned"
       FROM reports r
       JOIN users rep ON r.reporter_id = rep.id
       JOIN users sus ON r.reported_id = sus.id
       ORDER BY r.created_at DESC`
    );
    return result.rows;
  }
};
