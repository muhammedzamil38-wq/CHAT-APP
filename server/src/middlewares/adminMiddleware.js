import { AppError } from "../utils/errors.js";

export const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    throw new AppError("[SECURITY-BREACH] Administrative privileges required.", 403);
  }
  next();
};
