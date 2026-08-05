import { Router } from "express";
import { CompanionController } from "@/controllers/CompanionController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/species", CompanionController.listSpecies);
router.post("/", requireAuth, asyncHandler(CompanionController.create));
router.get("/me", requireAuth, asyncHandler(CompanionController.me));
router.get("/dialogue", requireAuth, asyncHandler(CompanionController.dialogue));

export default router;
