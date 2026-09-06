"use client";

import React, { useState } from "react";
import { PropertyVolumeResult } from "@/types/cadastre";
import { Mesh3DObject } from "./Mesh3DObject";

export interface PropertyVolumeObjectProps {
  property: PropertyVolumeResult;
  isSelected?: boolean;
  isDimmed?: boolean;
  isWireframe?: boolean;
  onSelect?: (propertyId: string) => void;
}

export function PropertyVolumeObject({
  property,
  isSelected = false,
  isDimmed = false,
  isWireframe = false,
  onSelect,
}: PropertyVolumeObjectProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Each constituent part of the property volume represents an independent closed solid.
  // We strictly preserve independent detached buildings without false connections.
  const parts = property.geometry?.parts ?? [];
  if (parts.length === 0) return null;

  return (
    <group>
      {parts.map((part, idx) => (
        <Mesh3DObject
          key={`${property.property_id}_part_${idx}`}
          part={part}
          isSelected={isSelected}
          isHovered={isHovered}
          isDimmed={isDimmed}
          isWireframe={isWireframe}
          color="#8b5cf6"
          edgeColor="#a78bfa"
          selectedColor="#f59e0b"
          selectedEdgeColor="#fbbf24"
          opacity={0.8}
          onClick={() => onSelect?.(property.property_id)}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        />
      ))}
    </group>
  );
}
