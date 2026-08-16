import { Router } from "express";
import { KingdomController } from "@/controllers/KingdomController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(KingdomController.overview));
router.post("/projects/:id/contribute", requireAuth, asyncHandler(KingdomController.contribute));

export default router;
