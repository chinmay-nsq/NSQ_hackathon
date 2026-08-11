import { Router } from "express";
import { TradingController } from "@/controllers/TradingController";
import { requireAuth } from "@/middleware/requireAuth";
import { asyncHandler } from "@/middleware/asyncHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(TradingController.list));
router.get("/mine", requireAuth, asyncHandler(TradingController.myListings));
router.post("/", requireAuth, asyncHandler(TradingController.create));
router.post("/:id/cancel", requireAuth, asyncHandler(TradingController.cancel));
router.post("/:id/buy", requireAuth, asyncHandler(TradingController.buy));

export default router;
