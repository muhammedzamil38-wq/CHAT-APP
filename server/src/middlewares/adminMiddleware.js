import { AppError } from "../utils/errors.js";

export const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    throw new AppError("[MISSION-CONTROL] Access denied. Command-level authorization required.", 403);
  }
  next();
};
