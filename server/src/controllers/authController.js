import jwt from "jsonwebtoken";
import { authService } from "../services/authService.js";
import { emailService } from "../services/emailService.js";
import { otpRepository } from "../repositories/otpRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";
import { emitMissionEvent } from "../socket.js";
import { env } from "../config/env.js";

const isProduction = env.nodeEnv === "production" || process.env.NODE_ENV === "production";

const tokenCookieOptions = {
  httpOnly: true,
  secure: true, // Always true for modern browsers to handle cross-site cookies
  sameSite: "none", // Required for cross-domain cookies (Vercel -> Render)
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
};

export const authController = {
  // --- REGISTRATION FLOW ---
  requestRegister: async (req, res) => {
    const { email, password, username } = req.body;
    console.log(`[MISSION-CONTROL][AUTH] Registration request for: ${email}`);
    
    if (!email || !password || !username) {
      throw new AppError("[MISSION-CONTROL] Registration blocked: incomplete payload.", 400);
    }
    
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("[MISSION-CONTROL] Identity collision: email already registered.", 400);
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[MISSION-CONTROL][AUTH] OTP generated, attempting email dispatch...`);
    
    await otpRepository.create(email, otp);
    await emailService.sendOTP(email, otp);
    
    console.log(`[MISSION-CONTROL][AUTH] Registration phase 1 complete.`);
    res.status(200).json({ message: "Verification code dispatched.", email });
  },

  verifyRegister: async (req, res) => {
    const { email, otp, password, username } = req.body;
    console.log(`[MISSION-CONTROL][AUTH] Verifying registration for: ${email}`);
    
    const isValid = await otpRepository.verify(email, otp);
    if (!isValid) throw new AppError("Invalid or expired OTP.", 401);
    
    const payload = await authService.register(email, password, username);
    res.cookie("token", payload.token, tokenCookieOptions);
    emitMissionEvent("user_login", { userId: payload.user.id, email: payload.user.email, mode: "register" });
    res.status(201).json({ message: "Account verified and registered.", user: payload.user });
  },

  // --- LOGIN FLOW (WITH 2FA) ---
  requestLogin: async (req, res) => {
    const { email, password } = req.body;
    console.log(`[MISSION-CONTROL][AUTH] Login request for: ${email}`);
    
    if (!email || !password) throw new AppError("Email and password required.", 400);

    const user = await authService.verifyCredentials(email, password);
    if (!user) throw new AppError("Invalid credentials.", 401);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[MISSION-CONTROL][AUTH] Credentials verified. Sending 2FA code...`);
    
    await otpRepository.create(email, otp);
    await emailService.sendOTP(email, otp);

    console.log(`[MISSION-CONTROL][AUTH] 2FA phase 1 complete.`);
    res.status(200).json({ message: "2FA code sent to your email.", email });
  },

  verifyLogin: async (req, res) => {
    const { email, password, otp } = req.body;
    if (!email || !otp || !password) throw new AppError("Missing credentials or code.", 400);

    const isValid = await otpRepository.verify(email, otp);
    if (!isValid) throw new AppError("Invalid or expired code.", 401);

    // Everything is valid, perform full login
    const payload = await authService.login(email, password);
    res.cookie("token", payload.token, tokenCookieOptions);
    emitMissionEvent("user_login", { userId: payload.user.id, email: payload.user.email, mode: "login" });

    res.status(200).json({ message: "Uplink established.", user: payload.user });
  },

  logout: async (_req, res) => {
    res.clearCookie("token", tokenCookieOptions);
    res.status(200).json({ message: "Session terminated." });
  },

  me: async (req, res) => {
    if (!req.user) throw new AppError("Not authenticated.", 401);
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ user });
  },

  deleteAccount: async (req, res) => {
    await authService.deleteUser(req.user.id);
    res.clearCookie("token", tokenCookieOptions);
    res.status(200).json({ message: "Account purged." });
  },

  // --- GOOGLE OAUTH ---
  googleAuth: (req, res, next) => {
    import('passport').then(passport => {
      passport.default.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });
  },

  googleCallback: (req, res, next) => {
    import('passport').then(passport => {
      passport.default.authenticate('google', { session: false }, async (err, user) => {
        if (err || !user) {
          console.error('[MISSION-CONTROL][AUTH] Google callback failure:', err);
          return res.redirect(`${env.clientOrigin}/login?error=auth_failed`);
        }

        try {
          // Generate JWT for the Google user
          const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: '7d' });
          
          // Set cookie
          res.cookie("token", token, tokenCookieOptions);
          
          emitMissionEvent("user_login", { userId: user.id, email: user.email, mode: "google" });

          // Redirect to frontend dashboard
          res.redirect(`${env.clientOrigin}/dashboard`);
        } catch (error) {
          console.error('[MISSION-CONTROL][AUTH] Token generation failed:', error);
          res.redirect(`${env.clientOrigin}/login?error=token_error`);
        }
      })(req, res, next);
    });
  }
};
