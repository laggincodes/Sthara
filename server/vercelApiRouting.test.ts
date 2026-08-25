import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless API routing", () => {
  it("preserves API requests for the Express/Clerk handler before applying the SPA fallback", () => {
    const config = JSON.parse(
      fs.readFileSync(path.resolve(import.meta.dirname, "..", "vercel.json"), "utf8")
    ) as {
      routes: Array<
        | { handle: string }
        | { src: string; dest: string }
      >;
    };

    expect(config.routes[0]).toEqual({
      handle: "filesystem",
    });
    expect(config.routes[1]).toEqual({
      src: "/(.*)",
      dest: "/index.html",
    });
  });
});
