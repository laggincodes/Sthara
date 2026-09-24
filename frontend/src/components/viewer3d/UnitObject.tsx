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
  floorIndex?: number;
  onSelect?: (unitId: string) => void;
}

export function UnitObject({
  unit,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  explodeDistance = 0,
  floorIndex,
  onSelect,
}: UnitObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Vertical visual offset synchronized with parent floor's exploded level
  const zOffset = (floorIndex !== undefined ? floorIndex : 0) * explodeDistance;
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
          color="#d97706"
          edgeColor="#f59e0b"
          selectedColor="#ea580c"
          selectedEdgeColor="#fed7aa"
          opacity={0.9}
          positionOffset={positionOffset}
          onClick={() => onSelect?.(unit.unit_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
