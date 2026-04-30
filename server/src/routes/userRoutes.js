import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { adminOnly } from "../middlewares/adminMiddleware.js";

const router = Router();

router.get("/", authenticate, userController.getUsers);
router.get("/search", authenticate, userController.searchUsers);
router.post("/add", authenticate, userController.addFriend);
router.put("/profile", authenticate, userController.updateProfile);
router.get("/profile/:id", authenticate, userController.getProfile);

// Admin-only intelligence
router.get("/admin/all", authenticate, adminOnly, userController.getAllUsersAdmin);

export default router;
