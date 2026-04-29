import { adminRepository } from "../repositories/adminRepository.js";

export const adminController = {
  getUsers: async (req, res) => {
    const users = await adminRepository.getAllUsers();
    res.status(200).json({ users });
  },

  banUser: async (req, res) => {
    const { userId, reason } = req.body;
    const ban = await adminRepository.banUser(userId, req.user.id, reason);
    res.status(200).json({ message: "Crew member has been restricted from the network.", ban });
  },

  unbanUser: async (req, res) => {
    const { userId } = req.body;
    await adminRepository.unbanUser(userId);
    res.status(200).json({ message: "Crew member's uplink has been restored." });
  }
};
