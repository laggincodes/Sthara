import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const submissionDirectory = resolve(process.cwd(), "submission");
const academicBlock4 = JSON.parse(readFileSync(resolve(submissionDirectory, "academic-block-4-institutional-evidence.json"), "utf8")) as Record<string, unknown>;
const methodology = readFileSync(resolve(submissionDirectory, "sih-methodology-evidence-locks.md"), "utf8");

describe("SIH Academic Block-4 evidence exports", () => {
  it("keeps the Block-4 record source-cited and prevents unsupported spatial claims", () => {
    const record = academicBlock4.academicBlock4 as Record<string, unknown>;
    expect(record.evidenceTier).toBe("source_cited_official_record_not_independently_retrievable");
    expect(record.statedInstitutionalFacts).toEqual(expect.objectContaining({ totalFloorAreaSquareMetres: 6667.73 }));
    expect(JSON.stringify(record)).not.toContain("approvedHeightMetres");
    expect(JSON.stringify(record)).not.toContain('"geometry"');
    expect(JSON.stringify(record)).not.toContain('"issuedVerticalUlpIn"');
    expect(record.activeLocks).toEqual(expect.objectContaining({
      cesiumMetreHeightExtrusion: expect.stringContaining("Locked"),
      verticalUlpIn: expect.stringContaining("Locked"),
    }));
  });

  it("states the three-level evidence ladder and prohibits floor-count-to-height inference", () => {
    expect(methodology).toContain("Level 1");
    expect(methodology).toContain("Level 2");
    expect(methodology).toContain("Level 3");
    expect(methodology).toContain("not converted into a metre height");
  });
});
