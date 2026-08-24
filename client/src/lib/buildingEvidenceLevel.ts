export type BuildingEvidenceLevel = 1 | 2 | 3;

export type BuildingEvidenceState = {
  level: BuildingEvidenceLevel;
  hasVerifiedHeight: boolean;
  hasOfficialFloorPlan: boolean;
  approvedFloorCount: number | null;
};

export function resolveBuildingEvidenceLevel(properties: Record<string, unknown> | null | undefined): BuildingEvidenceState {
  const rawHeight = properties?.approvedHeightMetres;
  const hasVerifiedHeight = typeof rawHeight === "number" && Number.isFinite(rawHeight) && rawHeight > 0;
  const rawFloorCount = properties?.approvedFloorCount;
  const approvedFloorCount = typeof rawFloorCount === "number" && Number.isFinite(rawFloorCount) && rawFloorCount > 0 ? Math.floor(rawFloorCount) : null;
  const hasOfficialFloorPlan = properties?.officialFloorPlanApproved === true && approvedFloorCount !== null;

  return {
    level: hasOfficialFloorPlan ? 3 : hasVerifiedHeight ? 2 : 1,
    hasVerifiedHeight,
    hasOfficialFloorPlan,
    approvedFloorCount,
  };
}
