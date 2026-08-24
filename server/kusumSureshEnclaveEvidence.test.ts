import { describe, expect, it } from "vitest";
import record from "../submission/kusum-suresh-enclave-rera-evidence.json";

describe("KUSUM SURESH ENCLAVE Bihar RERA evidence", () => {
  it("preserves explicit authority facts and the endpoint-coordinate label", () => {
    const evidence = record.kusumSureshEnclave;
    expect(evidence.authority.recordId).toBe("RERAP125201800396-5");
    expect(evidence.statedAuthorityFacts.sanctionedFloorsSourceValue).toBe(
      "G+4"
    );
    expect(evidence.statedAuthorityFacts.officialHeightMetres).toBe(14.9);
    expect(evidence.endpointReference.sourceLabel).toContain("End point");
  });

  it("records the QR-code page as corroboration without treating its blank height field as height evidence", () => {
    const authority = record.kusumSureshEnclave.authority;
    expect(authority.qrCodeRecordUrl).toContain("QRCODE.aspx");
    expect(authority.qrCodeReview.corroborates).toContain(
      "One sanctioned building/wing"
    );
    expect(authority.qrCodeReview.doesNotIndependentlyCorroborate).toContain(
      "The 14.90 m building-height value because the rendered Height of Building field is blank"
    );
  });

  it("does not treat the authority record as a matched footprint or issued vertical ULPIN", () => {
    const locks = record.kusumSureshEnclave.activeLocks;
    expect(locks.cesiumExtrusion).toContain("no exact building footprint");
    expect(locks.officialFootprintGeometry).toContain("no WGS84 control");
    expect(locks.verticalULPIN).toContain(
      "No approved vertical-property registration"
    );
  });

  it("records the sanctioned plan as reviewed local geometry without claiming a GIS footprint", () => {
    const plan = record.kusumSureshEnclave.sanctionedPlanReview;
    expect(plan.status).toBe("reviewed_local_plan_geometry_not_georeferenced");
    expect(plan.suppliedFiles).toHaveLength(2);
    expect(plan.suppliedFiles[0].sha256).toBe(plan.suppliedFiles[1].sha256);
    expect(plan.geometryDecision).toContain("No WGS84 grid");
    expect(plan.nextRequirement).toContain("before creating a map polygon");
  });
});
