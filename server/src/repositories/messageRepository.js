import { pool } from "../config/db.js";

export const messageRepository = {
  save: async (senderId, recipientId, text) => {
    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, text) VALUES ($1, $2, $3)
         RETURNING id, sender_id AS "senderId", recipient_id AS "to", text, created_at AS "createdAt"`,
        [senderId, recipientId, text]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`[DATABASE-ERROR] Failed to save message: ${error.message}`);
      throw error;
    }
  },

  getConversation: async (userId1, userId2) => {
    const result = await pool.query(
      `SELECT id, sender_id AS "senderId", recipient_id AS "to", text, created_at AS "createdAt"
       FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [userId1, userId2]
    );
    return result.rows;
  }
};
