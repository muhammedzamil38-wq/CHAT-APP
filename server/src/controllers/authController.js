import { authService } from "../services/authService.js";
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
  register: async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password) {
      throw new AppError("[MISSION-CONTROL] Registration blocked: incomplete payload.", 400);
    }

    const payload = await authService.register(email, password, username);
    res.cookie("token", payload.token, tokenCookieOptions);

    emitMissionEvent("user_login", { userId: payload.user.id, email: payload.user.email, mode: "register" });

    res.status(201).json({
      message: "[MISSION-CONTROL] Crew member registered successfully.",
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
    res.status(200).json({ user });
  },

  deleteAccount: async (req, res) => {
    await authService.deleteUser(req.user.id);
    res.clearCookie("token", tokenCookieOptions);
    res.status(200).json({ message: "[MISSION-CONTROL] Account purged from database." });
  }
};
