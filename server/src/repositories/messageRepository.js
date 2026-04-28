import { pool } from "../config/db.js";

export const messageRepository = {
  save: async (senderId, recipientId, text, fileUrl = null, fileType = null, fileName = null) => {
    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, text, file_url, file_type, file_name) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sender_id AS "senderId", recipient_id AS "to", text, file_url AS "fileUrl", file_type AS "fileType", file_name AS "fileName", created_at AS "createdAt", is_edited AS "isEdited", is_deleted AS "isDeleted"`,
        [senderId, recipientId, text, fileUrl, fileType, fileName]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`[DATABASE-ERROR] Failed to save message: ${error.message}`);
      throw error;
    }
  },

  getConversation: async (userId1, userId2) => {
    const result = await pool.query(
      `SELECT m.id, m.sender_id AS "senderId", m.recipient_id AS "to", m.text, m.file_url AS "fileUrl", m.file_type AS "fileType", m.file_name AS "fileName", m.created_at AS "createdAt", m.is_edited AS "isEdited", m.is_deleted AS "isDeleted"
       FROM messages m
       LEFT JOIN message_visibility mv ON mv.message_id = m.id AND mv.user_id = $1
       WHERE ((m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1))
          AND mv.id IS NULL
       ORDER BY m.created_at ASC`,
      [userId1, userId2]
    );
    return result.rows;
  },

  update: async (id, userId, text) => {
    const result = await pool.query(
      `UPDATE messages SET text = $1, is_edited = true 
       WHERE id = $2 AND sender_id = $3 AND (NOW() - created_at < interval '10 minutes') AND is_deleted = false
       RETURNING id, sender_id AS "senderId", recipient_id AS "to", text, file_url AS "fileUrl", file_type AS "fileType", file_name AS "fileName", created_at AS "createdAt", is_edited AS "isEdited", is_deleted AS "isDeleted"`,
      [text, id, userId]
    );
    return result.rows[0];
  },

  delete: async (id, userId) => {
    // We don't actually delete anymore, we mark it as deleted and wipe sensitive data
    const result = await pool.query(
      `UPDATE messages 
       SET text = '🚫 This message was deleted', file_url = NULL, file_type = NULL, file_name = NULL, is_deleted = true
       WHERE id = $1 AND sender_id = $2
       RETURNING id, sender_id AS "senderId", recipient_id AS "to", text, created_at AS "createdAt", is_deleted AS "isDeleted"`,
      [id, userId]
    );
    return result.rows[0];
  },

  hideForUser: async (id, userId) => {
    const result = await pool.query(
      `INSERT INTO message_visibility (message_id, user_id) VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING
       RETURNING id`,
      [id, userId]
    );
    return result.rows[0];
  }
};
