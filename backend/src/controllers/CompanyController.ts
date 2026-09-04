import { Response } from "express";
import { z } from "zod";
import { CompanyService } from "@/services/CompanyService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { RESOURCE_TYPES } from "@/config/constants";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const contributeSchema = z.object({
  resourceType: z.enum(RESOURCE_TYPES),
  amount: z.number().int().positive(),
});

export const CompanyController = {
  async overview(_req: AuthedRequest, res: Response) {
    const data = await CompanyService.getOverview();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Company fetched", data));
  },

  async contribute(req: AuthedRequest, res: Response) {
    const parsed = contributeSchema.parse(req.body);

    const result = await CompanyService.contribute(
      req.employeeId!,
      String(req.params.id),
      parsed.resourceType,
      parsed.amount
    );
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Contribution recorded", result));
  },
};
