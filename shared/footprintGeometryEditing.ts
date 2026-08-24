export type PolygonVertex = [number, number];

export function getEditablePolygonVertices(geometryText: string): PolygonVertex[] {
  try {
    const geometry = JSON.parse(geometryText) as { type?: string; coordinates?: unknown };
    if (geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates) || !Array.isArray(geometry.coordinates[0])) return [];
    const ring = geometry.coordinates[0] as unknown[];
    return ring.slice(0, -1).filter((vertex): vertex is PolygonVertex => Array.isArray(vertex) && typeof vertex[0] === "number" && typeof vertex[1] === "number");
  } catch {
    return [];
  }
}

export function replacePolygonVertex(geometryText: string, vertexIndex: number, axis: 0 | 1, value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return geometryText;
  try {
    const geometry = JSON.parse(geometryText) as { type?: string; coordinates?: unknown };
    if (geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates) || !Array.isArray(geometry.coordinates[0])) return geometryText;
    const ring = geometry.coordinates[0] as number[][];
    if (!Array.isArray(ring[vertexIndex]) || ring.length < 4) return geometryText;
    ring[vertexIndex][axis] = numericValue;
    if (vertexIndex === 0) ring[ring.length - 1] = [...ring[0]];
    return JSON.stringify(geometry, null, 2);
  } catch {
    return geometryText;
  }
}
