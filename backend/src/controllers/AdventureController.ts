import { Response } from "express";
import { z } from "zod";
import { AdventureService } from "@/services/AdventureService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const completeSchema = z.object({
  submission: z.string().max(2000).optional(),
});

export const AdventureController = {
  async list(req: AuthedRequest, res: Response) {
    const adventures = await AdventureService.listForEmployee(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Adventures fetched", { adventures }));
  },

  async generateSolo(req: AuthedRequest, res: Response) {
    const adventure = await AdventureService.generateSolo(req.employeeId!);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Solo adventure ready", { adventure }));
  },

  async generateGuild(req: AuthedRequest, res: Response) {
    const adventure = await AdventureService.generateGuild(req.employeeId!);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Guild adventure ready", { adventure }));
  },

  async complete(req: AuthedRequest, res: Response) {
    const parsed = completeSchema.parse(req.body ?? {});

    const adventureId = String(req.params.id);
    const employee = await AdventureService.complete(req.employeeId!, adventureId, parsed.submission);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Adventure completed", { employee }));
  },
};
