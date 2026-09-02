import { Response } from "express";
import { TaskActivityService } from "@/services/TaskActivityService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

export const StandupController = {
  async get(req: AuthedRequest, res: Response) {
    const people = await TaskActivityService.standupFor(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Standup fetched", { people }));
  },
};
