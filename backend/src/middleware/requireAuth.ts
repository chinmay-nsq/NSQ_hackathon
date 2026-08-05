import { Request, Response, NextFunction } from "express";
import { AuthService } from "@/services/AuthService";
import { env } from "@/config/env";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

export interface AuthedRequest extends Request {
  employeeId?: string;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const cookieToken = req.cookies?.[env.cookieName];
  const token = bearer ?? cookieToken;

  if (!token) {
    return next(new ApiError(HttpStatus.UNAUTHORIZED, "Not authenticated", "Unauthorized"));
  }

  try {
    const payload = AuthService.verifyToken(token);
    req.employeeId = payload.employeeId;
    next();
  } catch (err) {
    next(err);
  }
}
