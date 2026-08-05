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
import adventureRouter from "@/routes/adventures";
import guildRouter from "@/routes/guilds";
import kingdomRouter from "@/routes/kingdom";
import marketplaceRouter from "@/routes/marketplace";

const app = express();

app.use(
  morgan("dev", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Weatherline API is running", null));
});

app.use("/auth", authRouter);
app.use("/companion", companionRouter);
app.use("/adventures", adventureRouter);
app.use("/guilds", guildRouter);
app.use("/kingdom", kingdomRouter);
app.use("/marketplace", marketplaceRouter);

app.use((req, _res, next) => {
  next(new ApiError(HttpStatus.NOT_FOUND, `Route not found: ${req.originalUrl}`, "Not Found"));
});

app.use(globalErrorHandler);

export { app };
