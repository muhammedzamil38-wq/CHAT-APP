import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authenticate, userController.getUsers);
router.get("/search", authenticate, userController.searchUsers);
router.post("/add", authenticate, userController.addFriend);

export default router;
