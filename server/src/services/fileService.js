import fs from "fs/promises";
import { cloudinary } from "../config/cloudinary.js";
import { fileRepository } from "../repositories/fileRepository.js";
import { emitMissionEvent } from "../socket.js";

export const fileService = {
  processUpload: async (userId, file) => {
    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "gossip/media",
        resource_type: "auto"
      });

      const media = await fileRepository.createMediaAsset(
        userId,
        uploadResult.public_id,
        uploadResult.secure_url,
        file.originalname
      );

      await fs.unlink(file.path);

      emitMissionEvent("file_processed", {
        mediaId: media.id,
        userId,
        secureUrl: media.secure_url,
        originalName: media.original_name
      });

      return media;
    } catch (error) {
      console.error('[FILE-SERVICE-ERROR]', error);
      // Clean up local file even if upload fails
      try { await fs.unlink(file.path); } catch (e) {}
      throw error;
    }
  }
};
