import { pool } from "../config/db.js";

export const groupRepository = {
  create: async (name, createdBy, memberIds = [], avatar_url = null) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const groupRes = await client.query(
        `INSERT INTO groups (name, created_by, avatar_url) VALUES ($1, $2, $3) RETURNING *`,
        [name, createdBy, avatar_url]
      );
      const group = groupRes.rows[0];

      // Add creator as admin
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [group.id, createdBy]
      );

      // Add other members
      for (const memberId of memberIds) {
        if (memberId === createdBy) continue;
        await client.query(
          `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`,
          [group.id, memberId]
        );
      }

      await client.query('COMMIT');
      return group;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  findById: async (id) => {
    const result = await pool.query(`SELECT * FROM groups WHERE id = $1`, [id]);
    return result.rows[0];
  },

  findUserGroups: async (userId) => {
    const result = await pool.query(
      `SELECT g.*, gm.role,
        (SELECT text FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
        (SELECT created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS "lastMessageAt"
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY "lastMessageAt" DESC NULLS LAST`,
      [userId]
    );
    return result.rows;
  },

  getMembers: async (groupId) => {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url AS "avatarUrl", gm.role, gm.joined_at AS "joinedAt"
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, u.username ASC`,
      [groupId]
    );
    return result.rows;
  },

  addMember: async (groupId, userId, role = 'member') => {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [groupId, userId, role]
    );
  },

  removeMember: async (groupId, userId) => {
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
  },

  updateGroup: async (groupId, { name, avatar_url, permissions }) => {
    const result = await pool.query(
      `UPDATE groups 
       SET name = COALESCE($1, name), 
           avatar_url = COALESCE($2, avatar_url),
           permissions = COALESCE($3, permissions)
       WHERE id = $4 
       RETURNING *`,
      [name, avatar_url, permissions, groupId]
    );
    return result.rows[0];
  },

  isMember: async (groupId, userId) => {
    const result = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    return result.rows.length > 0;
  },

  isAdmin: async (groupId, userId) => {
    const result = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
      [groupId, userId]
    );
    return result.rows.length > 0;
  }
};
