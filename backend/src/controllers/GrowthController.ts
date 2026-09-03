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

  async teamMembers(req: AuthedRequest, res: Response) {
    const members = await GrowthService.getTeamMemberBreakdown(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Team member growth fetched", { members }));
  },

  async teamMemberWeekDetail(req: AuthedRequest, res: Response) {
    const weekStart = typeof req.query.weekStart === "string" ? req.query.weekStart : undefined;
    const detail = await GrowthService.getEmployeeWeekDetail(req.employeeId!, String(req.params.employeeId), weekStart);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Week detail fetched", detail));
  },
};
