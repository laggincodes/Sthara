import { describe, expect, it } from "vitest";
import { isValidFootprintGeometry } from "./postgis";

describe("footprint correction geometry contract", () => {
  it("accepts a finite GeoJSON polygon ring", () => {
    expect(isValidFootprintGeometry({ type: "Polygon", coordinates: [[[85.05, 25.61], [85.051, 25.61], [85.051, 25.611], [85.05, 25.61]]] })).toBe(true);
  });

  it("rejects unrelated geometry types and non-finite coordinates", () => {
    expect(isValidFootprintGeometry({ type: "Point", coordinates: [85.05, 25.61] })).toBe(false);
    expect(isValidFootprintGeometry({ type: "Polygon", coordinates: [[[85.05, Infinity], [85.051, 25.61], [85.05, Infinity]]] })).toBe(false);
  });
});
