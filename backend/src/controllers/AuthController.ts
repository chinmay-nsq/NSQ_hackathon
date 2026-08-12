import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "@/services/AuthService";
import { CompanionService } from "@/services/CompanionService";
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
  inviteCode: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setSessionCookie(res: Response, token: string) {
  // Frontend and backend live on different Vercel domains, so every request
  // between them is cross-site from the browser's point of view.
  // SameSite=Lax blocks cookies on cross-site fetch/XHR (it only allows them
  // on top-level navigations) — only SameSite=None gets the cookie attached
  // on API calls from another origin. None requires Secure, which is fine
  // since Vercel always serves over HTTPS; it just cannot work over plain
  // HTTP, so this intentionally only relaxes to Lax for local http dev.
  const isProduction = env.nodeEnv === "production";
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
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
      parsed.role,
      parsed.inviteCode
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

  async logout(req: Request, res: Response) {
    // Best-effort: chat history is only kept for the duration of a login
    // session, so clear it here — but logout must always succeed even with
    // a missing/expired/invalid token (unlike requireAuth, which would
    // reject the request outright), since "log me out" should work no
    // matter what state the session is in.
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = bearer ?? req.cookies?.[env.cookieName];
    if (token) {
      try {
        const { employeeId } = AuthService.verifyToken(token);
        await CompanionService.clearChatHistory(employeeId);
      } catch {
        // Expired/invalid token, or the clear itself failed — either way,
        // logout still proceeds below.
      }
    }

    const isProduction = env.nodeEnv === "production";
    // clearCookie must be called with the same attributes the cookie was set
    // with (sameSite/secure) or some browsers won't actually remove it.
    res.clearCookie(env.cookieName, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Logged out", null));
  },

  async me(req: AuthedRequest, res: Response) {
    const employee = await AuthService.getProfile(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Profile fetched", { employee }));
  },
};
