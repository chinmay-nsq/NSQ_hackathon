import { Request, Response } from "express";
import { z } from "zod";
import { GuildService } from "@/services/GuildService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { RoleCheckedRequest } from "@/middleware/requireRole";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const createGuildSchema = z.object({
  name: z.string().min(3).max(80),
  department: z.string().min(2).max(80),
  managerId: z.string().optional(),
});

export const GuildController = {
  async list(_req: AuthedRequest, res: Response) {
    const guilds = await GuildService.listAll();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Guilds fetched", { guilds }));
  },

  async getById(req: AuthedRequest, res: Response) {
    const guild = await GuildService.getById(String(req.params.id), req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Guild fetched", { guild }));
  },

  async join(req: AuthedRequest, res: Response) {
    const employee = await GuildService.join(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Joined guild", { employee }));
  },

  async create(req: RoleCheckedRequest, res: Response) {
    const parsed = createGuildSchema.parse(req.body ?? {});
    const guild = await GuildService.create(req.employeeId!, req.employeeRole as "MANAGER" | "ADMIN", parsed);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Guild created", { guild }));
  },

  async listManaged(req: AuthedRequest, res: Response) {
    const guilds = await GuildService.listManagedBy(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Managed guilds fetched", { guilds }));
  },

  /** Public (no auth) — resolves an invite code so the signup page can preview which team you're joining. */
  async previewInvite(req: Request, res: Response) {
    const guild = await GuildService.getByInviteCode(String(req.params.code));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Invite fetched", { guild }));
  },

  /** The current guild's shareable invite code — manager (own guild) or admin only. */
  async getInvite(req: AuthedRequest, res: Response) {
    const inviteCode = await GuildService.getInviteCode(String(req.params.id), req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Invite code fetched", { inviteCode }));
  },
};
