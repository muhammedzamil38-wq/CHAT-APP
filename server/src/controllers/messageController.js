import { messageRepository } from "../repositories/messageRepository.js";

export const messageController = {
  getHistory: async (req, res) => {
    const { userId } = req.params;
    const myId = Number(req.user.id);
    const otherId = Number(userId);
    
    const history = await messageRepository.getConversation(myId, otherId);
    console.log(`[HISTORY-DEBUG] Fetching history between ${myId} and ${otherId}. Found ${history.length} messages.`);
    
    res.status(200).json({ history });
  },

  updateMessage: async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const updated = await messageRepository.update(Number(id), req.user.id, text);
    if (!updated) throw new AppError("Message not found or unauthorized", 404);
    res.status(200).json({ message: updated });
  },

  deleteMessage: async (req, res) => {
    const { id } = req.params;
    const deleted = await messageRepository.delete(Number(id), req.user.id);
    if (!deleted) throw new AppError("Message not found or unauthorized", 404);
    res.status(200).json({ message: "Message purged", id: deleted.id, to: deleted.to, senderId: deleted.senderId });
  }
};
