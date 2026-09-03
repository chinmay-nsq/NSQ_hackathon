import { Response } from "express";
import { z } from "zod";
import { WorkItemType } from "@prisma/client";
import { AdventureService, isTaskColumnKey } from "@/services/AdventureService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const completeSchema = z.object({
  submission: z.string().max(2000).optional(),
  quiz: z
    .object({
      answers: z.array(z.number().int().min(0).max(3)).length(5),
      correctCount: z.number().int().min(0).max(5),
    })
    .optional(),
});

const createManualSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  workItemType: z.enum(WorkItemType).optional(),
});

const assignSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1).max(50),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  xpReward: z.number().int().min(5).max(200).default(25),
  coinReward: z.number().int().min(5).max(200).default(15),
  workItemType: z.enum(WorkItemType).optional(),
  sprintId: z.string().min(1).optional(),
});

const rejectSchema = z.object({
  note: z.string().max(500).optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

const boardStatusSchema = z.object({
  column: z.string().refine(isTaskColumnKey, "Unknown board column"),
});

const moveSprintSchema = z.object({
  sprintId: z.string().min(1).nullable(),
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
    const adventure = await AdventureService.createManualSolo(
      req.employeeId!,
      parsed.title,
      parsed.description,
      parsed.workItemType
    );
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
      parsed.coinReward,
      parsed.workItemType,
      parsed.sprintId
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
    const result = await AdventureService.complete(req.employeeId!, adventureId, parsed.submission, parsed.quiz);
    const message = result.pendingApproval ? "Submitted for manager approval" : "Adventure completed";
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, message, result));
  },

  async listPending(req: AuthedRequest, res: Response) {
    const { pending, approved, assigned } = await AdventureService.listPendingFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Pending approvals fetched", { pending, approved, assigned }));
  },

  async listAssignedHistory(req: AuthedRequest, res: Response) {
    const history = await AdventureService.listAssignedHistoryFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Assignment history fetched", { history }));
  },

  async myHistory(req: AuthedRequest, res: Response) {
    const { assigned, pending, approved } = await AdventureService.myApprovalsFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Your history fetched", { assigned, pending, approved }));
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

  async board(req: AuthedRequest, res: Response) {
    const sprintId = typeof req.query.sprintId === "string" ? req.query.sprintId : undefined;
    const tasks = await AdventureService.getBoard(req.employeeId!, sprintId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Board fetched", { tasks }));
  },

  async taskDetail(req: AuthedRequest, res: Response) {
    const adventureId = String(req.params.id);
    const detail = await AdventureService.getTaskDetail(req.employeeId!, adventureId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Task detail fetched", detail));
  },

  async addComment(req: AuthedRequest, res: Response) {
    const parsed = addCommentSchema.parse(req.body ?? {});
    const adventureId = String(req.params.id);
    const comment = await AdventureService.addComment(req.employeeId!, adventureId, parsed.body);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Comment added", { comment }));
  },

  async moveSprint(req: AuthedRequest, res: Response) {
    const parsed = moveSprintSchema.parse(req.body ?? {});
    const adventureId = String(req.params.id);
    const adventure = await AdventureService.moveToSprint(req.employeeId!, adventureId, parsed.sprintId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Task moved", { adventure }));
  },

  async moveBoardStatus(req: AuthedRequest, res: Response) {
    const parsed = boardStatusSchema.parse(req.body ?? {});
    const adventureId = String(req.params.id);
    const adventure = await AdventureService.setBoardStatus(req.employeeId!, adventureId, parsed.column);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Card moved", { adventure }));
  },
};
