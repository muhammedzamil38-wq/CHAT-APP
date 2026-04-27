import { fileService } from "../services/fileService.js";
import { AppError } from "../utils/errors.js";

export const fileController = {
  process: async (req, res) => {
    if (!req.user) {
      throw new AppError("[MISSION-CONTROL] Unauthorized upload vector.", 401);
    }

    if (!req.file) {
      throw new AppError("[MISSION-CONTROL] No file payload received.", 400);
    }

    const media = await fileService.processUpload(req.user.id, req.file);

    res.status(201).json({
      message: "[MISSION-CONTROL] File processed and cataloged.",
      media
    });
  }
};
