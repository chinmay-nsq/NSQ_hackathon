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
router.post(
  "/solo/generate-for/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.generateForEmployee)
);
router.post("/guild/generate", requireAuth, asyncHandler(AdventureController.generateGuild));
router.post("/:id/complete", requireAuth, asyncHandler(AdventureController.complete));

router.get(
  "/pending",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.listPending)
);
router.get(
  "/assigned-history",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.listAssignedHistory)
);
router.get("/my-history", requireAuth, asyncHandler(AdventureController.myHistory));
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

router.get("/board", requireAuth, asyncHandler(AdventureController.board));
router.get("/:id/detail", requireAuth, asyncHandler(AdventureController.taskDetail));
router.post("/:id/comments", requireAuth, asyncHandler(AdventureController.addComment));
// Dragging a card between Kanban columns. Any viewer of the board can move
// a card (the service re-checks visibility); it changes no rewards, so it
// does not need the manager gate that approve/reject do.
router.post("/:id/board-status", requireAuth, asyncHandler(AdventureController.moveBoardStatus));
router.post(
  "/:id/sprint",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AdventureController.moveSprint)
);

export default router;
