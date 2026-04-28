import { authService } from "../services/authService.js";
import { emailService } from "../services/emailService.js";
import { otpRepository } from "../repositories/otpRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";
import { emitMissionEvent } from "../socket.js";
import { env } from "../config/env.js";

const tokenCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
};

export const authController = {
  // Step 1: Request Registration - Sends OTP
  requestRegister: async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      throw new AppError("[MISSION-CONTROL] Registration blocked: incomplete payload.", 400);
    }

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("[MISSION-CONTROL] Identity collision: email already registered.", 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP temporarily
    await otpRepository.create(email, otp);

    // Send Email
    await emailService.sendOTP(email, otp);

    res.status(200).json({
      message: "[MISSION-CONTROL] Verification code dispatched to your email.",
      email
    });
  },

  // Step 2: Verify OTP and finalize registration
  verifyRegister: async (req, res) => {
    const { email, otp, password, username } = req.body;

    if (!email || !otp || !password || !username) {
      throw new AppError("[MISSION-CONTROL] Verification blocked: incomplete payload.", 400);
    }

    const isValid = await otpRepository.verify(email, otp);
    if (!isValid) {
      throw new AppError("[MISSION-CONTROL] Authorization denied: invalid or expired OTP.", 401);
    }

    // OTP is valid, now create the user
    const payload = await authService.register(email, password, username);
    res.cookie("token", payload.token, tokenCookieOptions);

    emitMissionEvent("user_login", { userId: payload.user.id, email: payload.user.email, mode: "register" });

    res.status(201).json({
      message: "[MISSION-CONTROL] Crew member verified and registered successfully.",
      user: payload.user
    });
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("[MISSION-CONTROL] Login blocked: incomplete payload.", 400);
    }

    const payload = await authService.login(email, password);
    res.cookie("token", payload.token, tokenCookieOptions);

    emitMissionEvent("user_login", { userId: payload.user.id, email: payload.user.email, mode: "login" });

    res.status(200).json({
      message: "[MISSION-CONTROL] Crew member authenticated.",
      user: payload.user
    });
  },

  logout: async (_req, res) => {
    res.clearCookie("token", tokenCookieOptions);
    res.status(200).json({ message: "[MISSION-CONTROL] Session terminated cleanly." });
  },

  me: async (req, res) => {
    if (!req.user) {
      throw new AppError("[MISSION-CONTROL] Authentication context not available.", 401);
    }

    const user = await authService.getCurrentUser(req.user.id);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ user });
  },

  deleteAccount: async (req, res) => {
    await authService.deleteUser(req.user.id);
    res.clearCookie("token", tokenCookieOptions);
    res.status(200).json({ message: "[MISSION-CONTROL] Account purged from database." });
  }
};
