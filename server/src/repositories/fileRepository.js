import { pool } from "../config/db.js";

export const fileRepository = {
  createMediaAsset: async (userId, publicId, secureUrl, originalName) => {
    const result = await pool.query(
      `INSERT INTO media_assets (user_id, public_id, secure_url, original_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, public_id, secure_url, original_name`,
      [userId, publicId, secureUrl, originalName]
    );

    return result.rows[0];
  }
};
