import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: "7d"
  });

export const authService = {
  // Check if credentials are correct without issuing a token
  verifyCredentials: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    return isMatch ? user : null;
  },

  register: async (email, password, username) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepository.create(email, passwordHash, username);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username }
    };
  },

  login: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    // Note: We already verified credentials in verifyCredentials before sending OTP
    // but we do it again here as a final safety check before issuing token.
    if (!user) throw new AppError("User not found.", 404);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new AppError("Invalid credentials.", 401);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username }
    };
  },

  getCurrentUser: async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found.", 404);
    return user;
  },

  deleteUser: async (userId) => {
    await userRepository.deleteUser(userId);
  }
};
