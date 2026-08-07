// Vercel serverless entry point. Vercel's Node runtime invokes the default
// export as an (req, res) request handler — an Express app satisfies that
// signature directly, so no adapter library is needed. This file intentionally
// does NOT call app.listen(); that only happens in src/server.ts, which is
// used for local dev / any traditional long-running host instead.
import { app } from "../src/app";

export default app;
