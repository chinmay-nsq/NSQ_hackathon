import { Router } from "express";
import { CompanionController } from "@/controllers/CompanionController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/species", CompanionController.listSpecies);
router.get("/check-name", requireAuth, asyncHandler(CompanionController.checkName));
router.post("/", requireAuth, asyncHandler(CompanionController.create));
router.get("/me", requireAuth, asyncHandler(CompanionController.me));
router.get("/dialogue", requireAuth, asyncHandler(CompanionController.dialogue));
router.get("/chat", requireAuth, asyncHandler(CompanionController.chatHistory));
router.post("/chat", requireAuth, asyncHandler(CompanionController.sendMessage));

export default router;
