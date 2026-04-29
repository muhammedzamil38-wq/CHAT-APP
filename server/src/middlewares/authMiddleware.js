import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { adminRepository } from "../repositories/adminRepository.js";

export const authenticate = async (req, _res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError("[MISSION-CONTROL] Access denied: authentication signal missing.", 401));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Check if user is banned
    const isBanned = await adminRepository.isUserBanned(decoded.userId);
    if (isBanned) {
      return next(new AppError("[SECURITY-NOTICE] Your uplink has been terminated due to a mission violation (Banned).", 403));
    }

    req.user = { 
      id: decoded.userId,
      isAdmin: decoded.isAdmin || false 
    };
    next();
  } catch (err) {
    next(new AppError("[MISSION-CONTROL] Access denied: invalid mission token.", 401));
  }
};
