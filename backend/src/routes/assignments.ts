import { Router } from "express";
import { Role } from "@prisma/client";
import { AssignmentController } from "@/controllers/AssignmentController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(AssignmentController.list));
router.post("/solo/generate", requireAuth, asyncHandler(AssignmentController.generateSolo));
router.post("/solo/create", requireAuth, asyncHandler(AssignmentController.createManual));
router.post(
  "/solo/assign",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.assign)
);
router.post(
  "/solo/generate-for/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.generateForEmployee)
);
router.post("/team/generate", requireAuth, asyncHandler(AssignmentController.generateTeam));
router.post("/:id/complete", requireAuth, asyncHandler(AssignmentController.complete));

router.get(
  "/pending",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.listPending)
);
router.get(
  "/assigned-history",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.listAssignedHistory)
);
router.get("/my-history", requireAuth, asyncHandler(AssignmentController.myHistory));
router.post(
  "/:id/approve/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.approve)
);
router.post(
  "/:id/reject/:employeeId",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.reject)
);

router.get("/board", requireAuth, asyncHandler(AssignmentController.board));
router.get("/:id/detail", requireAuth, asyncHandler(AssignmentController.taskDetail));
router.post("/:id/comments", requireAuth, asyncHandler(AssignmentController.addComment));
// Dragging a card between Kanban columns. Any viewer of the board can move
// a card (the service re-checks visibility); it changes no rewards, so it
// does not need the manager gate that approve/reject do.
router.post("/:id/board-status", requireAuth, asyncHandler(AssignmentController.moveBoardStatus));
router.post(
  "/:id/sprint",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(AssignmentController.moveSprint)
);

export default router;
