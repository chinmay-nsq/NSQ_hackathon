import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "@/config/cors";
import { logger } from "@/config/logger";
import { globalErrorHandler } from "@/utils/globalErrorHandler";
import { ApiError } from "@/utils/apiError";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

import authRouter from "@/routes/auth";
import companionRouter from "@/routes/companion";
import assignmentRouter from "@/routes/assignments";
import teamRouter from "@/routes/teams";
import companyRouter from "@/routes/company";
import marketplaceRouter from "@/routes/marketplace";
import employeeRouter from "@/routes/employees";
import tradingRouter from "@/routes/trading";
import notificationRouter from "@/routes/notifications";
import growthRouter from "@/routes/growth";
import standupRouter from "@/routes/standup";
import sprintRouter from "@/routes/sprints";

const app = express();
// Test Deployment 
app.use(
  morgan("dev", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Skibidi-Sprint API is running", null));
});

app.use("/auth", authRouter);
app.use("/companion", companionRouter);
app.use("/assignments", assignmentRouter);
app.use("/teams", teamRouter);
app.use("/company", companyRouter);
app.use("/marketplace", marketplaceRouter);
app.use("/employees", employeeRouter);
app.use("/trading", tradingRouter);
app.use("/notifications", notificationRouter);
app.use("/growth", growthRouter);
app.use("/standup", standupRouter);
app.use("/sprints", sprintRouter);

app.use((req, _res, next) => {
  next(new ApiError(HttpStatus.NOT_FOUND, `Route not found: ${req.originalUrl}`, "Not Found"));
});

app.use(globalErrorHandler);

export { app };
