import type { Express, Request, Response } from "express";

/**
 * Legacy route retained only to return an explicit migration response.
 * Authentication is now owned entirely by Clerk; no app-managed OAuth token or
 * cookie is created here.
 */
export function registerOAuthRoutes(app: Express) {
  app.all("/api/oauth/callback", (_req: Request, res: Response) => {
    res.status(410).json({
      error: "This application now uses Clerk for authentication.",
    });
  });
}
