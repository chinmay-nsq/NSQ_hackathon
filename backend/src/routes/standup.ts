import { Router } from "express";
import { StandupController } from "@/controllers/StandupController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(StandupController.get));

export default router;
