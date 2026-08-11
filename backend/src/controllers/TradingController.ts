import { Response } from "express";
import { z } from "zod";
import { TradingService } from "@/services/TradingService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const createListingSchema = z.object({
  purchaseId: z.string().min(1),
  askingPrice: z.number().int().min(1),
});

export const TradingController = {
  async list(req: AuthedRequest, res: Response) {
    const listings = await TradingService.listActiveListings(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Listings fetched", { listings }));
  },

  async myListings(req: AuthedRequest, res: Response) {
    const listings = await TradingService.myListings(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Your listings fetched", { listings }));
  },

  async create(req: AuthedRequest, res: Response) {
    const parsed = createListingSchema.parse(req.body ?? {});
    const listing = await TradingService.createListing(req.employeeId!, parsed.purchaseId, parsed.askingPrice);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Listing created", { listing }));
  },

  async cancel(req: AuthedRequest, res: Response) {
    const listing = await TradingService.cancelListing(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Listing cancelled", { listing }));
  },

  async buy(req: AuthedRequest, res: Response) {
    const employee = await TradingService.buyListing(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Purchase complete", { employee }));
  },
};
