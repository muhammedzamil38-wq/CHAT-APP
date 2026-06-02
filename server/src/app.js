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
import groupRoutes from "./routes/groupRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";
import passport from "passport";
import { configurePassport } from "./config/passportConfig.js";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const app = express();
configurePassport();
app.use(passport.initialize());
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
app.use("/api/groups", groupRoutes);
app.use("/api/files", fileRoutes);

if (env.nodeEnv === "production") {
  // Detect client/dist across multiple possible deployment layouts:
  // 1. CWD = monorepo root  -> client/dist
  // 2. CWD = server dir     -> ../client/dist
  // 3. Render absolute path -> /opt/render/project/src/client/dist
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const candidatePaths = [
    path.resolve("client/dist"),
    path.resolve("../client/dist"),
    path.join(__dirname, "../../client/dist"),   // server/src -> server -> root -> client/dist
    path.join(__dirname, "../../../client/dist"), // deeper nesting fallback
    "/opt/render/project/src/client/dist",
  ];

  const clientBuildPath = candidatePaths.find(p => fs.existsSync(p)) || null;

  if (clientBuildPath) {
    console.log(`[PRODUCTION] Static assets found. Serving from: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  } else {
    console.warn(`[PRODUCTION] API-ONLY MODE: No static assets found. Searched:\n  ${candidatePaths.join("\n  ")}`);
    app.get("/", (_req, res) => {
      res.status(200).json({ 
        message: "[MISSION-CONTROL] GOSSIP API Online.", 
        status: "nominal",
        mode: "api-only"
      });
    });
  }
}

app.use(errorHandler);
