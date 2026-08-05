import { Response } from "express";
import { GuildService } from "@/services/GuildService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

export const GuildController = {
  async list(_req: AuthedRequest, res: Response) {
    const guilds = await GuildService.listAll();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Guilds fetched", { guilds }));
  },

  async getById(req: AuthedRequest, res: Response) {
    const guild = await GuildService.getById(String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Guild fetched", { guild }));
  },

  async join(req: AuthedRequest, res: Response) {
    const employee = await GuildService.join(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Joined guild", { employee }));
  },
};
