import { Response } from "express";
import { z } from "zod";
import { WorkItemType } from "@prisma/client";
import { AssignmentService, isTaskColumnKey } from "@/services/AssignmentService";
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
  note: z.string().trim().min(1, "A note explaining the rejection is required").max(500),
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

export const AssignmentController = {
  async list(req: AuthedRequest, res: Response) {
    const assignments = await AssignmentService.listForEmployee(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Assignments fetched", { assignments }));
  },

  async generateSolo(req: AuthedRequest, res: Response) {
    const assignment = await AssignmentService.generateSolo(req.employeeId!);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Solo assignment ready", { assignment }));
  },

  async createManual(req: AuthedRequest, res: Response) {
    const parsed = createManualSchema.parse(req.body ?? {});
    const assignment = await AssignmentService.createManualSolo(
      req.employeeId!,
      parsed.title,
      parsed.description,
      parsed.workItemType
    );
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Assignment created", { assignment }));
  },

  async assign(req: AuthedRequest, res: Response) {
    const parsed = assignSchema.parse(req.body ?? {});
    const assignments = await AssignmentService.assignSolo(
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
      .json(new ApiResponse(HttpStatus.CREATED, "Assignment assigned", { assignments }));
  },

  async generateForEmployee(req: AuthedRequest, res: Response) {
    const employeeId = String(req.params.employeeId);
    const assignment = await AssignmentService.generateForEmployee(req.employeeId!, employeeId);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Assignment generated", { assignment }));
  },

  async generateTeam(req: AuthedRequest, res: Response) {
    const assignment = await AssignmentService.generateTeam(req.employeeId!);
    return res
      .status(HttpStatus.CREATED)
      .json(new ApiResponse(HttpStatus.CREATED, "Team assignment ready", { assignment }));
  },

  async complete(req: AuthedRequest, res: Response) {
    const parsed = completeSchema.parse(req.body ?? {});

    const assignmentId = String(req.params.id);
    const result = await AssignmentService.complete(req.employeeId!, assignmentId, parsed.submission, parsed.quiz);
    const message = result.pendingApproval ? "Submitted for manager approval" : "Assignment completed";
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, message, result));
  },

  async listPending(req: AuthedRequest, res: Response) {
    const { pending, approved, assigned } = await AssignmentService.listPendingFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Pending approvals fetched", { pending, approved, assigned }));
  },

  async listAssignedHistory(req: AuthedRequest, res: Response) {
    const history = await AssignmentService.listAssignedHistoryFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Assignment history fetched", { history }));
  },

  async myHistory(req: AuthedRequest, res: Response) {
    const { assigned, pending, approved } = await AssignmentService.myApprovalsFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Your history fetched", { assigned, pending, approved }));
  },

  async approve(req: AuthedRequest, res: Response) {
    const assignmentId = String(req.params.id);
    const employeeId = String(req.params.employeeId);
    const employee = await AssignmentService.approve(req.employeeId!, assignmentId, employeeId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Assignment approved", { employee }));
  },

  async reject(req: AuthedRequest, res: Response) {
    const parsed = rejectSchema.parse(req.body ?? {});
    const assignmentId = String(req.params.id);
    const employeeId = String(req.params.employeeId);
    const progress = await AssignmentService.reject(req.employeeId!, assignmentId, employeeId, parsed.note);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Assignment rejected", { progress }));
  },

  async board(req: AuthedRequest, res: Response) {
    const sprintId = typeof req.query.sprintId === "string" ? req.query.sprintId : undefined;
    const tasks = await AssignmentService.getBoard(req.employeeId!, sprintId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Board fetched", { tasks }));
  },

  async taskDetail(req: AuthedRequest, res: Response) {
    const assignmentId = String(req.params.id);
    const detail = await AssignmentService.getTaskDetail(req.employeeId!, assignmentId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Task detail fetched", detail));
  },

  async addComment(req: AuthedRequest, res: Response) {
    const parsed = addCommentSchema.parse(req.body ?? {});
    const assignmentId = String(req.params.id);
    const comment = await AssignmentService.addComment(req.employeeId!, assignmentId, parsed.body);
    return res.status(HttpStatus.CREATED).json(new ApiResponse(HttpStatus.CREATED, "Comment added", { comment }));
  },

  async moveSprint(req: AuthedRequest, res: Response) {
    const parsed = moveSprintSchema.parse(req.body ?? {});
    const assignmentId = String(req.params.id);
    const assignment = await AssignmentService.moveToSprint(req.employeeId!, assignmentId, parsed.sprintId);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Task moved", { assignment }));
  },

  async moveBoardStatus(req: AuthedRequest, res: Response) {
    const parsed = boardStatusSchema.parse(req.body ?? {});
    const assignmentId = String(req.params.id);
    const assignment = await AssignmentService.setBoardStatus(req.employeeId!, assignmentId, parsed.column);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Card moved", { assignment }));
  },
};
