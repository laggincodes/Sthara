import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const viteConfigPath = path.resolve(import.meta.dirname, "..", "vite.config.ts");

describe("Cesium production build configuration", () => {
  it("publishes the Cesium runtime under Vite's deployed assets path", () => {
    const viteConfig = fs.readFileSync(viteConfigPath, "utf8");

    expect(viteConfig).toContain('cesium({ cesiumBaseUrl: "assets/cesium" })');
    expect(viteConfig).toContain('outDir: "../dist/public"');
  });
});
