import { AppError } from "../utils/errors.js";
import { logMissionError } from "../utils/logger.js";

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    logMissionError(`Controlled failure: ${err.message}`);
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  logMissionError("Unhandled reactor exception.", err);
  res.status(500).json({ 
    message: "[MISSION-CONTROL] Internal system turbulence detected.",
    details: err.message 
  });
};
