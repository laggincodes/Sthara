import { describe, expect, it } from "vitest";
import { IIT_PATNA_OFFICIAL_CONTEXT, isIitPatnaReference } from "@shared/iitPatnaEvidence";

describe("IIT Patna official building context", () => {
  it("limits the visible record to the independently verified institution-level hostel context", () => {
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records).toEqual([expect.objectContaining({ floors: "8 storeys", builtUpArea: "28,849 m²" })]);
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records[0]).not.toHaveProperty("approvedHeightMetres");
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records[0]).not.toHaveProperty("ulpin");
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records[0]).not.toHaveProperty("geometry");
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records[0]).not.toHaveProperty("ownership");
    expect(IIT_PATNA_OFFICIAL_CONTEXT.lockedRequests[0]).toEqual(expect.objectContaining({ label: "Academic Block-4", outcome: expect.stringContaining("remain locked") }));
  });

  it("shows the context only for IIT Patna references", () => {
    expect(isIitPatnaReference("IIT Patna")).toBe(true);
    expect(isIitPatnaReference("Indian Institute of Technology Patna Bihta")).toBe(true);
    expect(isIitPatnaReference("AIIMS Patna")).toBe(false);
  });
});
