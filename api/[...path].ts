import { createApp } from "../server/_core/index";

/**
 * Vercel Node serverless entry point. The Express app is shared with the
 * existing managed runtime; Vercel supplies the request-scoped HTTP server.
 */
const app = createApp();

export default app;
