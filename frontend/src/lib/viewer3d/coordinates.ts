/**
 * Coordinate Reference & Camera Framing Utilities for 3D Cadastre.
 *
 * Semantic Rule:
 * All canonical vertices are expressed in meters in local Cartesian scene coordinates
 * relative to the authoritative `viewer_origin`.
 * The viewer operates in Z-up orientation matching standard GIS coordinate conventions.
 */

import * as THREE from "three";
import { Mesh3D, Mesh3DCollection } from "@/types/geometry3d";

export interface CameraFitResult {
  center: [number, number, number];
  distance: number;
  cameraPosition: [number, number, number];
}

/**
 * Computes an exact THREE.Box3 bounding box from canonical Mesh3D vertices.
 */
export function computeMeshBounds(mesh: Mesh3D): THREE.Box3 {
  const box = new THREE.Box3();
  const verts = mesh.vertices;
  if (!verts || verts.length === 0) return box;

  for (let i = 0; i < verts.length; i++) {
    const [x, y, z] = verts[i];
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      box.expandByPoint(new THREE.Vector3(x, y, z));
    }
  }
  return box;
}

/**
 * Computes an aggregate THREE.Box3 bounding box across multiple Mesh3D parts.
 */
export function computeCollectionBounds(
  parts: (Mesh3D | Mesh3DCollection | null | undefined)[]
): THREE.Box3 {
  const aggregateBox = new THREE.Box3();

  for (const item of parts) {
    if (!item) continue;
    if ("parts" in item && Array.isArray(item.parts)) {
      for (const part of item.parts) {
        if (part) aggregateBox.union(computeMeshBounds(part));
      }
    } else if ("vertices" in item && Array.isArray(item.vertices)) {
      aggregateBox.union(computeMeshBounds(item as Mesh3D));
    }
  }

  return aggregateBox;
}

/**
 * Calculates optimal camera distance and target center to cleanly frame any bounding box.
 * Avoids arbitrary fixed camera coordinates and adapts dynamically to small single-story
 * footprints or large multi-building estates.
 */
export function calculateCameraFit(
  box: THREE.Box3,
  fovDegrees: number = 45,
  aspectRatio: number = 1.0
): CameraFitResult {
  if (box.isEmpty()) {
    return {
      center: [0, 0, 0],
      distance: 30,
      cameraPosition: [25, -25, 20],
    };
  }

  const centerVec = new THREE.Vector3();
  box.getCenter(centerVec);

  const sizeVec = new THREE.Vector3();
  box.getSize(sizeVec);

  // Bounding sphere radius
  const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
  const radius = Math.max(maxDim * 0.75, 4.0);

  const fovRad = (fovDegrees * Math.PI) / 180;
  // Fit both vertical and horizontal extents
  const distVertical = radius / Math.sin(fovRad / 2);
  const distHorizontal = radius / (Math.sin(fovRad / 2) * Math.max(aspectRatio, 0.5));
  const distance = Math.max(distVertical, distHorizontal) * 1.35;

  // In Z-up space, offset camera back and up at an isometric-style cadastral angle
  // X: +right, Y: -south/front, Z: +elevation
  const elevationAngle = Math.PI / 6; // ~30 degrees inclination
  const horizontalDist = distance * Math.cos(elevationAngle);
  const verticalDist = distance * Math.sin(elevationAngle);

  // Position south-west looking north-east towards center
  const camX = centerVec.x + horizontalDist * 0.7071;
  const camY = centerVec.y - horizontalDist * 0.7071;
  const camZ = centerVec.z + verticalDist;

  return {
    center: [centerVec.x, centerVec.y, centerVec.z],
    distance,
    cameraPosition: [camX, camY, camZ],
  };
}
