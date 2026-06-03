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
    console.log(`[MISSION-CONTROL][DB-DEBUG] verifyCredentials: password type is ${typeof password}, user.password_hash type is ${user ? typeof user.password_hash : 'no-user'}`);
    console.log(`[MISSION-CONTROL][DB-DEBUG] verifyCredentials: user data:`, JSON.stringify(user));
    
    if (!user) return null;

    if (user.isBanned) {
      throw new AppError("Mission Access Denied: Operative has been permanently banned from the network.", 403);
    }

    if (!user.password_hash) {
      console.log(`[MISSION-CONTROL][DB-DEBUG] verifyCredentials: user has no password_hash (registered via OAuth)`);
      throw new AppError("This account was registered using Google. Please log in with Google.", 400);
    }

    const isMatch = await bcrypt.compare(String(password), String(user.password_hash));
    return isMatch ? user : null;
  },

  register: async (email, password, username) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    
    let user = await userRepository.findByEmail(email);
    if (user) {
      user = await userRepository.updatePasswordHash(user.id, passwordHash);
    } else {
      user = await userRepository.create(email, passwordHash, username, role);
    }

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio }
    };
  },

  login: async (email, password) => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError("User not found.", 404);

    if (user.isBanned) {
      throw new AppError("Mission Access Denied: Operative has been permanently banned from the network.", 403);
    }

    if (!user.password_hash) {
      throw new AppError("This account was registered using Google. Please log in with Google.", 400);
    }

    const isMatch = await bcrypt.compare(String(password), String(user.password_hash));
    if (!isMatch) throw new AppError("Invalid credentials.", 401);

    return {
      token: signToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio }
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
