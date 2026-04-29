import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logMission } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.googlemail.com', // Alternative Google endpoint often better for cloud IPs
  port: 465,
  secure: true,
  pool: true, // Keep connections open
  maxConnections: 5,
  auth: {
    user: env.emailUser,
    pass: env.emailPass,
  },
  connectionTimeout: 20000, // Increased to 20s for cloud latency
  socketTimeout: 20000,
});

export const emailService = {
  sendOTP: async (to, otp) => {
    try {
      const mailOptions = {
        from: '"Gossip Mission Control" <no-reply@gossip.com>',
        to,
        subject: 'Your Gossip Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Mission Authorization Required</h2>
            <p>Hello,</p>
            <p>You've initiated a registration for <strong>Gossip</strong>. To verify your identity and complete the uplink, please use the following One-Time Password (OTP):</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="text-align: center; color: #999; font-size: 10px;">Gossip Mission Control v1.0.4</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logMission(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[EMAIL-ERROR] Failed to send OTP: ${error.message}`);
      throw error;
    }
  },
};
