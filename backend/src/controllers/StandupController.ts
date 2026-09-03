import { Response } from "express";
import { z } from "zod";
import { StandupService, MAX_MESSAGE_LENGTH } from "@/services/StandupService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const postSchema = z.object({
  guildId: z.string().min(1),
  body: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const StandupController = {
  async rooms(req: AuthedRequest, res: Response) {
    const rooms = await StandupService.roomsFor(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Rooms fetched", { rooms }));
  },

  async messages(req: AuthedRequest, res: Response) {
    const guildId = String(req.query.guildId ?? "");
    if (!guildId) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(new ApiResponse(HttpStatus.BAD_REQUEST, "guildId is required", { messages: [] }));
    }
    const after = req.query.after ? String(req.query.after) : undefined;
    const messages = await StandupService.messages(req.employeeId!, guildId, after);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Messages fetched", { messages }));
  },

  async post(req: AuthedRequest, res: Response) {
    const parsed = postSchema.parse(req.body ?? {});
    const message = await StandupService.postMessage(req.employeeId!, parsed.guildId, parsed.body);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Message sent", { message }));
  },
};
