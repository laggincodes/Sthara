import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("debug collector production isolation", () => {
  it("limits the debug collector and its unload listener to the Vite development server", () => {
    const viteConfig = fs.readFileSync(
      path.join(projectRoot, "vite.config.ts"),
      "utf8"
    );

    expect(viteConfig).toContain('name: "manus-debug-collector"');
    expect(viteConfig).toContain('apply: "serve"');
    expect(viteConfig).toContain('src: "/__manus__/debug-collector.js"');
  });
});
