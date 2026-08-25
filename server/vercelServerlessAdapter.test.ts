import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless adapter", () => {
  it("keeps the Vite development bridge out of the API server module", () => {
    const serverEntry = fs.readFileSync(
      path.resolve(import.meta.dirname, "_core", "index.ts"),
      "utf8"
    );
    const localServer = fs.readFileSync(
      path.resolve(import.meta.dirname, "_core", "localServer.ts"),
      "utf8"
    );

    expect(serverEntry).not.toContain('from "./vite"');
    expect(serverEntry).not.toContain("startServer");
    expect(serverEntry).toContain("process.env.CLERK_PUBLISHABLE_KEY");
    expect(serverEntry).toContain("process.env.CLERK_PUBLISH_KEY");
    expect(serverEntry).toContain("process.env.VITE_CLERK_PUBLISHABLE_KEY");
    expect(serverEntry).toContain("publishableKey: clerkPublishableKey");
    expect(localServer).toContain('from "./vite"');
    expect(localServer).toContain('from "./index"');
  });

  it("loads the generated server bundle from the Vercel function entrypoint", () => {
    const apiEntry = fs.readFileSync(
      path.resolve(import.meta.dirname, "..", "api", "[...path].ts"),
      "utf8"
    );
    const packageJson = fs.readFileSync(
      path.resolve(import.meta.dirname, "..", "package.json"),
      "utf8"
    );

    expect(apiEntry).toContain('from "./_server.mjs"');
    expect(packageJson).toContain("--outfile=api/_server.mjs");
    expect(packageJson).toContain("server/_core/localServer.ts");
  });
});
