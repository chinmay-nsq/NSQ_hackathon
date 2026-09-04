import { Request, Response } from "express";
import { z } from "zod";
import { TeamService } from "@/services/TeamService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { RoleCheckedRequest } from "@/middleware/requireRole";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const createTeamSchema = z.object({
  name: z.string().min(3).max(80),
  department: z.string().min(2).max(80),
  managerId: z.string().optional(),
});

export const TeamController = {
  async list(req: AuthedRequest, res: Response) {
    const teams = await TeamService.listAll(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Teams fetched", { teams }));
  },

  async getById(req: AuthedRequest, res: Response) {
    const team = await TeamService.getById(String(req.params.id), req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Team fetched", { team }));
  },

  async create(req: RoleCheckedRequest, res: Response) {
    const parsed = createTeamSchema.parse(req.body ?? {});
    const team = await TeamService.create(req.employeeId!, req.employeeRole as "MANAGER" | "ADMIN", parsed);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Team created", { team }));
  },

  async listManaged(req: AuthedRequest, res: Response) {
    const teams = await TeamService.listManagedBy(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Managed teams fetched", { teams }));
  },

  /** Public (no auth) — resolves an invite code so the signup page can preview which team you're joining. */
  async previewInvite(req: Request, res: Response) {
    const team = await TeamService.getByInviteCode(String(req.params.code));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Invite fetched", { team }));
  },

  /** The current team's shareable invite code — manager (own team) or admin only. */
  async getInvite(req: AuthedRequest, res: Response) {
    const inviteCode = await TeamService.getInviteCode(String(req.params.id), req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Invite code fetched", { inviteCode }));
  },
};
