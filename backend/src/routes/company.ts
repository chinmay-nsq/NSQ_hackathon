import { Router } from "express";
import { CompanyController } from "@/controllers/CompanyController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(CompanyController.overview));
router.post("/projects/:id/contribute", requireAuth, asyncHandler(CompanyController.contribute));

export default router;
