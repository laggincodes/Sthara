/**
 * Canonical Geometry Conversion Layer for Three.js.
 *
 * Semantic Rules:
 * 1. Consumes authoritative Mesh3D geometry directly.
 * 2. Does NOT reorder face winding: canonical contract already guarantees outward counter-clockwise orientation.
 * 3. Does NOT alter coordinates or repair geometry.
 * 4. Provides safe disposal helpers to prevent WebGL memory leaks.
 */

import * as THREE from "three";
import { Mesh3D } from "@/types/geometry3d";
import { validateMesh3D } from "./validation";

export interface ConvertedMeshGeometry {
  geometry: THREE.BufferGeometry;
  edgesGeometry: THREE.EdgesGeometry;
  valid: boolean;
  errors: string[];
}

/**
 * Converts a canonical Mesh3D solid into Three.js BufferGeometry and EdgesGeometry.
 * Enforces frontend safety boundary validation before object creation.
 */
export function mesh3DToBufferGeometry(
  mesh: Mesh3D | null | undefined
): ConvertedMeshGeometry | null {
  const validation = validateMesh3D(mesh);
  if (!validation.valid || !mesh) {
    return {
      geometry: new THREE.BufferGeometry(),
      edgesGeometry: new THREE.EdgesGeometry(),
      valid: false,
      errors: validation.errors,
    };
  }

  const verts = mesh.vertices;
  const faces = mesh.faces;

  // 1. Construct Flat Position Buffer
  const positions = new Float32Array(verts.length * 3);
  for (let i = 0; i < verts.length; i++) {
    positions[i * 3 + 0] = verts[i][0]; // Local Easting (m)
    positions[i * 3 + 1] = verts[i][1]; // Local Northing (m)
    positions[i * 3 + 2] = verts[i][2]; // Local Elevation (m)
  }

  // 2. Construct Index Buffer without altering face winding
  // Canonical faces are 0-indexed CCW triangles [a, b, c]
  const indices: number[] = [];
  for (let j = 0; j < faces.length; j++) {
    const [a, b, c] = faces[j];
    indices.push(a, b, c);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);

  // Compute smooth surface normals client-side
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  // Create architectural silhouette edge wireframe (threshold angle 24 degrees)
  const edges = new THREE.EdgesGeometry(geom, 24);

  return {
    geometry: geom,
    edgesGeometry: edges,
    valid: true,
    errors: [],
  };
}

/**
 * Disposes a BufferGeometry and its attached attributes.
 */
export function disposeGeometry(geom: THREE.BufferGeometry | null | undefined): void {
  if (!geom) return;
  try {
    geom.dispose();
  } catch {
    // Graceful no-op
  }
}
