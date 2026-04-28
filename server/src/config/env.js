import dotenv from "dotenv";

dotenv.config();

const requiredKeys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

for (const key of requiredKeys) {
  if (key === "CLOUDINARY_API_KEY") {
    if (!process.env.CLOUDINARY_API_KEY && !process.env.CLOUDINY_API_KEY) {
      throw new Error(`[MISSION-CONTROL] Configuration anomaly detected: missing ${key}.`);
    }
    continue;
  }
  if (!process.env[key]) {
    throw new Error(`[MISSION-CONTROL] Configuration anomaly detected: missing ${key}.`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
};
