import { Response } from "express";
import { z } from "zod";
import { Role, Seniority } from "@prisma/client";
import { EmployeeService } from "@/services/EmployeeService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const setRoleSchema = z.object({
  role: z.enum(Role),
});

const completeProfileSchema = z.object({
  jobRole: z.string().min(2).max(80),
  seniority: z.enum(Seniority),
  skills: z.array(z.string().min(1).max(40)).min(1).max(15),
});

const suggestProfileSchema = z.object({
  jobRole: z.string().min(2).max(80),
});

export const EmployeeController = {
  async list(_req: AuthedRequest, res: Response) {
    const employees = await EmployeeService.listAll();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Employees fetched", { employees }));
  },

  async setRole(req: AuthedRequest, res: Response) {
    const parsed = setRoleSchema.parse(req.body ?? {});
    const employee = await EmployeeService.setRole(String(req.params.id), parsed.role);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Role updated", { employee }));
  },

  async overview(_req: AuthedRequest, res: Response) {
    const overview = await EmployeeService.companyOverview();
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Company overview fetched", { overview }));
  },

  async completeProfile(req: AuthedRequest, res: Response) {
    const parsed = completeProfileSchema.parse(req.body ?? {});
    const employee = await EmployeeService.completeProfile(
      req.employeeId!,
      parsed.jobRole,
      parsed.seniority,
      parsed.skills
    );
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Profile completed", { employee }));
  },

  async suggestProfile(req: AuthedRequest, res: Response) {
    const parsed = suggestProfileSchema.parse(req.body ?? {});
    const suggestion = await EmployeeService.suggestProfile(parsed.jobRole);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Profile suggested", { suggestion }));
  },

  async guildWelcome(req: AuthedRequest, res: Response) {
    const message = await EmployeeService.guildWelcomeMessage(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Guild welcome fetched", { message }));
  },
};
