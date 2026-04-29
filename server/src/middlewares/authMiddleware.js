import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export const authenticate = (req, _res, next) => {
  const token = req.cookies?.token;
  console.log(`[MISSION-CONTROL][AUTH] Signal check: ${!!token} | Origin: ${req.headers.origin}`);

  if (!token) {
    console.warn(`[MISSION-CONTROL][AUTH] Signal missing. Known cookies:`, Object.keys(req.cookies || {}));
    return next(new AppError("[MISSION-CONTROL] Access denied: authentication signal missing.", 401));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    next(new AppError("[MISSION-CONTROL] Access denied: invalid mission token.", 401));
  }
};
