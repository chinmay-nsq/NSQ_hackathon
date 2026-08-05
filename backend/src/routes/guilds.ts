import { Router } from "express";
import { GuildController } from "@/controllers/GuildController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(GuildController.list));
router.get("/:id", requireAuth, asyncHandler(GuildController.getById));
router.post("/:id/join", requireAuth, asyncHandler(GuildController.join));

export default router;
