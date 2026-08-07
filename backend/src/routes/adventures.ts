import { Router } from "express";
import { Role } from "@prisma/client";
import { AdventureController } from "@/controllers/AdventureController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(AdventureController.list));
router.post("/solo/generate", requireAuth, asyncHandler(AdventureController.generateSolo));
router.post("/solo/create", requireAuth, asyncHandler(AdventureController.createManual));
router.post(
  "/solo/assign",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.assign)
);
router.post("/guild/generate", requireAuth, asyncHandler(AdventureController.generateGuild));
router.post("/:id/complete", requireAuth, asyncHandler(AdventureController.complete));

router.get(
  "/pending",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.listPending)
);
router.post(
  "/:id/approve/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.approve)
);
router.post(
  "/:id/reject/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.reject)
);

export default router;
