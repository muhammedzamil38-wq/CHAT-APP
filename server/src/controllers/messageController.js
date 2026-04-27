import { messageRepository } from "../repositories/messageRepository.js";

export const messageController = {
  getHistory: async (req, res) => {
    const { userId } = req.params;
    const myId = Number(req.user.id);
    const otherId = Number(userId);
    
    const history = await messageRepository.getConversation(myId, otherId);
    console.log(`[HISTORY-DEBUG] Fetching history between ${myId} and ${otherId}. Found ${history.length} messages.`);
    
    res.status(200).json({ history });
  }
};
