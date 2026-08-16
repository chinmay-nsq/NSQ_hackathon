import { Request, Response } from "express";
import { z } from "zod";
import { CompanionService } from "@/services/CompanionService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { COMPANION_SPECIES } from "@/config/constants";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const createSchema = z.object({
  species: z.enum(COMPANION_SPECIES),
  name: z.string().min(1).max(30),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const CompanionController = {
  listSpecies(_req: Request, res: Response) {
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Species fetched", { species: COMPANION_SPECIES }));
  },

  async create(req: AuthedRequest, res: Response) {
    const parsed = createSchema.parse(req.body);

    const companion = await CompanionService.create(req.employeeId!, parsed.species, parsed.name);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Companion created", { companion }));
  },

  async checkName(req: Request, res: Response) {
    const name = String(req.query.name ?? "");
    const available = await CompanionService.isNameAvailable(name);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Availability checked", { available }));
  },

  async me(req: AuthedRequest, res: Response) {
    const companion = await CompanionService.getMine(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Companion fetched", { companion }));
  },

  async dialogue(req: AuthedRequest, res: Response) {
    const { text, action } = await CompanionService.getDialogue(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Dialogue generated", { dialogue: text, action }));
  },

  async chatHistory(req: AuthedRequest, res: Response) {
    const messages = await CompanionService.getChatHistory(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Chat history fetched", { messages }));
  },

  async sendMessage(req: AuthedRequest, res: Response) {
    const parsed = sendMessageSchema.parse(req.body ?? {});
    const { navigateTo, ...message } = await CompanionService.sendMessage(req.employeeId!, parsed.content);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Message sent", { message, navigateTo: navigateTo ?? null }));
  },
};
