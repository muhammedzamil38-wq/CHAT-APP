import { AppError } from "../utils/errors.js";
import { userRepository } from "../repositories/userRepository.js";

export const adminOnly = async (req, _res, next) => {
  if (!req.user) {
    throw new AppError("Authentication required.", 401);
  }

  const user = await userRepository.findById(req.user.id);
  if (!user || user.role !== 'admin') {
    throw new AppError("[MISSION-CONTROL] Access denied: Administrative clearance required.", 403);
  }

  next();
};
