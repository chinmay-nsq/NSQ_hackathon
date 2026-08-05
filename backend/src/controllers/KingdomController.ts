import { Response } from "express";
import { z } from "zod";
import { KingdomService } from "@/services/KingdomService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { RESOURCE_TYPES } from "@/config/constants";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const contributeSchema = z.object({
  resourceType: z.enum(RESOURCE_TYPES),
  amount: z.number().int().positive(),
});

export const KingdomController = {
  async overview(_req: AuthedRequest, res: Response) {
    const data = await KingdomService.getOverview();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Kingdom fetched", data));
  },

  async contribute(req: AuthedRequest, res: Response) {
    const parsed = contributeSchema.parse(req.body);

    const result = await KingdomService.contribute(
      req.employeeId!,
      String(req.params.id),
      parsed.resourceType,
      parsed.amount
    );
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Contribution recorded", result));
  },

  async latestStory(_req: AuthedRequest, res: Response) {
    const story = await KingdomService.getLatestStory();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Story fetched", { story }));
  },

  async generateStory(_req: AuthedRequest, res: Response) {
    const story = await KingdomService.generateWeeklyStory();
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Story generated", { story }));
  },
};
