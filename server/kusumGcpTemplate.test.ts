import { describe, expect, it } from "vitest";
import template from "../submission/kusum-suresh-enclave-gcp-template.json";

describe("KUSUM SURESH ENCLAVE GCP template", () => {
  it("requires EPSG:4326 target coordinates and at least three non-collinear pairs", () => {
    expect(template.project.targetCoordinateReferenceSystem).toBe("EPSG:4326");
    expect(template.minimumRequirements.minimumControlPoints).toBe(3);
    expect(template.minimumRequirements.nonCollinear).toBe(true);
    expect(template.controlPoints).toHaveLength(3);
  });

  it("ships without fabricated plan pixels, WGS84 coordinates, or an unlocked footprint", () => {
    for (const point of template.controlPoints) {
      expect(point.planPixel.x).toBeNull();
      expect(point.planPixel.y).toBeNull();
      expect(point.wgs84.latitude).toBeNull();
      expect(point.wgs84.longitude).toBeNull();
    }
    expect(template.validationGate.noFootprintGenerated).toBe(true);
    expect(template.validationGate.noCesiumExtrusionEnabled).toBe(true);
    expect(template.validationGate.noVerticalULPINIssued).toBe(true);
  });
});
