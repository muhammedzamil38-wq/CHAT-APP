import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logMission } from "./utils/logger.js";
import { messageRepository } from "./repositories/messageRepository.js";
import { groupRepository } from "./repositories/groupRepository.js";
import { userRepository } from "./repositories/userRepository.js";

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
    socket.on("identify", async (userId) => {
      if (!userId) return;
      const uid = String(userId);
      socket.join(`user_${uid}`);
      
      // Join all group rooms the user belongs to
      const groups = await groupRepository.findUserGroups(Number(userId));
      groups.forEach(g => socket.join(`group_${g.id}`));

      if (!userSocketMap[uid]) {
        userSocketMap[uid] = new Set();
      }
      userSocketMap[uid].add(socket.id);
      
      // Broadcast to everyone
      io.emit("getOnlineUsers", getOnlineUserIds());
      logMission(`User ${uid} identified. Total online: ${getOnlineUserIds().length}`);
    });

    socket.on("private_message", async ({ to, text, senderId, fileUrl, fileType, fileName, replyToId, isForwarded }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(to);
        const savedMessage = await messageRepository.save(sId, rId, text, fileUrl, fileType, fileName, replyToId, isForwarded);
        
        io.to(`user_${to}`).emit("receive_message", savedMessage);
        io.to(`user_${senderId}`).emit("receive_message", savedMessage);
    } catch (error) {
      console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to save/emit message:", error.message);
    }
    });

    socket.on("group_message", async ({ groupId, text, senderId, fileUrl, fileType, fileName, replyToId, isForwarded }) => {
      try {
        const sId = Number(senderId);
        const gId = Number(groupId);
        const savedMessage = await messageRepository.save(sId, null, text, fileUrl, fileType, fileName, replyToId, isForwarded, gId);
        
        // Fetch sender details for the group broadcast
        const sender = await userRepository.findById(sId);
        savedMessage.senderName = sender.username || sender.email;
        savedMessage.senderAvatar = sender.avatarUrl;

        io.to(`group_${groupId}`).emit("receive_message", savedMessage);
      } catch (error) {
        console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to save/emit group message:", error.message);
      }
    });

    socket.on("group_update", (data) => {
      io.to(`group_${data.groupId}`).emit("group_update", data);
    });

    socket.on("message_edited", (message) => {
      const target = message.groupId ? `group_${message.groupId}` : `user_${message.to}`;
      io.to(target).emit("message_edited", message);
      if (!message.groupId) io.to(`user_${message.senderId}`).emit("message_edited", message);
    });

    socket.on("message_deleted", (updatedMessage) => {
      const target = updatedMessage.groupId ? `group_${updatedMessage.groupId}` : `user_${updatedMessage.to}`;
      io.to(target).emit("message_deleted", updatedMessage);
      if (!updatedMessage.groupId) io.to(`user_${updatedMessage.senderId}`).emit("message_deleted", updatedMessage);
    });

    // WebRTC Signaling
    socket.on("call_user", (data) => {
      logMission(`Call initiated by ${data.callerId} to ${data.userToCall}`);
      io.to(`user_${data.userToCall}`).emit("call_user", data);
    });

    socket.on("answer_call", (data) => {
      logMission(`Call answered by ${data.callerId} to ${data.to}`);
      io.to(`user_${data.to}`).emit("answer_call", data);
      socket.to(`user_${data.callerId}`).emit("call_handled_elsewhere");
    });

    socket.on("ice_candidate", (data) => {
      io.to(`user_${data.to}`).emit("ice_candidate", data);
    });

    socket.on("reject_call", (data) => {
      logMission(`Call rejected by ${data.callerId} to ${data.to}`);
      io.to(`user_${data.to}`).emit("reject_call", data);
      socket.to(`user_${data.callerId}`).emit("call_handled_elsewhere");
    });

    socket.on("end_call", (data) => {
      logMission(`Call ended by ${data.callerId} to ${data.to}`);
      io.to(`user_${data.to}`).emit("end_call", data);
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

export const emitMissionEvent = (event, payload) => {
  if (io) {
    io.emit(event, payload);
  }
};
