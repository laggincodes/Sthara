import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless adapter", () => {
  it("does not import the Vite development bridge while initializing the API function", () => {
    const serverEntry = fs.readFileSync(
      path.resolve(import.meta.dirname, "_core", "index.ts"),
      "utf8"
    );

    expect(serverEntry).not.toContain('from "./vite"');
    expect(serverEntry).toContain('await import("./vite")');
    expect(serverEntry).toContain('if (!process.env.VERCEL)');
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
  });
});
