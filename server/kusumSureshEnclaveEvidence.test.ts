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

  it("does not treat the authority record as a matched footprint or issued vertical ULPIN", () => {
    const locks = record.kusumSureshEnclave.activeLocks;
    expect(locks.cesiumExtrusion).toContain("no exact building footprint");
    expect(locks.officialFootprintGeometry).toContain("not a closed parcel");
    expect(locks.verticalULPIN).toContain(
      "No approved vertical-property registration"
    );
  });
});
