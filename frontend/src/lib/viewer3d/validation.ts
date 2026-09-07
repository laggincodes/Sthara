/**
 * Frontend Safety Validation Boundary for Canonical 3D Geometry.
 *
 * Semantic Rule:
 * The frontend validation is a safety boundary prior to Three.js instantiation.
 * It does NOT modify, close, reorder, or repair geometry. If invalid, it returns
 * machine-readable errors so the viewer can display an error state instead of broken rendering.
 */

import { Mesh3D, Mesh3DCollection } from "@/types/geometry3d";

export interface MeshValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a single canonical Mesh3D solid before Three.js instantiation.
 */
export function validateMesh3D(mesh: Mesh3D | null | undefined): MeshValidationResult {
  const errors: string[] = [];

  if (!mesh) {
    return { valid: false, errors: ["Mesh object is null or undefined."] };
  }

  // 1. Validate Geometry Type
  if (mesh.geometry_type !== "SOLID") {
    errors.push(`Expected geometry_type 'SOLID', but found '${mesh.geometry_type}'.`);
  }

  // 2. Validate Vertices
  const verts = mesh.vertices;
  if (!Array.isArray(verts) || verts.length < 4) {
    errors.push(
      `Insufficient vertices: expected at least 4 non-coplanar vertices for a solid, found ${
        verts?.length ?? 0
      }.`
    );
    return { valid: false, errors };
  }

  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    if (!Array.isArray(v) || v.length < 3) {
      errors.push(`Vertex at index ${i} is not a 3-element tuple.`);
      break;
    }
    if (!Number.isFinite(v[0]) || !Number.isFinite(v[1]) || !Number.isFinite(v[2])) {
      errors.push(
        `Non-finite coordinate detected at vertex index ${i}: [${v[0]}, ${v[1]}, ${v[2]}].`
      );
      break;
    }
  }

  // 3. Validate Faces
  const faces = mesh.faces;
  if (!Array.isArray(faces) || faces.length < 4) {
    errors.push(
      `Insufficient triangular faces: expected at least 4 faces for a solid, found ${
        faces?.length ?? 0
      }.`
    );
    return { valid: false, errors };
  }

  const vertCount = verts.length;
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    if (!Array.isArray(f) || f.length < 3) {
      errors.push(`Face at index ${i} is not a 3-element triangular tuple.`);
      break;
    }

    const [a, b, c] = f;
    // Check range
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      !Number.isInteger(c) ||
      a < 0 ||
      a >= vertCount ||
      b < 0 ||
      b >= vertCount ||
      c < 0 ||
      c >= vertCount
    ) {
      errors.push(
        `Face at index ${i} references out-of-bounds vertex index: [${a}, ${b}, ${c}]. Total vertices: ${vertCount}.`
      );
      break;
    }

    // Check non-degenerate (distinct vertices)
    if (a === b || b === c || a === c) {
      errors.push(`Degenerate face at index ${i}: duplicate vertex index [${a}, ${b}, ${c}].`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an entire Mesh3DCollection before rendering.
 */
export function validateMesh3DCollection(
  collection: Mesh3DCollection | null | undefined
): MeshValidationResult {
  const errors: string[] = [];

  if (!collection) {
    return { valid: false, errors: ["Mesh3DCollection object is null or undefined."] };
  }

  const parts = collection.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push("Mesh3DCollection contains no constituent parts.");
    return { valid: false, errors };
  }

  for (let i = 0; i < parts.length; i++) {
    const partRes = validateMesh3D(parts[i]);
    if (!partRes.valid) {
      errors.push(`Part [${i}] (${parts[i]?.feature_id ?? "unknown"}) invalid: ${partRes.errors.join("; ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
