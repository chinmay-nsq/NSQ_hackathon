import { Router } from "express";
import { MarketplaceController } from "@/controllers/MarketplaceController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(MarketplaceController.list));
router.post("/:id/purchase", requireAuth, asyncHandler(MarketplaceController.purchase));
router.get("/purchases/me", requireAuth, asyncHandler(MarketplaceController.myPurchases));

export default router;
