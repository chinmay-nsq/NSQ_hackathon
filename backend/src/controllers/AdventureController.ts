import { Response } from "express";
import { z } from "zod";
import { AdventureService } from "@/services/AdventureService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const completeSchema = z.object({
  submission: z.string().max(2000).optional(),
});

const createManualSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
});

const assignSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1).max(50),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  xpReward: z.number().int().min(5).max(200).default(25),
  coinReward: z.number().int().min(5).max(200).default(15),
});

const rejectSchema = z.object({
  note: z.string().max(500).optional(),
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

  async createManual(req: AuthedRequest, res: Response) {
    const parsed = createManualSchema.parse(req.body ?? {});
    const adventure = await AdventureService.createManualSolo(req.employeeId!, parsed.title, parsed.description);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Adventure created", { adventure }));
  },

  async assign(req: AuthedRequest, res: Response) {
    const parsed = assignSchema.parse(req.body ?? {});
    const adventures = await AdventureService.assignSolo(
      req.employeeId!,
      parsed.employeeIds,
      parsed.title,
      parsed.description,
      parsed.xpReward,
      parsed.coinReward
    );
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Adventure assigned", { adventures }));
  },

  async generateForEmployee(req: AuthedRequest, res: Response) {
    const employeeId = String(req.params.employeeId);
    const adventure = await AdventureService.generateForEmployee(req.employeeId!, employeeId);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Adventure generated", { adventure }));
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
    const result = await AdventureService.complete(req.employeeId!, adventureId, parsed.submission);
    const message = result.pendingApproval ? "Submitted for manager approval" : "Adventure completed";
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, message, result));
  },

  async listPending(req: AuthedRequest, res: Response) {
    const { pending, assigned } = await AdventureService.listPendingFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Pending approvals fetched", { pending, assigned }));
  },

  async approve(req: AuthedRequest, res: Response) {
    const adventureId = String(req.params.id);
    const employeeId = String(req.params.employeeId);
    const employee = await AdventureService.approve(req.employeeId!, adventureId, employeeId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Adventure approved", { employee }));
  },

  async reject(req: AuthedRequest, res: Response) {
    const parsed = rejectSchema.parse(req.body ?? {});
    const adventureId = String(req.params.id);
    const employeeId = String(req.params.employeeId);
    const progress = await AdventureService.reject(req.employeeId!, adventureId, employeeId, parsed.note);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Adventure rejected", { progress }));
  },
};
