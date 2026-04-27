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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin in development, or specific origins in production
      if (env.nodeEnv === "development" || !origin || [env.clientOrigin, "http://192.168.8.47:5173", "http://localhost:5173"].includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation."));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
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
  app.use(express.static(clientBuildPath));
  
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    }
  });
}

app.use(errorHandler);
