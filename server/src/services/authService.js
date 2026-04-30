import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: "7d"
  });

const ADMIN_EMAIL = "gossipchatadmin@gmail.com";

export const authService = {
  verifyCredentials: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    return isMatch ? user : null;
  },

  register: async (email, password, username) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    const user = await userRepository.create(email, passwordHash, username, role);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    };
  },

  login: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError("User not found.", 404);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new AppError("Invalid credentials.", 401);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
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
