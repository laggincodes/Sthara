import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { clerkMiddleware } from "@clerk/express";
import { hasValidPostgisApiKey, getPostgisFeatureCollection } from "../postgis";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp() {
  const app = express();
  const clerkPublishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.CLERK_PUBLISH_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY;
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    clerkMiddleware({
      publishableKey: clerkPublishableKey,
    })
  );
  registerStorageProxy(app);
  app.get("/api/postgis/geojson", async (req, res) => {
    if (!hasValidPostgisApiKey(req.header("authorization"))) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      res.type("application/geo+json").json(await getPostgisFeatureCollection());
    } catch (error) {
      console.error("[PostGIS] GeoJSON request failed", error);
      res.status(503).json({ error: "Spatial geometry service unavailable" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
