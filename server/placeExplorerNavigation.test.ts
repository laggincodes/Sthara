import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homePageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Home.tsx"),
  "utf8"
);
const workspaceSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/SpatialWorkspace.tsx"),
  "utf8"
);

describe("Parcels and Buildings explorer navigation", () => {
  it("routes sidebar selections into their distinct source-aware explorer segments", () => {
    expect(homePageSource).toContain("segment=parcels");
    expect(homePageSource).toContain("segment=buildings");
    expect(workspaceSource).toContain("getPlaceExplorerSegment");
    expect(workspaceSource).toContain("useSearch");
  });

  it("reuses guarded AI routing and displays an explicit lock for unavailable dimensions", () => {
    expect(workspaceSource).toContain("resolveBuilding.mutate");
    expect(workspaceSource).toContain("PLACE_EXPLORER_UNAVAILABLE_METRICS");
    expect(workspaceSource).toContain("source-backed building record");
  });
});
