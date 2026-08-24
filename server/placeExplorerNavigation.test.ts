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
const propertyVolumesSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/PropertyVolumes.tsx"),
  "utf8"
);
const registrySource = readFileSync(
  resolve(process.cwd(), "client/src/pages/UlpInRegistry.tsx"),
  "utf8"
);
const officialSourceAudit = readFileSync(
  resolve(process.cwd(), "research/official-bihar-data-sources-audit.md"),
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

  it("routes Property volumes and ULPIN registry to distinct evidence-first workspaces", () => {
    expect(homePageSource).toContain('setLocation("/property-volumes")');
    expect(homePageSource).toContain('setLocation("/ulpin-registry")');
    expect(propertyVolumesSource).toContain("Vertical-property review");
    expect(propertyVolumesSource).toContain("No vertical ULPINs issued");
    expect(registrySource).toContain("Live source records");
    expect(registrySource).toContain("Issued vertical ULPINs");
  });

  it("keeps the registry action as an eligibility review rather than unverified issuance", () => {
    expect(registrySource).toContain("Review eligibility");
    expect(registrySource).toContain("Issuance locked");
    expect(registrySource).toMatch(
      /cannot be converted into legal or\s+vertical ULPINs/
    );
    expect(homePageSource).toContain('get("issue") === "eligibility"');
    expect(homePageSource).toContain("3D ULPIN issuance locked");
  });

  it("shows official data-access routes without claiming an unavailable Digha Plot 808 parcel record", () => {
    expect(propertyVolumesSource).toContain("officialDataRoutes");
    expect(propertyVolumesSource).toContain(
      "BhuNaksha · Digha cadastral workflow"
    );
    expect(propertyVolumesSource).toContain(
      "Plot 808 returned no visible result during review"
    );
    expect(propertyVolumesSource).toContain(
      "No parcel boundary, holder, area, or ULPIN imported."
    );
    expect(officialSourceAudit).toContain("Patna Rural");
    expect(officialSourceAudit).toContain("remained in a loading state");
  });
});
