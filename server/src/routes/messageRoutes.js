import { Router } from "express";
import { messageController } from "../controllers/messageController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/:userId", authenticate, messageController.getHistory);

export default router;
