import { Router } from "express";
import { Role } from "@prisma/client";
import { SprintController } from "@/controllers/SprintController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(SprintController.list));
router.post("/", requireAuth, requireRole(Role.MANAGER, Role.ADMIN), asyncHandler(SprintController.create));

export default router;
