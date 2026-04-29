import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const app = express();
app.set('trust proxy', 1); // Trust Render's proxy for secure cookies

// Security: Prevent caching of sensitive API data
app.use("/api", (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vary', 'Cookie');
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        env.clientOrigin, 
        "http://localhost:5173", 
        "http://127.0.0.1:5173"
      ];
      
      const isAllowed = !origin || 
        env.nodeEnv === "development" || 
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") || 
        origin.endsWith(".onrender.com");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS Error: Origin ${origin} not in mission parameters.`));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "[MISSION-CONTROL] All systems nominal." });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);

if (env.nodeEnv === "production") {
  const clientBuildPath = path.resolve("client/dist");
  console.log(`[PRODUCTION-DEBUG] Production mode active. Serving static files from: ${clientBuildPath}`);
  
  if (!fs.existsSync(clientBuildPath)) {
    console.error(`[PRODUCTION-ERROR] Static build folder NOT FOUND at ${clientBuildPath}. Did you run 'npm run build'?`);
  }

  app.use(express.static(clientBuildPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

app.use(errorHandler);
