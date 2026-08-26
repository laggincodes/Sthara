import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("protected workspace routing", () => {
  it("does not send sidebar workspace selections through the Clerk access root", () => {
    const workspace = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/SpatialWorkspace.tsx"),
      "utf8"
    );

    expect(workspace).toContain('setLocation("/ulpin-registry")');
    expect(workspace).toContain('setLocation("/overview")');
    expect(workspace).toContain('setLocation("/dashboard")');
    expect(workspace).not.toContain('setLocation("/")');
    expect(workspace).not.toContain('setLocation("/?workspace=');
  });

  it("returns registry navigation to an explicit signed-in dashboard route", () => {
    const registry = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/UlpInRegistry.tsx"),
      "utf8"
    );

    expect(registry).toContain('setLocation("/dashboard")');
    expect(registry).not.toContain('setLocation("/")');
  });
});
