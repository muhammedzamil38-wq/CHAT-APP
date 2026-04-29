import { adminRepository } from "../repositories/adminRepository.js";
import { AppError } from "../utils/errors.js";

export const adminController = {
  getUsers: async (req, res) => {
    const users = await adminRepository.getAllUsers();
    res.status(200).json({ users });
  },

  banUser: async (req, res) => {
    const { userId, reason } = req.body;
    if (Number(userId) === Number(req.user.id)) {
      throw new AppError("You cannot ban yourself.", 400);
    }
    await adminRepository.banUser(userId, req.user.id, reason);
    res.status(200).json({ message: `User #${userId} has been restricted.` });
  },

  unbanUser: async (req, res) => {
    const { userId } = req.body;
    await adminRepository.unbanUser(userId);
    res.status(200).json({ message: `User #${userId} restrictions lifted.` });
  }
};
