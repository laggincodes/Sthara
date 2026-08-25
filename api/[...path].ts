import { createApp } from "./_server.mjs";

/**
 * Vercel Node serverless entry point. `pnpm build` generates the adjacent
 * module so Vercel's function tracer receives the complete Express runtime.
 */
const app = createApp();

export default app;
