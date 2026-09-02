import { Router } from "express";
import { Role } from "@prisma/client";
import { MarketplaceController } from "@/controllers/MarketplaceController";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(MarketplaceController.list));
router.post("/:id/purchase", requireAuth, asyncHandler(MarketplaceController.purchase));
router.get("/purchases/me", requireAuth, asyncHandler(MarketplaceController.myPurchases));

router.get(
  "/claims/pending",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(MarketplaceController.pendingClaims)
);
router.get(
  "/claims/recent",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(MarketplaceController.recentDecisions)
);
router.post(
  "/claims/:id/approve",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(MarketplaceController.approveClaim)
);
router.post(
  "/claims/:id/reject",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  asyncHandler(MarketplaceController.rejectClaim)
);

export default router;
