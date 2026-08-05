import { Router } from "express";
import { AuthController } from "@/controllers/AuthController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(AuthController.register));
router.post("/login", asyncHandler(AuthController.login));
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, asyncHandler(AuthController.me));

export default router;
