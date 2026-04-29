import { env } from '../config/env.js';
import { logMission } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export const emailService = {
  sendOTP: async (to, otp) => {
    try {
      console.log(`[MISSION-CONTROL][EMAIL] Initiating HTTP dispatch via Resend API...`);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.emailPass}`,
        },
        body: JSON.stringify({
          from: 'Gossip <onboarding@resend.dev>',
          to: [to],
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
              <p style="text-align: center; color: #999; font-size: 10px;">Gossip Mission Control v1.1.0</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[MISSION-CONTROL][EMAIL] Resend API Error:`, errorData);
        throw new Error(errorData.message || 'Resend API failure');
      }

      const result = await response.json();
      logMission(`Email dispatched successfully via HTTP. ID: ${result.id}`);
      return result;
    } catch (error) {
      console.error(`[EMAIL-ERROR] HTTP Dispatch Failure: ${error.message}`);
      throw new AppError(`Communication failure during identity verification: ${error.message}`, 500);
    }
  },
};
