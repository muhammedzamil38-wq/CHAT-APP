import { Router } from "express";
import { adminController } from "../controllers/adminController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

router.use(authenticate, adminMiddleware);

router.get("/users", adminController.getUsers);
router.post("/ban", adminController.banUser);
router.post("/unban", adminController.unbanUser);

export default router;
