"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import {
  Generate3DResponse,
  GenerateFloors3DResponse,
  GeneratePropertyVolumeResponse,
  GenerateUnits3DResponse,
} from "@/types/cadastre";
import { computeCollectionBounds, calculateCameraFit } from "@/lib/viewer3d/coordinates";

import { BuildingObject } from "./BuildingObject";
import { FloorObject } from "./FloorObject";
import { PropertyVolumeObject } from "./PropertyVolumeObject";
import { UnitObject } from "./UnitObject";
import { ViewerControls, ViewerLayers } from "./ViewerControls";
import { ViewerLegend } from "./ViewerLegend";
import { ViewerLoading } from "./ViewerLoading";
import { ViewerError } from "./ViewerError";

import { Mesh3D, Mesh3DCollection } from "@/types/geometry3d";

export interface Cadastral3DViewerProps {
  data: Generate3DResponse | null;
  floorsData?: GenerateFloors3DResponse | null;
  propertiesData?: GeneratePropertyVolumeResponse | null;
  unitsData?: GenerateUnits3DResponse | null;
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  selectedFloorId?: string | null;
  onSelectFloor?: (floorId: string | null) => void;
  selectedPropertyId?: string | null;
  onSelectProperty?: (propertyId: string | null) => void;
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
  subView?: "building" | "floors" | "property" | "units";
  onChangeSubView?: (mode: "building" | "floors" | "property" | "units") => void;
  explodeDistance?: number;
  onChangeExplodeDistance?: (val: number) => void;
  isolatedFloorIndex?: number | null;
  onSelectIsolatedFloorIndex?: (index: number | null) => void;
  isLoading?: boolean;
  onGenerate3D?: () => void;
  onGenerateFloors?: () => void;
  onGenerateProperties?: () => void;
  onGenerateUnits?: () => void;
  onSwitchTo2D?: () => void;
}

/**
 * Helper component inside Canvas that manages automatic camera framing.
 */
function CameraController({
  fitTrigger,
  bounds,
  controlsRef,
}: {
  fitTrigger: number;
  bounds: THREE.Box3;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (bounds.isEmpty()) return;

    const aspect = size.width / Math.max(size.height, 1);
    const fit = calculateCameraFit(bounds, 45, aspect);

    camera.position.set(fit.cameraPosition[0], fit.cameraPosition[1], fit.cameraPosition[2]);
    camera.lookAt(fit.center[0], fit.center[1], fit.center[2]);

    if (controlsRef.current) {
      controlsRef.current.target.set(fit.center[0], fit.center[1], fit.center[2]);
      controlsRef.current.update();
    }
  }, [bounds, fitTrigger, camera, size, controlsRef]);

  return null;
}

