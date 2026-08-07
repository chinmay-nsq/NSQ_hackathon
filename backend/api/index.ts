// Vercel serverless entry point. Vercel's Node runtime invokes the default
// export as an (req, res) request handler — an Express app satisfies that
// signature directly, so no adapter library is needed. This file intentionally
// does NOT call app.listen(); that only happens in src/server.ts, which is
// used for local dev / any traditional long-running host instead.
//
// Imports from the BUILT dist/app.js, not src/app.ts — Vercel's own bundler
// for api/*.ts does not run tsc-alias, so a `@/config/...` alias import
// resolves fine at typecheck time but fails at runtime with
// "Cannot find module '@/config/cors'". dist/app.js already has every alias
// rewritten to a real relative path (produced by `npm run build`), so
// requiring it directly sidesteps the problem entirely.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require("../dist/app");

export default app;
