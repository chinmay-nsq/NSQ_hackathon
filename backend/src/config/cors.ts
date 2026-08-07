import { CorsOptions } from "cors";
import { allowedOrigins } from "./env";

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header (server-to-server calls, curl, health checks) — allow.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
};
