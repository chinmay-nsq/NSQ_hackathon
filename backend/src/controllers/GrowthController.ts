import { Response } from "express";
import { GrowthService } from "@/services/GrowthService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { RoleCheckedRequest } from "@/middleware/requireRole";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

export const GrowthController = {
  async me(req: AuthedRequest, res: Response) {
    const data = await GrowthService.getEmployeeGrowthWithInsight(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Growth fetched", data));
  },

  async team(req: AuthedRequest, res: Response) {
    const data = await GrowthService.getTeamGrowthWithInsight(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Team growth fetched", data));
  },

  async selfLeadership(req: RoleCheckedRequest, res: Response) {
    const isAdmin = req.employeeRole === "ADMIN";
    const data = await GrowthService.getManagerSelfGrowthWithInsight(req.employeeId!, isAdmin);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Leadership growth fetched", data));
  },
};
