import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "@/services/AuthService";
import { env } from "@/config/env";
import { COOKIE_MAX_AGE_MS } from "@/config/constants";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  // ADMIN is intentionally excluded — never selectable at signup.
  role: z.enum(["EMPLOYEE", "MANAGER"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setSessionCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export const AuthController = {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.parse(req.body);

    const { token, employee, hasCompanion } = await AuthService.register(
      parsed.email,
      parsed.password,
      parsed.name,
      parsed.role
    );
    setSessionCookie(res, token);

    return res
      .status(HttpStatus.CREATED)
      .json(
        new ApiResponse(HttpStatus.CREATED, "Account created", {
          token,
          employee: { id: employee.id, email: employee.email, name: employee.name, hasCompanion },
        })
      );
  },

  async login(req: Request, res: Response) {
    const parsed = loginSchema.parse(req.body);

    const { token, employee, hasCompanion } = await AuthService.login(parsed.email, parsed.password);
    setSessionCookie(res, token);

    return res.status(HttpStatus.OK).json(
      new ApiResponse(HttpStatus.OK, "Logged in", {
        token,
        employee: { id: employee.id, email: employee.email, name: employee.name, hasCompanion },
      })
    );
  },

  logout(_req: Request, res: Response) {
    res.clearCookie(env.cookieName);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Logged out", null));
  },

  async me(req: AuthedRequest, res: Response) {
    const employee = await AuthService.getProfile(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Profile fetched", { employee }));
  },
};
