import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless API routing", () => {
  it("preserves API requests for the Express/Clerk handler before applying the SPA fallback", () => {
    const config = JSON.parse(
      fs.readFileSync(path.resolve(import.meta.dirname, "..", "vercel.json"), "utf8")
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(config.rewrites[0]).toEqual({
      source: "/api/(.*)",
      destination: "/api/$1",
    });
    expect(config.rewrites[1]).toEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });
});
