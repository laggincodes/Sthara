import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homePageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Home.tsx"),
  "utf8"
);

describe("SIH ULPIN issuance gate", () => {
  it("does not present a fabricated identifier or issue a ULPIN from the demo", () => {
    expect(homePageSource).toContain("3D ULPIN issuance locked");
    expect(homePageSource).toContain("Identifier status");
    expect(homePageSource).toContain("Not issued");
    expect(homePageSource).not.toContain("KA-29-105-0421-B12-F");
    expect(homePageSource).not.toContain('toast.success("3D ULPIN issued"');
  });

  it("states the geometry and vertical-evidence prerequisites", () => {
    expect(homePageSource).toContain("Ground control points required");
    expect(homePageSource).toContain("Authoritative footprint required");
    expect(homePageSource).toContain("Vertical registration evidence");
  });
});
