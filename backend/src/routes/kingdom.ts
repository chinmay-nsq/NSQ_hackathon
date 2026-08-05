import { Router } from "express";
import { KingdomController } from "@/controllers/KingdomController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(KingdomController.overview));
router.post("/projects/:id/contribute", requireAuth, asyncHandler(KingdomController.contribute));
router.get("/story/latest", requireAuth, asyncHandler(KingdomController.latestStory));
router.post("/story/generate", requireAuth, asyncHandler(KingdomController.generateStory));

export default router;
