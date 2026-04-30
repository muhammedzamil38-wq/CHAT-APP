import { env } from '../config/env.js';
import { logMission } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export const emailService = {
  sendOTP: async (to, otp) => {
    try {
      console.log(`[MISSION-CONTROL][EMAIL] Initiating Global HTTP dispatch via SendGrid API...`);
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.emailPass}`,
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: { 
            email: env.emailUser, // Must be your Verified Single Sender email
            name: 'Gossip Mission Control' 
          },
          subject: 'Your Gossip Verification Code',
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Mission Authorization Required</h2>
                <p>Hello,</p>
                <p>You've initiated a registration for <strong>Gossip</strong>. To verify your identity and complete the uplink, please use the following One-Time Password (OTP):</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="text-align: center; color: #999; font-size: 10px;">Gossip Mission Control v1.2.0</p>
              </div>
            `
          }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MISSION-CONTROL][EMAIL] SendGrid API Error Status: ${response.status}`);
        console.error(`[MISSION-CONTROL][EMAIL] SendGrid API Response:`, errorText);
        throw new Error(`SendGrid API failure: ${response.statusText}`);
      }

      logMission(`Email dispatched successfully to ${to} via SendGrid HTTP.`);
      return true;
    } catch (error) {
      console.error(`[EMAIL-ERROR] Global Dispatch Failure: ${error.message}`);
      throw new AppError(`Communication failure during identity verification: ${error.message}`, 500);
    }
  },
};
