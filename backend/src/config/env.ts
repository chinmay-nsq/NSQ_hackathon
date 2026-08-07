import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.COOKIE_NAME ?? "weatherline_session",
  nodeEnv: process.env.NODE_ENV ?? "development",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  clientOriginWeb: process.env.CLIENT_ORIGIN_WEB ?? "http://localhost:3000",
};

/** CLIENT_ORIGIN_WEB may be a single origin or a comma-separated list (e.g. prod + a preview deploy). */
export const allowedOrigins = env.clientOriginWeb.split(",").map((o) => o.trim()).filter(Boolean);
