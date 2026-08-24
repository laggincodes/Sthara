import { describe, expect, it } from "vitest";
import { filterIitPatnaAutocomplete } from "@shared/iitPatnaAutocomplete";

describe("IIT Patna evidence-aware autocomplete", () => {
  it("suggests only dashboard-backed IIT records with their evidence limitations", () => {
    expect(filterIitPatnaAutocomplete("block-4")).toEqual([
      expect.objectContaining({
        label: expect.stringContaining("source-cited"),
      }),
    ]);
    expect(filterIitPatnaAutocomplete("hostel")).toEqual([
      expect.objectContaining({ label: expect.stringContaining("verified") }),
    ]);
  });

  it("does not generate suggestions for unsupported non-IIT places", () => {
    expect(filterIitPatnaAutocomplete("restaurant")).toEqual([]);
  });
});
