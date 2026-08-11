import { Router } from "express";
import { Role } from "@prisma/client";
import { EmployeeController } from "@/controllers/EmployeeController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/overview", requireAuth, requireRole(Role.ADMIN), asyncHandler(EmployeeController.overview));
router.get("/", requireAuth, requireRole(Role.ADMIN), asyncHandler(EmployeeController.list));
router.post("/:id/role", requireAuth, requireRole(Role.ADMIN), asyncHandler(EmployeeController.setRole));
router.post("/me/profile", requireAuth, asyncHandler(EmployeeController.completeProfile));
router.post("/me/suggest-profile", requireAuth, asyncHandler(EmployeeController.suggestProfile));
router.get("/me/guild-welcome", requireAuth, asyncHandler(EmployeeController.guildWelcome));

export default router;
