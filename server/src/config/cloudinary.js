import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

console.log(`[CLOUDINARY-DEBUG] Configured with Cloud: ${env.cloudinaryCloudName}, Key: ${env.cloudinaryApiKey?.substring(0, 4)}***, Secret: ${env.cloudinaryApiSecret?.substring(0, 4)}***`);

export { cloudinary };
