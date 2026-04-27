import { Router } from "express";
import { fileController } from "../controllers/fileController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/upload.js";

const router = Router();

router.post("/process", authenticate, upload.single("file"), fileController.process);

export default router;