export function Cadastral3DViewer({
  data,
  floorsData,
  propertiesData,
  unitsData,
  selectedBuildingId,
  onSelectBuilding,
  selectedFloorId,
  onSelectFloor,
  selectedPropertyId,
  onSelectProperty,
  selectedUnitId,
  onSelectUnit,
  subView = "building",
  onChangeSubView,
  explodeDistance = 0,
  onChangeExplodeDistance,
  isLoading = false,
  onGenerate3D,
  onGenerateFloors,
  onGenerateProperties,
  onGenerateUnits,
  onSwitchTo2D,
}: Cadastral3DViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Suppress Three.js r185 THREE.Clock deprecation warning from upstream OrbitControls
  useEffect(() => {
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("THREE.Clock")) return;
      origWarn.apply(console, args);
    };
    return () => {
      console.warn = origWarn;
    };
  }, []);

  // View States
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [layers, setLayers] = useState<ViewerLayers>({
    buildings: true,
    floors: true,
    properties: true,
    units: true,
    grid: true,
  });
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  const handleSubViewChange = (mode: "building" | "floors" | "property" | "units") => {
    onChangeSubView?.(mode);
  };

  const handleExplodeChange = (val: number) => {
    onChangeExplodeDistance?.(val);
  };

  const handleToggleLayer = (layer: keyof ViewerLayers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Compute aggregate visual bounding box for active dataset
  const activeBounds = useMemo(() => {
    const geometriesToBound: (Mesh3D | Mesh3DCollection)[] = [];

    if (subView === "building" && data?.results) {
      data.results.forEach((b) => {
        if (b.geometry) geometriesToBound.push(b.geometry);
      });
    } else if (subView === "floors" && floorsData?.results) {
      floorsData.results.forEach((bf) => {
        bf.floors.forEach((f) => {
          if (f.geometry) geometriesToBound.push(f.geometry);
        });
      });
    } else if (subView === "property" && propertiesData?.results) {
      propertiesData.results.forEach((p) => {
        if (p.geometry) geometriesToBound.push(p.geometry);
      });
    } else if (subView === "units" && unitsData?.results) {
      unitsData.results.forEach((u) => {
        if (u.geometry) geometriesToBound.push(u.geometry);
      });
    }

    return computeCollectionBounds(geometriesToBound);
  }, [subView, data, floorsData, propertiesData, unitsData]);

  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setFitTrigger((prev) => prev + 1);
  }, []);

  const handleFitView = useCallback(() => {
    setFitTrigger((prev) => prev + 1);
  }, []);

  // Check Empty & Error States
  const hasBuildingData = Boolean(data?.results && data.results.length > 0);
  const hasFloorsData = Boolean(floorsData?.results && floorsData.results.length > 0);
  const hasPropertiesData = Boolean(propertiesData?.results && propertiesData.results.length > 0);
  const hasUnitsData = Boolean(unitsData?.results && unitsData.results.length > 0);

  const hasAnyData = hasBuildingData || hasFloorsData || hasPropertiesData || hasUnitsData;

  if (!isLoading && !hasAnyData) {
    return (
      <div className="relative w-full h-full min-h-[480px] bg-[#0B0F19]">
        <ViewerError
          kind="NO_GEOMETRY"
          title="No 3D Models Available"
          message="Extrude 3D building envelopes, stratified floor levels, apartment units, or property volumes from the 2D cadastral layers."
          onRetry={
            subView === "floors"
              ? onGenerateFloors || onGenerate3D
              : subView === "property"
              ? onGenerateProperties || onGenerate3D
              : subView === "units"
              ? onGenerateUnits || onGenerate3D
              : onGenerate3D
          }
          onSwitchTo2D={onSwitchTo2D}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#0B0F19] overflow-hidden select-none">
      {/* 1. View & Navigation Controls Overlay */}
      <ViewerControls
        subView={subView}
        onChangeSubView={handleSubViewChange}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        isWireframe={isWireframe}
        onToggleWireframe={() => setIsWireframe((prev) => !prev)}
        explodeDistance={explodeDistance}
        onChangeExplodeDistance={handleExplodeChange}
        onResetView={handleResetCamera}
        onFitView={handleFitView}
        onSwitchTo2D={onSwitchTo2D}
        hasFloorsData={hasFloorsData}
        hasPropertiesData={hasPropertiesData}
        hasUnitsData={hasUnitsData}
      />

      {/* 2. Loading State Overlay */}
      {isLoading && <ViewerLoading />}

      {/* 3. Entity Legend */}
      <ViewerLegend />

      {/* 4. Core React Three Fiber Canvas */}
      <Canvas
        camera={{
          position: [35, -35, 25],
          fov: 45,
          up: [0, 0, 1], // Z-up orientation matching GIS standard
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
          });
        }}
        className="w-full h-full"
      >
        {/* Neutral Professional Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[40, -50, 60]} intensity={1.2} />
        <directionalLight position={[-40, 50, -20]} intensity={0.35} />

        {/* Orbit Controls (Z-up compatible) */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={500}
          maxPolarAngle={Math.PI / 2 + 0.1} // Prevent looking completely from underside
        />

        {/* Dynamic Camera Fitting */}
        <CameraController
          fitTrigger={fitTrigger}
          bounds={activeBounds}
          controlsRef={controlsRef}
        />

        {/* Ground Plane Datum Grid (XY plane at Z=0) */}
        {layers.grid && (
          <group position={[0, 0, -0.01]}>
            <gridHelper
              args={[120, 24, "#1e293b", "#0f172a"]}
              rotation={[Math.PI / 2, 0, 0]} // Rotate from XZ to XY plane
            />
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE A: Building Envelope View */}
        {/* ------------------------------------------------------------- */}
        {subView === "building" &&
          layers.buildings &&
          data?.results?.map((b) => (
            <BuildingObject
              key={b.building_id}
              building={b}
              isSelected={selectedBuildingId === b.building_id}
              isDimmed={Boolean(selectedBuildingId && selectedBuildingId !== b.building_id)}
              isWireframe={isWireframe}
              onSelect={(id) => onSelectBuilding(id === selectedBuildingId ? null : id)}
            />
          ))}

        {/* ------------------------------------------------------------- */}
        {/* MODE B: Stratified Floor Level View */}
        {/* ------------------------------------------------------------- */}
        {subView === "floors" &&
          layers.floors &&
          floorsData?.results?.map((bf) => (
            <group key={bf.building_id}>
              {bf.floors.map((floor) => (
                <FloorObject
                  key={floor.floor_id}
                  floor={floor}
                  isSelected={selectedFloorId === floor.floor_id}
                  isDimmed={Boolean(selectedFloorId && selectedFloorId !== floor.floor_id)}
                  isWireframe={isWireframe}
                  explodeDistance={explodeDistance}
                  onSelect={(id) => {
                    onSelectFloor?.(id === selectedFloorId ? null : id);
                    if (bf.building_id !== selectedBuildingId) {
                      onSelectBuilding(bf.building_id);
                    }
                  }}
                />
              ))}
            </group>
          ))}

        {/* ------------------------------------------------------------- */}
        {/* MODE C: 3D Property Volume View */}
        {/* ------------------------------------------------------------- */}
        {subView === "property" &&
          layers.properties &&
          propertiesData?.results?.map((prop) => (
            <PropertyVolumeObject
              key={prop.property_id}
              property={prop}
              isSelected={selectedPropertyId === prop.property_id}
              isDimmed={Boolean(selectedPropertyId && selectedPropertyId !== prop.property_id)}
              isWireframe={isWireframe}
              onSelect={(id) => {
                onSelectProperty?.(id === selectedPropertyId ? null : id);
                if (prop.building_id && prop.building_id !== selectedBuildingId) {
                  onSelectBuilding(prop.building_id);
                }
              }}
            />
          ))}

        {/* ------------------------------------------------------------- */}
        {/* MODE D: 3D Unit / Apartment View */}
        {/* ------------------------------------------------------------- */}
        {subView === "units" &&
          layers.units &&
          unitsData?.results?.map((u) => (
            <UnitObject
              key={u.unit_id}
              unit={u}
              isSelected={selectedUnitId === u.unit_id}
              isDimmed={Boolean(selectedUnitId && selectedUnitId !== u.unit_id)}
              isWireframe={isWireframe}
              explodeDistance={explodeDistance}
              onSelect={(id) => {
                onSelectUnit?.(id === selectedUnitId ? null : id);
                if (u.building_id && u.building_id !== selectedBuildingId) {
                  onSelectBuilding(u.building_id);
                }
              }}
            />
          ))}
      </Canvas>
    </div>
  );
}

export default Cadastral3DViewer;

