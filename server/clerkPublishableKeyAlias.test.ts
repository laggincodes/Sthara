import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("Clerk browser publishable-key compatibility", () => {
  it("uses the standard Vite value first and supports the existing public Vercel alias", () => {
    const mainSource = fs.readFileSync(
      path.join(projectRoot, "client/src/main.tsx"),
      "utf8"
    );
    const viteSource = fs.readFileSync(
      path.join(projectRoot, "vite.config.ts"),
      "utf8"
    );

    expect(mainSource).toContain("VITE_CLERK_PUBLISHABLE_KEY");
    expect(mainSource).toContain("CLERK_PUBLISH_KEY");
    expect(viteSource).toContain('envPrefix: ["VITE_", "CLERK_PUBLISH_KEY"]');
    expect(viteSource).not.toContain("CLERK_SECRET_KEY\"]");
  });
});
