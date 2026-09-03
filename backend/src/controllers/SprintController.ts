import { Response } from "express";
import { z } from "zod";
import { SprintService } from "@/services/SprintService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const createSprintSchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(2).max(60),
  startDate: z.string(),
  endDate: z.string(),
});

export const SprintController = {
  async list(req: AuthedRequest, res: Response) {
    const sprints = await SprintService.listForViewer(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Sprints fetched", { sprints }));
  },

  async create(req: AuthedRequest, res: Response) {
    const parsed = createSprintSchema.parse(req.body ?? {});
    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(HttpStatus.BAD_REQUEST).json(new ApiResponse(HttpStatus.BAD_REQUEST, "Invalid dates", null));
    }
    const sprint = await SprintService.create(req.employeeId!, parsed.guildId, parsed.name, startDate, endDate);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Sprint created", { sprint }));
  },
};
