"use client";

import React, { useState } from "react";
import { Unit3DResult } from "@/types/cadastre";
import { Mesh3DObject } from "./Mesh3DObject";

export interface UnitObjectProps {
  unit: Unit3DResult;
  isSelected?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  explodeDistance?: number;
  onSelect?: (unitId: string) => void;
}

export function UnitObject({
  unit,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  explodeDistance = 0,
  onSelect,
}: UnitObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Optional vertical visual offset if exploded mode is active
  const zOffset = explodeDistance;
  const positionOffset: [number, number, number] = [0, 0, zOffset];

  const parts = unit.geometry?.parts ?? [];
  if (parts.length === 0) return null;

  return (
    <group>
      {parts.map((part, idx) => (
        <Mesh3DObject
          key={`${unit.unit_id}_part_${idx}`}
          part={part}
          isSelected={isSelected}
          isHovered={isHovered}
          isDimmed={isDimmed}
          isWireframe={isWireframe}
          color="#06b6d4"
          edgeColor="#22d3ee"
          selectedColor="#f59e0b"
          selectedEdgeColor="#fbbf24"
          opacity={0.85}
          positionOffset={positionOffset}
          onClick={() => onSelect?.(unit.unit_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
