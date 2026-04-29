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
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
};

export const authController = {
  // --- REGISTRATION FLOW ---
  requestRegister: async (req, res) => {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      throw new AppError("[MISSION-CONTROL] Registration blocked: incomplete payload.", 400);
    }
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("[MISSION-CONTROL] Identity collision: email already registered.", 400);
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await otpRepository.create(email, otp);
    await emailService.sendOTP(email, otp);
    res.status(200).json({ message: "Verification code dispatched.", email });
  },

  verifyRegister: async (req, res) => {
    const { email, otp, password, username } = req.body;
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
    if (!email || !password) throw new AppError("Email and password required.", 400);

    // Verify credentials first (without logging in)
    const user = await authService.verifyCredentials(email, password);
    if (!user) throw new AppError("Invalid credentials.", 401);

    // Generate and send OTP for 2FA
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await otpRepository.create(email, otp);
    await emailService.sendOTP(email, otp);

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
  }
};
