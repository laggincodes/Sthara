"use client";

import React, { useState } from "react";
import { Building3DResult } from "@/types/cadastre";
import { Mesh3DObject } from "./Mesh3DObject";

export interface BuildingObjectProps {
  building: Building3DResult;
  isSelected?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  onSelect?: (buildingId: string) => void;
}

export function BuildingObject({
  building,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  onSelect,
}: BuildingObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  const parts = building.geometry?.parts ?? [];
  if (parts.length === 0) return null;

  return (
    <group>
      {parts.map((part, idx) => (
        <Mesh3DObject
          key={`${building.building_id}_part_${idx}`}
          part={part}
          isSelected={isSelected}
          isHovered={isHovered}
          isDimmed={isDimmed}
          isWireframe={isWireframe}
          color="#06b6d4"
          edgeColor="#22d3ee"
          selectedColor="#f59e0b"
          selectedEdgeColor="#fbbf24"
          opacity={0.7}
          onClick={() => onSelect?.(building.building_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
