import { describe, expect, it } from "vitest";
import { getEditablePolygonVertices, replacePolygonVertex } from "../shared/footprintGeometryEditing";

const sourcePolygon = JSON.stringify({
  type: "Polygon",
  coordinates: [[[84.851, 25.542], [84.852, 25.542], [84.852, 25.543], [84.851, 25.542]]],
});

describe("assisted footprint vertex editing", () => {
  it("exposes editable vertices without the duplicate closing coordinate", () => {
    expect(getEditablePolygonVertices(sourcePolygon)).toEqual([
      [84.851, 25.542],
      [84.852, 25.542],
      [84.852, 25.543],
    ]);
  });

  it("keeps the polygon ring closed when the first vertex is corrected", () => {
    const edited = JSON.parse(replacePolygonVertex(sourcePolygon, 0, 0, "84.8505")) as { coordinates: number[][][] };
    expect(edited.coordinates[0][0]).toEqual([84.8505, 25.542]);
    expect(edited.coordinates[0].at(-1)).toEqual([84.8505, 25.542]);
  });

  it("does not alter the reviewed GeoJSON for invalid numeric input", () => {
    expect(replacePolygonVertex(sourcePolygon, 1, 1, "not-a-number")).toBe(sourcePolygon);
  });
});
