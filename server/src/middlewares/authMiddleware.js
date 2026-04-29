import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { authService } from "../services/authService.js";

export const authenticate = async (req, _res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError("[MISSION-CONTROL] Access denied: authentication signal missing.", 401));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await authService.getCurrentUser(decoded.userId);
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError("[MISSION-CONTROL] Access denied: invalid mission token.", 401));
  }
};
