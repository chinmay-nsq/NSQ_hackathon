import { Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { EmployeeService } from "@/services/EmployeeService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const setRoleSchema = z.object({
  role: z.enum(Role),
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
};
