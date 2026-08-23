import { describe, expect, it } from "vitest";
import { getApprovedExtrusionHeight } from "./footprint3d";

describe("approved-height Cesium extrusion contract", () => {
  it("returns an extrusion height only for a finite, authority-approved height", () => {
    expect(getApprovedExtrusionHeight({ approvedHeightMetres: 18.5 })).toBe(19.5);
    expect(getApprovedExtrusionHeight({ approvedHeightMetres: 18.5 }, 0)).toBe(18.5);
  });

  it("keeps unapproved or invalid heights flat", () => {
    expect(getApprovedExtrusionHeight({})).toBeUndefined();
    expect(getApprovedExtrusionHeight({ approvedHeightMetres: 0 })).toBeUndefined();
    expect(getApprovedExtrusionHeight({ approvedHeightMetres: "18.5" })).toBeUndefined();
  });
});
