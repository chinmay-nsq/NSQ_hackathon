import { Router } from "express";
import { StandupController } from "@/controllers/StandupController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/rooms", requireAuth, asyncHandler(StandupController.rooms));
router.get("/messages", requireAuth, asyncHandler(StandupController.messages));
router.post("/messages", requireAuth, asyncHandler(StandupController.post));

export default router;
