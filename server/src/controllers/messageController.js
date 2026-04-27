import { messageRepository } from "../repositories/messageRepository.js";

export const messageController = {
  getHistory: async (req, res) => {
    const { userId } = req.params;
    const history = await messageRepository.getConversation(Number(req.user.id), Number(userId));
    
    const formattedHistory = history.map(m => ({
      ...m,
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.status(200).json({ history: formattedHistory });
  }
};
