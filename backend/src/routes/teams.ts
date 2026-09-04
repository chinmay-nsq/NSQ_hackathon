import { Router } from "express";
import { Role } from "@prisma/client";
import { TeamController } from "@/controllers/TeamController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(TeamController.list));
router.post("/", requireAuth, requireRole(Role.MANAGER, Role.ADMIN), asyncHandler(TeamController.create));
router.get(
  "/managed",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(TeamController.listManaged)
);
router.get("/invite/:code", asyncHandler(TeamController.previewInvite));
router.get("/:id", requireAuth, asyncHandler(TeamController.getById));
router.get(
  "/:id/invite",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(TeamController.getInvite)
);

export default router;
