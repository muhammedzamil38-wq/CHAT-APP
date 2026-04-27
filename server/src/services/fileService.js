import fs from "fs/promises";
import { cloudinary } from "../config/cloudinary.js";
import { fileRepository } from "../repositories/fileRepository.js";
import { emitMissionEvent } from "../socket.js";

export const fileService = {
  processUpload: async (userId, file) => {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: "gossip/media"
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
  }
};
