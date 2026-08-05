import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { ApiError } from "./apiError";
import { HttpStatus } from "./httpStatus";
import { logger } from "@/config/logger";

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      success: err.success,
      error: err.error,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join(", ");
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: HttpStatus.BAD_REQUEST,
      success: false,
      error: "Validation error",
      message,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return res.status(HttpStatus.CONFLICT).json({
        status: HttpStatus.CONFLICT,
        success: false,
        error: "Duplicate value",
        message: `A record with this ${target} already exists`,
      });
    }
    if (err.code === "P2025") {
      return res.status(HttpStatus.NOT_FOUND).json({
        status: HttpStatus.NOT_FOUND,
        success: false,
        error: "Not found",
        message: "The requested record does not exist",
      });
    }
  }

  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      status: HttpStatus.UNAUTHORIZED,
      success: false,
      error: "Invalid session",
      message: "Invalid or expired session",
    });
  }

  logger.error(err instanceof Error ? err.stack || err.message : String(err));

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    success: false,
    error: err instanceof Error ? err.message : "Something went wrong",
    message: "Internal Server Error",
  });
};

export { globalErrorHandler };
