import { describe, expect, it } from "vitest";
import {
  getMapEvidenceFilterLabel,
  matchesMapEvidenceFilter,
} from "@shared/evidenceMapFilter";
import { buildAcademicBlock4PdfLines } from "@shared/academicBlock4PdfContent";

describe("evidence-status map filtering", () => {
  it("keeps public footprints and approved-height extrusions in separate filter states", () => {
    expect(matchesMapEvidenceFilter({}, "public-footprint")).toBe(true);
    expect(matchesMapEvidenceFilter({}, "height-verified")).toBe(false);
    expect(
      matchesMapEvidenceFilter(
        { approvedHeightMetres: 22.5 },
        "height-verified"
      )
    ).toBe(true);
    expect(
      matchesMapEvidenceFilter(
        { approvedHeightMetres: 22.5 },
        "public-footprint"
      )
    ).toBe(false);
    expect(getMapEvidenceFilterLabel("height-verified")).toContain(
      "Verified-height"
    );
  });
});

describe("Academic Block-4 PDF export content", () => {
  it("retains source availability limits and explicit lock conditions", () => {
    const content = buildAcademicBlock4PdfLines({
      displayLabel: "Academic Block-4",
      evidenceTier: "source_cited",
      statedInstitutionalFacts: {
        storeys: "G+3 stated",
        totalFloorAreaSquareMetres: 6667.73,
        areaDescription: "Total floor area stated, not footprint area",
      },
      officialSourceCitations: [
        {
          label: "Official report",
          url: "https://example.gov/report.pdf",
          availabilityAtValidation: "Returned 404",
        },
      ],
      independentValidationStatus: "Source-cited, not independently verified.",
      activeLocks: {
        cesiumMetreHeightExtrusion: "Locked pending surveyed height.",
      },
    });
    expect(content.factLines.join(" ")).toContain("6,667.73");
    expect(content.citationLines.join(" ")).toContain("Returned 404");
    expect(content.lockLines.join(" ")).toContain(
      "Locked pending surveyed height"
    );
  });
});
