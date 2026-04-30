import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { userRepository } from "../repositories/userRepository.js";

export const authenticate = async (req, _res, next) => {
  const token = req.cookies?.token;
  console.log(`[MISSION-CONTROL][AUTH] Signal check: ${!!token} | Origin: ${req.headers.origin}`);

  if (!token) {
    console.warn(`[MISSION-CONTROL][AUTH] Signal missing. Known cookies:`, Object.keys(req.cookies || {}));
    return next(new AppError("[MISSION-CONTROL] Access denied: authentication signal missing.", 401));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Check if the user has been banned
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      return next(new AppError("User not found.", 404));
    }
    if (user.isBanned) {
      return next(new AppError("Mission Access Denied: Operative has been permanently banned from the network.", 403));
    }

    req.user = { id: decoded.userId, role: user.role };
    next();
  } catch (err) {
    next(new AppError("[MISSION-CONTROL] Access denied: invalid mission token.", 401));
  }
};
