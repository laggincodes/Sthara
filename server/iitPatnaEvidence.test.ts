import { describe, expect, it } from "vitest";
import { IIT_PATNA_OFFICIAL_CONTEXT, isIitPatnaReference } from "@shared/iitPatnaEvidence";

describe("IIT Patna official building context", () => {
  it("contains only source-cited institution records without assigning protected spatial facts", () => {
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ floors: "8 storeys", builtUpArea: "28,849 m²" }),
      expect.objectContaining({ label: "Academic Block-4", floors: "G+3 stated", builtUpArea: expect.stringContaining("6,667.73 m²") }),
    ]));
    for (const record of IIT_PATNA_OFFICIAL_CONTEXT.records) {
      expect(record).not.toHaveProperty("approvedHeightMetres");
      expect(record).not.toHaveProperty("ulpin");
      expect(record).not.toHaveProperty("geometry");
      expect(record).not.toHaveProperty("ownership");
      expect(record.linkage).toContain("not matched");
    }
    expect(IIT_PATNA_OFFICIAL_CONTEXT.lockedRequests[0]).toEqual(expect.objectContaining({
      label: "Academic Block-4",
      requirement: expect.stringContaining("surveyed metre height"),
      outcome: expect.stringContaining("remain locked"),
    }));
  });

  it("shows the context only for IIT Patna references", () => {
    expect(isIitPatnaReference("IIT Patna")).toBe(true);
    expect(isIitPatnaReference("Indian Institute of Technology Patna Bihta")).toBe(true);
    expect(isIitPatnaReference("AIIMS Patna")).toBe(false);
  });
});
