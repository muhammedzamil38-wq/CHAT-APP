import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logMission } from "./utils/logger.js";
import { messageRepository } from "./repositories/messageRepository.js";
import { groupRepository } from "./repositories/groupRepository.js";
import { userRepository } from "./repositories/userRepository.js";

let io;
const userSocketMap = {}; // {userId: Set(socketIds)}
const activeGroupCalls = {}; // { [groupId]: { isVideo, hostId, hostInfo, participants: { [userId]: { socketId, username, avatarUrl, email } } } }

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

      const wasOffline = !userSocketMap[uid] || userSocketMap[uid].size === 0;

      if (!userSocketMap[uid]) {
        userSocketMap[uid] = new Set();
      }
      userSocketMap[uid].add(socket.id);
      
      // Broadcast to everyone
      io.emit("getOnlineUsers", getOnlineUserIds());
      logMission(`User ${uid} identified. Total online: ${getOnlineUserIds().length}`);

      if (wasOffline) {
        try {
          const deliveredMessages = await messageRepository.markAsDelivered(Number(userId));
          if (deliveredMessages.length > 0) {
            const senderMap = {};
            deliveredMessages.forEach(m => {
              if (!senderMap[m.senderId]) {
                senderMap[m.senderId] = [];
              }
              senderMap[m.senderId].push(m.id);
            });

            for (const [senderId, messageIds] of Object.entries(senderMap)) {
              io.to(`user_${senderId}`).emit("messages_delivered", {
                recipientId: Number(userId),
                messageIds
              });
            }
          }
        } catch (err) {
          console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to update delivery status:", err.message);
        }
      }
    });

    socket.on("private_message", async ({ to, text, senderId, fileUrl, fileType, fileName, replyToId, isForwarded }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(to);
        const isRecipientOnline = userSocketMap[String(to)] && userSocketMap[String(to)].size > 0;
        
        const savedMessage = await messageRepository.save(sId, rId, text, fileUrl, fileType, fileName, replyToId, isForwarded, null, isRecipientOnline);
        
        io.to(`user_${to}`).emit("receive_message", savedMessage);
        io.to(`user_${senderId}`).emit("receive_message", savedMessage);
      } catch (error) {
        console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to save/emit message:", error.message);
      }
    });

    socket.on("mark_read", async ({ senderId, recipientId }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(recipientId);
        
        const readMessages = await messageRepository.markAsRead(sId, rId);
        if (readMessages.length > 0) {
          const messageIds = readMessages.map(m => m.id);
          io.to(`user_${sId}`).emit("messages_read", {
            senderId: sId,
            recipientId: rId,
            messageIds
          });
          io.to(`user_${rId}`).emit("messages_read", {
            senderId: sId,
            recipientId: rId,
            messageIds
          });
        }
      } catch (error) {
        console.error("[MISSION-CONTROL][SOCKET-ERROR] Failed to mark messages as read:", error.message);
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

    // Group WebRTC Signaling
    socket.on("group_call_initiate", ({ groupId, callerInfo, isVideo }) => {
      logMission(`Group call initiated in group_${groupId} by ${callerInfo.id}`);
      
      if (!activeGroupCalls[groupId]) {
        activeGroupCalls[groupId] = {
          groupId,
          isVideo,
          hostId: callerInfo.id,
          hostInfo: callerInfo,
          participants: {
            [callerInfo.id]: {
              socketId: socket.id,
              userId: callerInfo.id,
              username: callerInfo.username,
              avatarUrl: callerInfo.avatarUrl,
              email: callerInfo.email
            }
          }
        };
      } else {
        activeGroupCalls[groupId].participants[callerInfo.id] = {
          socketId: socket.id,
          userId: callerInfo.id,
          username: callerInfo.username,
          avatarUrl: callerInfo.avatarUrl,
          email: callerInfo.email
        };
      }

      socket.to(`group_${groupId}`).emit("group_call_incoming", {
        groupId,
        hostId: callerInfo.id,
        hostInfo: callerInfo,
        isVideo
      });

      io.to(`group_${groupId}`).emit("group_call_status_update", {
        groupId,
        isActive: true,
        isVideo
      });
    });

    socket.on("group_call_check_active", ({ groupId }) => {
      const call = activeGroupCalls[groupId];
      socket.emit("group_call_active_status", {
        groupId,
        isActive: !!call,
        isVideo: call ? call.isVideo : false,
        hostInfo: call ? call.hostInfo : null
      });
    });

    socket.on("group_call_join", ({ groupId, userInfo }) => {
      logMission(`User ${userInfo.id} joining group call in group_${groupId}`);
      let call = activeGroupCalls[groupId];
      if (!call) {
        activeGroupCalls[groupId] = {
          groupId,
          isVideo: true,
          hostId: userInfo.id,
          hostInfo: userInfo,
          participants: {}
        };
        call = activeGroupCalls[groupId];
      }
      
      const newParticipant = {
        socketId: socket.id,
        userId: userInfo.id,
        username: userInfo.username,
        avatarUrl: userInfo.avatarUrl,
        email: userInfo.email
      };

      call.participants[userInfo.id] = newParticipant;

      const otherParticipants = Object.values(call.participants).filter(
        p => String(p.userId) !== String(userInfo.id)
      );

      socket.emit("group_call_joined", {
        groupId,
        participants: otherParticipants,
        isVideo: call.isVideo
      });

      otherParticipants.forEach(p => {
        io.to(p.socketId).emit("group_call_user_joined", {
          groupId,
          user: newParticipant
        });
      });

      io.to(`group_${groupId}`).emit("group_call_status_update", {
        groupId,
        isActive: true,
        isVideo: call.isVideo
      });
    });

    socket.on("group_call_signal", ({ groupId, toSocketId, signal, fromUserId }) => {
      io.to(toSocketId).emit("group_webrtc_signal", {
        groupId,
        fromUserId,
        fromSocketId: socket.id,
        signal
      });
    });

    socket.on("group_call_leave", ({ groupId, userId }) => {
      logMission(`User ${userId} leaving group call in group_${groupId}`);
      const call = activeGroupCalls[groupId];
      if (call) {
        delete call.participants[userId];
        
        const remaining = Object.values(call.participants);
        remaining.forEach(p => {
          io.to(p.socketId).emit("group_call_user_left", {
            groupId,
            userId
          });
        });

        if (remaining.length === 0) {
          delete activeGroupCalls[groupId];
          io.to(`group_${groupId}`).emit("group_call_status_update", {
            groupId,
            isActive: false
          });
          io.to(`group_${groupId}`).emit("group_call_ended", { groupId });
        }
      }
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
      
      // Clean up any active group calls the disconnected socket was in
      for (const [groupId, call] of Object.entries(activeGroupCalls)) {
        for (const [userId, participant] of Object.entries(call.participants)) {
          if (participant.socketId === socket.id) {
            delete call.participants[userId];
            logMission(`Auto-removed user ${userId} from group_${groupId} call on socket disconnect`);
            
            const remaining = Object.values(call.participants);
            remaining.forEach(p => {
              io.to(p.socketId).emit("group_call_user_left", {
                groupId,
                userId: Number(userId)
              });
            });

            if (remaining.length === 0) {
              delete activeGroupCalls[groupId];
              io.to(`group_${groupId}`).emit("group_call_status_update", {
                groupId,
                isActive: false
              });
              io.to(`group_${groupId}`).emit("group_call_ended", { groupId });
            }
            break;
          }
        }
      }

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
