import { Router } from "express";
import { AdventureController } from "@/controllers/AdventureController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(AdventureController.list));
router.post("/solo/generate", requireAuth, asyncHandler(AdventureController.generateSolo));
router.post("/guild/generate", requireAuth, asyncHandler(AdventureController.generateGuild));
router.post("/:id/complete", requireAuth, asyncHandler(AdventureController.complete));

export default router;
