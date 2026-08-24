import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const viteConfigPath = path.resolve(
  import.meta.dirname,
  "..",
  "vite.config.ts"
);

describe("Cesium production build configuration", () => {
  it("loads a pinned Cesium runtime before the application bundle", () => {
    const viteConfig = fs.readFileSync(viteConfigPath, "utf8");
    const appHtml = fs.readFileSync(
      path.resolve(import.meta.dirname, "..", "client", "index.html"),
      "utf8"
    );
    const spatialViewer = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "src",
        "components",
        "CesiumSpatialViewer.tsx"
      ),
      "utf8"
    );

    expect(viteConfig).not.toContain("vite-plugin-cesium");
    expect(viteConfig).toContain('outDir: "../dist/public"');
    expect(appHtml).toContain(
      "https://cdn.jsdelivr.net/npm/cesium@1.144.0/Build/Cesium/Cesium.js"
    );
    expect(appHtml).toContain("window.CESIUM_BASE_URL");
    expect(spatialViewer).toContain("const cesiumRuntime");
    expect(spatialViewer).not.toContain('void import("cesium")');
  });
});
