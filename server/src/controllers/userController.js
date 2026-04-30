import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/errors.js";

export const userController = {
  getUsers: async (req, res) => {
    if (!req.user) {
      throw new AppError("[MISSION-CONTROL] Authentication context not available.", 401);
    }
    const users = await userRepository.findFriends(req.user.id);
    res.status(200).json({ users });
  },

  searchUsers: async (req, res) => {
    const { q } = req.query;
    const users = await userRepository.searchUsers(q, req.user.id);
    res.status(200).json({ users });
  },

  addFriend: async (req, res) => {
    const { friendId } = req.body;
    await userRepository.addFriend(req.user.id, friendId);
    res.status(200).json({ message: "Crew member added to your roster." });
  },

  updateProfile: async (req, res) => {
    const { username, bio, avatarUrl } = req.body;
    const user = await userRepository.updateProfile(req.user.id, { username, bio, avatarUrl });
    res.status(200).json({ user, message: "Mission identity updated." });
  },

  getProfile: async (req, res) => {
    const { id } = req.params;
    const user = await userRepository.findById(Number(id));
    if (!user) throw new AppError("Crew member not found.", 404);
    res.status(200).json({ user });
  },

  getAllUsersAdmin: async (req, res) => {
    const users = await userRepository.findAll(req.user.id);
    res.status(200).json({ users });
  },

  banUser: async (req, res) => {
    const { id } = req.params;
    const { isBanned } = req.body;
    
    // Admin cannot ban another admin
    const targetUser = await userRepository.findById(Number(id));
    if (!targetUser) throw new AppError("User not found.", 404);
    if (targetUser.role === 'admin') throw new AppError("Cannot ban an administrator.", 403);

    const updatedUser = await userRepository.setBanStatus(Number(id), isBanned);

    // If the user is being banned, forcefully log them out in real-time
    if (isBanned) {
      import('../socket.js').then(({ getSocket }) => {
        try {
          const io = getSocket();
          io.to(`user_${id}`).emit("force_logout", {
            message: "Mission Access Denied: Operative has been permanently banned from the network."
          });
        } catch (error) {
          console.error("Socket error during ban:", error);
        }
      });
    }

    res.status(200).json({ user: updatedUser, message: `User ${isBanned ? 'banned' : 'unbanned'} successfully.` });
  },

  reportUser: async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      throw new AppError("Reason for reporting is required.", 400);
    }

    const reporter = await userRepository.findById(req.user.id);
    const reported = await userRepository.findById(Number(id));
    
    if (!reported) throw new AppError("User not found.", 404);

    // Save report to database
    await userRepository.createReport(req.user.id, Number(id), reason.trim());

    // Notify all clients. Only admins will actually display this notification on the frontend.
    import('../socket.js').then(({ emitMissionEvent }) => {
      emitMissionEvent("admin_notification", {
        type: "report",
        title: "Rogue Operative Reported",
        message: `${reporter.username || reporter.email} reported ${reported.username || reported.email}. Reason: ${reason.trim()}`,
        reportedId: id
      });
    });

    res.status(200).json({ message: "Report filed successfully. Admin notified." });
  },

  getReportsAdmin: async (req, res) => {
    const reports = await userRepository.getAllReports();
    res.status(200).json({ reports });
  }
};
