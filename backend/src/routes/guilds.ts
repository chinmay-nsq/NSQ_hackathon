import { Router } from "express";
import { Role } from "@prisma/client";
import { GuildController } from "@/controllers/GuildController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(GuildController.list));
router.post("/", requireAuth, requireRole(Role.MANAGER, Role.ADMIN), asyncHandler(GuildController.create));
router.get(
  "/managed",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(GuildController.listManaged)
);
router.get("/:id", requireAuth, asyncHandler(GuildController.getById));
router.post("/:id/join", requireAuth, asyncHandler(GuildController.join));

export default router;
