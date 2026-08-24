import { describe, expect, it } from "vitest";
import {
  getPlaceExplorerSegment,
  PLACE_EXPLORER_SEGMENTS,
  PLACE_EXPLORER_UNAVAILABLE_METRICS,
  SOURCE_BACKED_EXPLORER_SUGGESTIONS,
} from "../shared/placeExplorer";

describe("source-aware Parcels and Buildings explorer", () => {
  it("recognizes only the two explicit explorer segments and defaults safely to buildings", () => {
    expect(getPlaceExplorerSegment("parcels")).toBe("parcels");
    expect(getPlaceExplorerSegment("buildings")).toBe("buildings");
    expect(getPlaceExplorerSegment("restaurants")).toBe("buildings");
  });

  it("uses source-backed suggestions and preserves unavailable dimensions as locks", () => {
    expect(SOURCE_BACKED_EXPLORER_SUGGESTIONS).toContain("IIT Patna");
    expect(PLACE_EXPLORER_SEGMENTS.buildings.description).toContain(
      "Restaurant"
    );
    expect(PLACE_EXPLORER_UNAVAILABLE_METRICS).toContain("Length");
    expect(PLACE_EXPLORER_UNAVAILABLE_METRICS).toContain("legal parcel");
    expect(PLACE_EXPLORER_UNAVAILABLE_METRICS).toContain("ULPIN");
  });
});
