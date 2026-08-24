import { describe, expect, it } from "vitest";
import { resolveBuildingEvidenceLevel } from "../client/src/lib/buildingEvidenceLevel";

describe("resolveBuildingEvidenceLevel", () => {
  it("keeps a public footprint at Level 1 without a verified height", () => {
    expect(resolveBuildingEvidenceLevel({ approvedHeightMetres: 0 })).toMatchObject({ level: 1, hasVerifiedHeight: false, hasOfficialFloorPlan: false });
  });

  it("unlocks an extrusion at Level 2 only from a positive verified height", () => {
    expect(resolveBuildingEvidenceLevel({ approvedHeightMetres: 18.5 })).toMatchObject({ level: 2, hasVerifiedHeight: true, hasOfficialFloorPlan: false });
  });

  it("requires both official floor-plan approval and an approved floor count for Level 3", () => {
    expect(resolveBuildingEvidenceLevel({ approvedHeightMetres: 18.5, officialFloorPlanApproved: true, approvedFloorCount: 4 })).toMatchObject({ level: 3, hasVerifiedHeight: true, hasOfficialFloorPlan: true, approvedFloorCount: 4 });
    expect(resolveBuildingEvidenceLevel({ officialFloorPlanApproved: true, approvedFloorCount: 4 })).toMatchObject({ level: 3, hasVerifiedHeight: false, hasOfficialFloorPlan: true });
  });
});
