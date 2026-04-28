import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register-request", authController.requestRegister);
router.post("/register-verify", authController.verifyRegister);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.delete("/delete-account", authenticate, authController.deleteAccount);

export default router;
