import { pool } from "../config/db.js";

export const userRepository = {
  create: async (email, passwordHash, username) => {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3)
       RETURNING id, email, username, password_hash`,
      [email, passwordHash, username]
    );
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await pool.query(
      `SELECT id, email, username, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return result.rows[0] ?? null;
  },

  findById: async (id) => {
    const result = await pool.query(
      `SELECT id, email, username FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  findAll: async (excludeId) => {
    const result = await pool.query(
      `SELECT id, email, username FROM users WHERE id != $1`,
      [excludeId]
    );
    return result.rows;
  },

  searchUsers: async (query, excludeId) => {
    const result = await pool.query(
      `SELECT id, email, username FROM users 
       WHERE (email ILIKE $1 OR username ILIKE $1) AND id != $2`,
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
      `SELECT u.id, u.email, u.username,
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
  }
};
