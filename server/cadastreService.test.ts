import { describe, expect, it } from "vitest";
import { fallbackCadastreSearch, mergeAiSearchResponse, validateCadastreUpload } from "./cadastreService";
import { INITIAL_CADASTRE_RECORDS } from "@shared/cadastre";

describe("cadastre search service", () => {
  it("matches a semantic parking conflict query to the review-required volume", () => {
    const result = fallbackCadastreSearch(INITIAL_CADASTRE_RECORDS, "show the parking volume with a utility conflict");
    expect(result.record?.unit).toBe("P2-06");
    expect(result.record?.status).toBe("Review required");
  });

  it("uses a valid AI-selected ULPIN while retaining the trusted catalog record", () => {
    const result = mergeAiSearchResponse(INITIAL_CADASTRE_RECORDS, "Block B11 floor 7", {
      ulpin: "KA-29-105-0421-B11-F07-008",
      answer: "Found the requested air-rights volume.",
      confidence: 94.2,
      intent: "Find air-rights record",
      rationale: "Building and floor matched.",
    });
    expect(result.record?.building).toBe("Block B11");
    expect(result.confidence).toBe(94);
    expect(result.poweredBy).toBe("AI semantic match");
  });
});

describe("cadastre upload validation", () => {
  it("accepts a simple GeoJSON FeatureCollection and returns the feature count", () => {
    const dataBase64 = Buffer.from(JSON.stringify({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [77.6245, 12.9352] }, properties: {} }],
    })).toString("base64");
    const result = validateCadastreUpload({ category: "geojson", fileName: "sector-5.geojson", mimeType: "application/geo+json", dataBase64 });
    expect(result.accepted).toBe(true);
    expect(result.featureCount).toBe(1);
  });

  it("rejects an unsupported floor-plan file type", () => {
    const dataBase64 = Buffer.from("not a plan").toString("base64");
    const result = validateCadastreUpload({ category: "floorplan", fileName: "floor-plan.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataBase64 });
    expect(result.accepted).toBe(false);
  });
});
