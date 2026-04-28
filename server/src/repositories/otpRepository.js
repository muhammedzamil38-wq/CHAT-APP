import { pool } from "../config/db.js";

export const otpRepository = {
  create: async (email, otp) => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await pool.query(
      "DELETE FROM verification_otps WHERE email = $1",
      [email]
    );
    await pool.query(
      "INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)",
      [email, otp, expiresAt]
    );
  },

  verify: async (email, otp) => {
    const result = await pool.query(
      "SELECT * FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()",
      [email, otp]
    );
    if (result.rows.length > 0) {
      await pool.query("DELETE FROM verification_otps WHERE email = $1", [email]);
      return true;
    }
    return false;
  }
};
