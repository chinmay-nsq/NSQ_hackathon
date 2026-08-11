import { Router } from "express";
import { NotificationController } from "@/controllers/NotificationController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(NotificationController.list));
router.post("/read-all", requireAuth, asyncHandler(NotificationController.markAllRead));
router.post("/:id/read", requireAuth, asyncHandler(NotificationController.markRead));

export default router;
