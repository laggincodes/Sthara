"use client";

import React, { useState } from "react";
import { UndergroundFeature, Mesh3D } from "@/types/cadastre";
import { Mesh3DObject } from "./Mesh3DObject";

export interface UndergroundObjectProps {
  feature: UndergroundFeature;
  isSelected?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  cutawayMode?: boolean;
  onSelect?: (featureId: string) => void;
}

/**
 * Renders an underground feature (Basement, Utility Corridor, Subsurface Volume)
 * in the 3D viewer using the Canonical 3D Geometry contract.
 */
export function UndergroundObject({
  feature,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  cutawayMode = false,
  onSelect,
}: UndergroundObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Extract individual solid parts
  let parts: Mesh3D[] = [];
  if (feature.mesh_3d) {
    if ("parts" in feature.mesh_3d && Array.isArray(feature.mesh_3d.parts)) {
      parts = feature.mesh_3d.parts;
    } else if ("vertices" in feature.mesh_3d) {
      parts = [feature.mesh_3d as Mesh3D];
    }
  }

  if (parts.length === 0) return null;

  // Determine engineering theme colors based on asset classification
  let baseColor = "#3b82f6"; // Default blue
  let edgeColor = "#60a5fa";

  if (feature.feature_type === "BASEMENT") {
    // Subterranean building stratum / property volume
    baseColor = "#2563eb";
    edgeColor = "#93c5fd";
  } else if (feature.feature_type === "UNDERGROUND_UTILITY") {
    if (feature.utility_type === "WATER_SUPPLY") {
      baseColor = "#0284c7"; // Cyan-blue water pipe
      edgeColor = "#38bdf8";
    } else if (
      feature.utility_type === "TELECOMMUNICATIONS" ||
      feature.utility_type === "ELECTRICITY_POWER"
    ) {
      baseColor = "#d97706"; // Amber duct bank
      edgeColor = "#fbbf24";
    } else if (feature.utility_type === "SEWERAGE") {
      baseColor = "#84cc16"; // Lime/brown infrastructure
      edgeColor = "#a3e635";
    } else {
      baseColor = "#7c3aed"; // Violet
      edgeColor = "#a78bfa";
    }
  } else if (feature.feature_type === "SUBSURFACE_VOLUME") {
    baseColor = "#0d9488"; // Teal volume
    edgeColor = "#2dd4bf";
  }

  const opacity = cutawayMode ? 0.95 : 0.85;

  return (
    <group>
      {parts.map((part, idx) => (
        <Mesh3DObject
          key={`${feature.underground_feature_id}_part_${idx}`}
          part={part}
          isSelected={isSelected}
          isHovered={isHovered}
          isDimmed={isDimmed}
          isWireframe={isWireframe}
          color={baseColor}
          edgeColor={edgeColor}
          selectedColor="#f59e0b"
          selectedEdgeColor="#fde68a"
          opacity={opacity}
          onClick={() => onSelect?.(feature.underground_feature_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
