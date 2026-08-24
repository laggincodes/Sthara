import { describe, expect, it } from "vitest";
import { IIT_PATNA_OFFICIAL_CONTEXT, isIitPatnaReference } from "@shared/iitPatnaEvidence";

describe("IIT Patna official building context", () => {
  it("limits the visible record to the independently verified institution-level hostel context", () => {
    expect(IIT_PATNA_OFFICIAL_CONTEXT.records).toEqual([expect.objectContaining({ floors: "8 storeys", builtUpArea: "28,849 m²" })]);
    expect(JSON.stringify(IIT_PATNA_OFFICIAL_CONTEXT)).not.toMatch(/approvedHeightMetres|ulpin|geometry|ownership/i);
  });

  it("shows the context only for IIT Patna references", () => {
    expect(isIitPatnaReference("IIT Patna")).toBe(true);
    expect(isIitPatnaReference("Indian Institute of Technology Patna Bihta")).toBe(true);
    expect(isIitPatnaReference("AIIMS Patna")).toBe(false);
  });
});
