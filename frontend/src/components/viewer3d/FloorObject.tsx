"use client";

import React, { useState } from "react";
import { Floor3DResult } from "@/types/cadastre";
import { Mesh3DObject } from "./Mesh3DObject";

export interface FloorObjectProps {
  floor: Floor3DResult;
  isSelected?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  explodeDistance?: number;
  onSelect?: (floorId: string) => void;
}

export function FloorObject({
  floor,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  explodeDistance = 0,
  onSelect,
}: FloorObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Exploded View: Pure rendering offset along Z-axis (local vertical in Z-up).
  // Never mutates canonical coordinates or stored elevations.
  const zOffset = (floor.floor_index ?? 0) * explodeDistance;
  const positionOffset: [number, number, number] = [0, 0, zOffset];

  const parts = floor.geometry?.parts ?? [];
  if (parts.length === 0) return null;

  const isBasement =
    floor.level_type === "Basement" || (floor.floor_index !== undefined && floor.floor_index < 0);

  // Distinct chromatic styling: Subterranean Basements = Subsurface Blue; Above Ground = Stratified Emerald
  const floorColor = isBasement
    ? "#3b82f6"
    : (floor.floor_index ?? 0) % 2 === 0
    ? "#10b981"
    : "#059669";
  const floorEdgeColor = isBasement ? "#60a5fa" : "#34d399";

  return (
    <group>
      {parts.map((part, idx) => (
        <Mesh3DObject
          key={`${floor.floor_id}_part_${idx}`}
          part={part}
          isSelected={isSelected}
          isHovered={isHovered}
          isDimmed={isDimmed}
          isWireframe={isWireframe}
          color={floorColor}
          edgeColor={floorEdgeColor}
          selectedColor="#f59e0b"
          selectedEdgeColor="#fbbf24"
          opacity={isBasement ? 0.85 : 0.8}
          positionOffset={positionOffset}
          onClick={() => onSelect?.(floor.floor_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
