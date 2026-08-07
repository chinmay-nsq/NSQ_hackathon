import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";
import { AuthedRequest } from "@/middleware/requireAuth";

export interface RoleCheckedRequest extends AuthedRequest {
  employeeRole?: Role;
}

/**
 * Requires the authenticated employee to hold one of `roles`. Looks the role
 * up fresh from the DB on every request (not from the JWT) so a demotion
 * takes effect immediately instead of waiting for the token to expire.
 */
export function requireRole(...roles: Role[]) {
  return async (req: RoleCheckedRequest, _res: Response, next: NextFunction) => {
    if (!req.employeeId) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Not authenticated", "Unauthorized"));
    }
    try {
      const employee = await EmployeeRepository.findById(req.employeeId);
      if (!employee) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, "Not authenticated", "Unauthorized"));
      }
      if (!roles.includes(employee.role)) {
        return next(new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden"));
      }
      req.employeeRole = employee.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
