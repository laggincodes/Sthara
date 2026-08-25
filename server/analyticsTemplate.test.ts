import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("production analytics template safety", () => {
  it("does not emit unresolved Vite analytics placeholders into the browser", () => {
    const html = fs.readFileSync(
      path.join(projectRoot, "client/index.html"),
      "utf8"
    );

    expect(html).not.toContain("%VITE_ANALYTICS_ENDPOINT%");
    expect(html).not.toContain("%VITE_ANALYTICS_WEBSITE_ID%");
  });
});
