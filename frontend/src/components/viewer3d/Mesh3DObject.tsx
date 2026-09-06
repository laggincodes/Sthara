"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Mesh3D } from "@/types/geometry3d";
import { mesh3DToBufferGeometry, disposeGeometry } from "@/lib/viewer3d/geometry";

export interface Mesh3DObjectProps {
  part: Mesh3D;
  isSelected?: boolean;
  isHovered?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  color?: string;
  edgeColor?: string;
  selectedColor?: string;
  selectedEdgeColor?: string;
  opacity?: number;
  positionOffset?: [number, number, number];
  onClick?: (e: THREE.Event) => void;
  onPointerOver?: (e: THREE.Event) => void;
  onPointerOut?: (e: THREE.Event) => void;
}

export function Mesh3DObject({
  part,
  isSelected = false,
  isHovered = false,
  isDimmed = false,
  isWireframe = false,
  color = "#06b6d4",
  edgeColor = "#22d3ee",
  selectedColor = "#fbbf24",
  selectedEdgeColor = "#fef08a",
  opacity = 0.75,
  positionOffset = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
}: Mesh3DObjectProps) {
  const converted = useMemo(() => {
    return mesh3DToBufferGeometry(part);
  }, [part]);

  // Clean disposal of Three.js geometry resources when unmounted
  useEffect(() => {
    if (!converted) return;
    const geom = converted.geometry;
    const edges = converted.edgesGeometry;
    return () => {
      disposeGeometry(geom);
      disposeGeometry(edges);
    };
  }, [converted]);

  if (!converted || !converted.valid) {
    return null;
  }

  const effectiveColor = isSelected ? selectedColor : color;
  const effectiveEdgeColor = isSelected ? selectedEdgeColor : edgeColor;
  const effectiveOpacity = isDimmed ? opacity * 0.35 : opacity;

  return (
    <group position={positionOffset}>
      {/* 1. Main Solid Mesh Surface */}
      <mesh
        geometry={converted.geometry}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver?.(e);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onPointerOut?.(e);
        }}
      >
        <meshStandardMaterial
          color={effectiveColor}
          transparent={true}
          opacity={effectiveOpacity}
          roughness={0.25}
          metalness={0.1}
          side={THREE.DoubleSide}
          wireframe={isWireframe}
        />
      </mesh>

      {/* 2. Architectural Silhouette Edges (Cadastral Outline) */}
      {!isWireframe && (
        <lineSegments geometry={converted.edgesGeometry}>
          <lineBasicMaterial
            color={effectiveEdgeColor}
            linewidth={isSelected || isHovered ? 2 : 1}
            transparent={true}
            opacity={isDimmed ? 0.25 : 0.85}
          />
        </lineSegments>
      )}
    </group>
  );
}
