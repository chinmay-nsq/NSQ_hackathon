import { CorsOptions } from "cors";
import { env } from "./env";

// CORS only applies to browser requests. This includes the Next.js dashboard
// AND the Expo app when run via `expo start --web`, which sends a real Origin
// header like any other web page. A native device/emulator build sends no
// Origin header and isn't subject to CORS at all — it authenticates via the
// Authorization: Bearer header regardless of this config.
const allowedOrigins = [env.clientOriginWeb, env.expoWebOrigin];

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};
