import { groupRepository } from "../repositories/groupRepository.js";
import { messageRepository } from "../repositories/messageRepository.js";
import { AppError } from "../utils/errors.js";

export const groupController = {
  createGroup: async (req, res) => {
    const { name, memberIds, avatarUrl } = req.body;
    if (!name) throw new AppError("Group name is required.", 400);
    
    const group = await groupRepository.create(name, req.user.id, memberIds, avatarUrl);
    res.status(201).json({ group, message: "Group established." });
  },

  getUserGroups: async (req, res) => {
    const groups = await groupRepository.findUserGroups(req.user.id);
    res.status(200).json({ groups });
  },

  getGroupDetails: async (req, res) => {
    const { id } = req.params;
    const isMember = await groupRepository.isMember(Number(id), req.user.id);
    if (!isMember) throw new AppError("Unauthorized access to group telemetry.", 403);
    
    const group = await groupRepository.findById(Number(id));
    const members = await groupRepository.getMembers(Number(id));
    res.status(200).json({ group, members });
  },

  updateGroup: async (req, res) => {
    const { id } = req.params;
    const { name, avatarUrl, permissions } = req.body;
    
    const isAdmin = await groupRepository.isAdmin(Number(id), req.user.id);
    const group = await groupRepository.findById(Number(id));
    
    if (!isAdmin && !group.permissions.allow_member_edit) {
      throw new AppError("Only commanders can modify group parameters.", 403);
    }

    const updated = await groupRepository.updateGroup(Number(id), { name, avatarUrl, permissions });
    res.status(200).json({ group: updated, message: "Group settings updated." });
  },

  addMember: async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    const isAdmin = await groupRepository.isAdmin(Number(id), req.user.id);
    if (!isAdmin) throw new AppError("Only commanders can add new operatives.", 403);

    await groupRepository.addMember(Number(id), userId);
    res.status(200).json({ message: "Operative added to the group." });
  },

  removeMember: async (req, res) => {
    const { id, userId } = req.params;
    
    const isAdmin = await groupRepository.isAdmin(Number(id), req.user.id);
    const isSelf = Number(userId) === req.user.id;
    
    if (!isAdmin && !isSelf) {
      throw new AppError("Unauthorized removal attempt.", 403);
    }

    await groupRepository.removeMember(Number(id), Number(userId));
    res.status(200).json({ message: isSelf ? "You have left the group." : "Operative removed." });
  }
};
