import { pool } from "../config/db.js";

export const messageRepository = {
  save: async (senderId, recipientId, text, fileUrl = null, fileType = null, fileName = null, replyToId = null, isForwarded = false, groupId = null, isDelivered = false) => {
    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, text, file_url, file_type, file_name, reply_to_id, is_forwarded, group_id, is_delivered) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, sender_id AS "senderId", recipient_id AS "to", group_id AS "groupId", text, file_url AS "fileUrl", file_type AS "fileType", file_name AS "fileName", reply_to_id AS "replyToId", is_forwarded AS "isForwarded", created_at AS "createdAt", is_edited AS "isEdited", is_deleted AS "isDeleted", is_delivered AS "isDelivered", is_read AS "isRead"`,
        [senderId, recipientId, text, fileUrl, fileType, fileName, replyToId, isForwarded, groupId, isDelivered]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`[DATABASE-ERROR] Failed to save message: ${error.message}`);
      throw error;
    }
  },

  getGroupConversation: async (groupId, userId) => {
    const result = await pool.query(
      `SELECT m.id, m.sender_id AS "senderId", m.recipient_id AS "to", m.group_id AS "groupId", m.text, m.file_url AS "fileUrl", m.file_type AS "fileType", m.file_name AS "fileName", 
              m.reply_to_id AS "replyToId", m.is_forwarded AS "isForwarded", m.created_at AS "createdAt", m.is_edited AS "isEdited", m.is_deleted AS "isDeleted",
              m.is_delivered AS "isDelivered", m.is_read AS "isRead",
              rm.text AS "replyToText", rm.sender_id AS "replyToSenderId",
              u.username AS "senderName", u.avatar_url AS "senderAvatar",
              (mv.id IS NOT NULL) AS "isLocallyDeleted"
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN message_visibility mv ON mv.message_id = m.id AND mv.user_id = $2
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       WHERE m.group_id = $1
       ORDER BY m.created_at ASC`,
      [groupId, userId]
    );
    return result.rows;
  },

  getConversation: async (userId1, userId2) => {
    const result = await pool.query(
      `SELECT m.id, m.sender_id AS "senderId", m.recipient_id AS "to", m.text, m.file_url AS "fileUrl", m.file_type AS "fileType", m.file_name AS "fileName", 
              m.reply_to_id AS "replyToId", m.is_forwarded AS "isForwarded", m.created_at AS "createdAt", m.is_edited AS "isEdited", m.is_deleted AS "isDeleted",
              m.is_delivered AS "isDelivered", m.is_read AS "isRead",
              rm.text AS "replyToText", rm.sender_id AS "replyToSenderId",
              (mv.id IS NOT NULL) AS "isLocallyDeleted"
       FROM messages m
       LEFT JOIN message_visibility mv ON mv.message_id = m.id AND mv.user_id = $1
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       WHERE ((m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1))
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
  },

  markAsDelivered: async (recipientId) => {
    try {
      const result = await pool.query(
        `UPDATE messages 
         SET is_delivered = true 
         WHERE recipient_id = $1 AND is_delivered = false
         RETURNING id, sender_id AS "senderId"`,
        [recipientId]
      );
      return result.rows;
    } catch (error) {
      console.error(`[DATABASE-ERROR] Failed to mark messages as delivered: ${error.message}`);
      throw error;
    }
  },

  markAsRead: async (senderId, recipientId) => {
    try {
      const result = await pool.query(
        `UPDATE messages 
         SET is_read = true, is_delivered = true
         WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false
         RETURNING id`,
        [senderId, recipientId]
      );
      return result.rows;
    } catch (error) {
      console.error(`[DATABASE-ERROR] Failed to mark messages as read: ${error.message}`);
      throw error;
    }
  }
};
