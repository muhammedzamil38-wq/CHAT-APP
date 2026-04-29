import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { AppError } from "../utils/errors.js";

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: "7d"
  });

export const authService = {
  verifyCredentials: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    // Check if banned
    const banned = await adminRepository.isBanned(user.id);
    if (banned) {
      throw new AppError("Your access to the network has been restricted by Command Control.", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    return isMatch ? user : null;
  },

  register: async (email, password, username) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepository.create(email, passwordHash, username);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin, bio: user.bio, avatarUrl: user.avatarUrl }
    };
  },

  login: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError("User not found.", 404);

    const banned = await adminRepository.isBanned(user.id);
    if (banned) throw new AppError("Your access to the network has been restricted by Command Control.", 403);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new AppError("Invalid credentials.", 401);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin, bio: user.bio, avatarUrl: user.avatarUrl }
    };
  },

  getCurrentUser: async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found.", 404);
    
    const banned = await adminRepository.isBanned(user.id);
    if (banned) throw new AppError("Your session has been terminated. Reason: Account Restriction.", 403);

    return user;
  },

  deleteUser: async (userId) => {
    await userRepository.deleteUser(userId);
  }
};
