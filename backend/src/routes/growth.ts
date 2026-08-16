import { Router } from "express";
import { Role } from "@prisma/client";
import { GrowthController } from "@/controllers/GrowthController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/me", requireAuth, asyncHandler(GrowthController.me));
router.get("/team", requireAuth, requireRole(Role.MANAGER, Role.ADMIN), asyncHandler(GrowthController.team));
router.get(
  "/leadership",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(GrowthController.selfLeadership)
);

export default router;
