import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { transporter } from "../config/mailer.js";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: "7d"
  });

export const authService = {
  register: async (email, password, username) => {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("[MISSION-CONTROL] Registration halted: email already in orbit.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepository.create(email, passwordHash, username);

    try {
      await transporter.sendMail({
        from: env.emailUser,
        to: user.email,
        subject: "GOSSIP Mission Control: Account Initialized",
        text: "Astronaut, your communication node is now active."
      });
    } catch (error) {
      console.error("[MISSION-CONTROL][ALERT] Welcome email failed to send:", error.message);
    }

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email }
    };
  },

  login: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("[MISSION-CONTROL] Login denied: unknown crew member.", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError("[MISSION-CONTROL] Login denied: invalid credential vector.", 401);
    }

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email }
    };
  },

  getCurrentUser: async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("[MISSION-CONTROL] User profile missing from telemetry.", 404);
    }

    return user;
  },

  deleteUser: async (userId) => {
    await userRepository.deleteUser(userId);
  }
};
