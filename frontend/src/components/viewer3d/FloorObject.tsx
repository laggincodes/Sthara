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
          color="#10b981"
          edgeColor="#34d399"
          selectedColor="#f59e0b"
          selectedEdgeColor="#fbbf24"
          opacity={0.8}
          positionOffset={positionOffset}
          onClick={() => onSelect?.(floor.floor_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
