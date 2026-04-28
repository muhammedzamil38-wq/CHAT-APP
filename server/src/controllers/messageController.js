import { messageRepository } from "../repositories/messageRepository.js";

export const messageController = {
  getHistory: async (req, res) => {
    const { userId } = req.params;
    const myId = Number(req.user.id);
    const otherId = Number(userId);
    
    console.log(`[MISSION-CONTROL][HISTORY] Syncing logs between Crew #${myId} and Contact #${otherId}`);
    
    try {
      const messages = await messageRepository.getConversation(myId, otherId);
      console.log(`[MISSION-CONTROL][HISTORY] Successfully retrieved ${messages?.length || 0} mission logs.`);
      
      // Safety: Ensure we always return an array
      res.status(200).json({ 
        messages: messages || [],
        telemetry: { myId, otherId, count: messages?.length || 0 }
      });
    } catch (error) {
      console.error(`[MISSION-CONTROL][ERROR] History sync failed:`, error);
      throw error;
    }
  },

  updateMessage: async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    console.log(`[EDIT-DEBUG] Attempting to edit message ${id} by user ${req.user.id}`);
    const updated = await messageRepository.update(Number(id), req.user.id, text);
    if (!updated) {
      console.error(`[EDIT-ERROR] Message ${id} not found or user ${req.user.id} unauthorized`);
      throw new AppError("Message not found or unauthorized", 404);
    }
    console.log(`[EDIT-SUCCESS] Message ${id} updated.`);
    res.status(200).json({ message: updated });
  },

  deleteMessage: async (req, res) => {
    const { id } = req.params;
    const { mode } = req.query; // 'me' or 'everyone'
    
    console.log(`[DELETE-DEBUG] Attempting to delete message ${id} in mode: ${mode} by user ${req.user.id}`);
    
    if (mode === 'me') {
      await messageRepository.hideForUser(Number(id), req.user.id);
      return res.status(200).json({ message: "Message hidden for you", id: Number(id), mode: 'me' });
    }

    const deleted = await messageRepository.delete(Number(id), req.user.id);
    if (!deleted) {
      console.error(`[DELETE-ERROR] Message ${id} not found or user ${req.user.id} unauthorized for full purge`);
      throw new AppError("Message not found or unauthorized to delete for everyone", 404);
    }
    
    console.log(`[DELETE-SUCCESS] Message ${id} purged for everyone.`);
    res.status(200).json({ ...deleted, mode: 'everyone' });
  }
};
