import { Response } from "express";
import { MarketplaceService } from "@/services/MarketplaceService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

export const MarketplaceController = {
  async list(_req: AuthedRequest, res: Response) {
    const items = await MarketplaceService.listItems();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Items fetched", { items }));
  },

  async purchase(req: AuthedRequest, res: Response) {
    const employee = await MarketplaceService.purchase(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Purchase complete", { employee }));
  },

  async myPurchases(req: AuthedRequest, res: Response) {
    const purchases = await MarketplaceService.myPurchases(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Purchases fetched", { purchases }));
  },
};
