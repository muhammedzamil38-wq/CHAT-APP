import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

// Registration flow
router.post("/register-request", authController.requestRegister);
router.post("/register-verify", authController.verifyRegister);

// Login flow (2FA)
router.post("/login-request", authController.requestLogin);
router.post("/login-verify", authController.verifyLogin);

// Session management
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.delete("/delete-account", authenticate, authController.deleteAccount);

export default router;
