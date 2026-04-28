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
  }
};
