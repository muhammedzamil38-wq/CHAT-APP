import { Router } from "express";
import { groupController } from "../controllers/groupController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", authenticate, groupController.createGroup);
router.get("/", authenticate, groupController.getUserGroups);
router.get("/:id", authenticate, groupController.getGroupDetails);
router.put("/:id", authenticate, groupController.updateGroup);
router.post("/:id/members", authenticate, groupController.addMember);
router.delete("/:id/members/:userId", authenticate, groupController.removeMember);

export default router;
