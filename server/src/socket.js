import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logMission } from "./utils/logger.js";
import { messageRepository } from "./repositories/messageRepository.js";

let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
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
          callback(new Error(`Socket CORS Error: Origin ${origin} unauthorized.`));
        }
      },
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    logMission(`Socket uplink established: ${socket.id}`);

    // Join a room specific to the user ID
    socket.on("identify", (userId) => {
      socket.join(`user_${userId}`);
      logMission(`User ${userId} identified on socket ${socket.id}`);
    });

    socket.on("private_message", async ({ to, text, senderId }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(to);
        logMission(`Message from ${sId} to ${rId}: "${text.substring(0, 20)}..."`);
        const savedMessage = await messageRepository.save(sId, rId, text);
        logMission(`Message saved with ID: ${savedMessage.id}`);
      
      const message = {
        ...savedMessage,
        time: new Date(savedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Emit to the recipient
      io.to(`user_${to}`).emit("receive_message", message);
      // Also emit back to the sender (for multi-device sync or just confirmation)
      io.to(`user_${senderId}`).emit("receive_message", message);
    } catch (error) {
      console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to save/emit message:", error.message);
    }
    });

    socket.on("disconnect", () => {
      logMission(`Socket uplink closed: ${socket.id}`);
    });
  });

  return io;
};

export const getSocket = () => {
  if (!io) {
    throw new Error("[MISSION-CONTROL] Socket subsystem not initialized.");
  }
  return io;
};

export const emitMissionEvent = (event, payload) => {
  getSocket().emit(event, payload);
};
