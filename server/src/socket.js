import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logMission } from "./utils/logger.js";
import { messageRepository } from "./repositories/messageRepository.js";

let io;
const userSocketMap = {}; // {userId: Set(socketIds)}

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
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const getOnlineUserIds = () => Object.keys(userSocketMap);

  io.on("connection", (socket) => {
    logMission(`Socket uplink established: ${socket.id}`);

    // Join a room specific to the user ID and track online status
    socket.on("identify", (userId) => {
      if (!userId) return;
      const uid = String(userId);
      socket.join(`user_${uid}`);
      
      if (!userSocketMap[uid]) {
        userSocketMap[uid] = new Set();
      }
      userSocketMap[uid].add(socket.id);
      
      // Broadcast to everyone
      io.emit("getOnlineUsers", getOnlineUserIds());
      logMission(`User ${uid} identified. Total online: ${getOnlineUserIds().length}`);
    });

    socket.on("private_message", async ({ to, text, senderId, fileUrl, fileType, fileName }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(to);
        const savedMessage = await messageRepository.save(sId, rId, text, fileUrl, fileType, fileName);
        io.to(`user_${to}`).emit("receive_message", savedMessage);
        io.to(`user_${senderId}`).emit("receive_message", savedMessage);
    } catch (error) {
      console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to save/emit message:", error.message);
    }
    });

    socket.on("message_edited", (message) => {
      io.to(`user_${message.to}`).emit("message_edited", message);
      io.to(`user_${message.senderId}`).emit("message_edited", message);
    });

    socket.on("message_deleted", (updatedMessage) => {
      io.to(`user_${updatedMessage.to}`).emit("message_deleted", updatedMessage);
      io.to(`user_${updatedMessage.senderId}`).emit("message_deleted", updatedMessage);
    });

    socket.on("disconnect", () => {
      logMission(`Socket uplink closed: ${socket.id}`);
      
      for (const [uid, sockets] of Object.entries(userSocketMap)) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            delete userSocketMap[uid];
          }
          break;
        }
      }
      io.emit("getOnlineUsers", getOnlineUserIds());
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
