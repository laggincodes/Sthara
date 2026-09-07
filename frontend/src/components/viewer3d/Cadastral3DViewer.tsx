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
  DemoUndergroundResponse,
} from "@/types/cadastre";
import { computeCollectionBounds, calculateCameraFit } from "@/lib/viewer3d/coordinates";

import { BuildingObject } from "./BuildingObject";
import { FloorObject } from "./FloorObject";
import { PropertyVolumeObject } from "./PropertyVolumeObject";
import { UnitObject } from "./UnitObject";
import { UndergroundObject } from "./UndergroundObject";
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
  undergroundData?: DemoUndergroundResponse | null;
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  selectedFloorId?: string | null;
  onSelectFloor?: (floorId: string | null) => void;
  selectedPropertyId?: string | null;
  onSelectProperty?: (propertyId: string | null) => void;
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
  selectedUndergroundId?: string | null;
  onSelectUnderground?: (featureId: string | null) => void;
  subView?: "building" | "floors" | "property" | "units" | "underground";
  onChangeSubView?: (mode: "building" | "floors" | "property" | "units" | "underground") => void;
  cutawayMode?: boolean;
  onToggleCutaway?: () => void;
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
  undergroundData,
  selectedBuildingId,
  onSelectBuilding,
  selectedFloorId,
  onSelectFloor,
  selectedPropertyId,
  onSelectProperty,
  selectedUnitId,
  onSelectUnit,
  selectedUndergroundId,
  onSelectUnderground,
  subView = "building",
  onChangeSubView,
  cutawayMode = false,
  onToggleCutaway,
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
    underground: true,
    grid: true,
  });
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  const handleSubViewChange = (mode: "building" | "floors" | "property" | "units" | "underground") => {
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
    } else if (subView === "underground" && undergroundData?.features) {
      undergroundData.features.forEach((feat) => {
        if (feat.mesh_3d) geometriesToBound.push(feat.mesh_3d);
      });
    }

    if (geometriesToBound.length === 0) {
      return new THREE.Box3(new THREE.Vector3(-30, -30, -10), new THREE.Vector3(30, 30, 50));
    }

    return computeCollectionBounds(geometriesToBound);
  }, [data, floorsData, propertiesData, unitsData, undergroundData, subView]);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current) return;
    controlsRef.current.reset();
    setFitTrigger((c) => c + 1);
  }, []);

  const handleFitCamera = useCallback(() => {
    setFitTrigger((c) => c + 1);
  }, []);

  const hasFloors = Boolean(floorsData && floorsData.results.length > 0);
  const hasProperties = Boolean(propertiesData && propertiesData.results.length > 0);
  const hasUnits = Boolean(unitsData && unitsData.results.length > 0);
  const hasUnderground = Boolean(undergroundData && undergroundData.features.length > 0);

  const selectedUndergroundFeature = useMemo(() => {
    if (!undergroundData || !selectedUndergroundId) return null;
    return (
      undergroundData.features.find(
        (f) => f.underground_feature_id === selectedUndergroundId
      ) ?? null
    );
  }, [undergroundData, selectedUndergroundId]);

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] overflow-hidden select-none">
      {/* HUD Controls */}
      <ViewerControls
        subView={subView}
        onChangeSubView={handleSubViewChange}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        isWireframe={isWireframe}
        onToggleWireframe={() => setIsWireframe((w) => !w)}
        cutawayMode={cutawayMode}
        onToggleCutaway={onToggleCutaway}
        explodeDistance={explodeDistance}
        onChangeExplodeDistance={handleExplodeChange}
        onResetView={handleResetCamera}
        onFitView={handleFitCamera}
        onSwitchTo2D={onSwitchTo2D}
        hasFloorsData={hasFloors}
        hasPropertiesData={hasProperties}
        hasUnitsData={hasUnits}
        hasUndergroundData={hasUnderground}
      />

      {/* Cadastral Category Legend */}
      <ViewerLegend />

      {/* Loading Overlay */}
      {isLoading && <ViewerLoading message="Generating 3D cadastral geometries..." />}

      {/* Empty States / Direct Action Prompts */}
      {!isLoading && subView === "building" && (!data || data.results.length === 0) && (
        <ViewerError
          title="No 3D Buildings Generated"
          message="Run 3D extrusion to generate canonical watertight solid models from 2D footprints."
          onRetry={onGenerate3D}
        />
      )}

      {!isLoading && subView === "floors" && !hasFloors && (
        <ViewerError
          title="No 3D Floor Strata Generated"
          message="Floors must be stratified before 3D floor slabs can be visualized."
          onRetry={onGenerateFloors}
        />
      )}

      {!isLoading && subView === "property" && !hasProperties && (
        <ViewerError
          title="No 3D Property Volumes Generated"
          message="Property volumes model legal 3D spaces bounded by floor strata and parcel extents."
          onRetry={onGenerateProperties}
        />
      )}

      {!isLoading && subView === "units" && !hasUnits && (
        <ViewerError
          title="No 3D Unit Volumes Available"
          message="Generate 3D unit solids to inspect individual apartment parcels with canonical 3D geometry."
          onRetry={onGenerateUnits}
        />
      )}

      {/* Selected Underground Feature Inspector Overlay */}
      {selectedUndergroundFeature && (
        <div className="absolute bottom-4 right-4 z-20 w-80 rounded-xl border border-slate-700/80 bg-[#111827]/95 p-4 shadow-2xl backdrop-blur-md text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${selectedUndergroundFeature.feature_type === "BASEMENT" ? "bg-blue-400" : "bg-amber-400"}`} />
              <span className="font-mono font-bold text-white text-sm">
                {selectedUndergroundFeature.underground_feature_id}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectUnderground?.(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              ✕
            </button>
          </div>
          <div>
            <div className="text-[11px] text-slate-300 font-medium">
              {selectedUndergroundFeature.name}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Type: {selectedUndergroundFeature.feature_type} {selectedUndergroundFeature.utility_type ? `(${selectedUndergroundFeature.utility_type})` : ""}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-slate-900/80 border border-slate-800 font-mono text-[10px]">
            <div>
              <span className="text-slate-500 block">Z Interval:</span>
              <span className="text-cyan-400 font-semibold">{selectedUndergroundFeature.base_elevation_m}m - {selectedUndergroundFeature.top_elevation_m}m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Depth Horizon:</span>
              <span className="text-emerald-400 font-semibold">{selectedUndergroundFeature.depth_to_top_m}m - {selectedUndergroundFeature.depth_to_base_m}m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Thickness:</span>
              <span className="text-slate-300">{selectedUndergroundFeature.thickness_m}m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Property Title:</span>
              <span className={selectedUndergroundFeature.is_cadastral_property ? "text-blue-400 font-semibold" : "text-amber-400"}>
                {selectedUndergroundFeature.is_cadastral_property ? "Private Volume" : "Public Conduit"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Canvas */}
      <Canvas
        camera={{
          position: [0, -60, 45],
          up: [0, 0, 1], // Strict Z-up Cadastral Coordinate Convention
          fov: 45,
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
        {/* Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[40, -50, 60]} intensity={1.2} />
        <directionalLight position={[-40, 50, -20]} intensity={0.35} />

        {/* Orbit Controls (Z-up compatible with unrestricted polar angle in underground/cutaway mode) */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={500}
          maxPolarAngle={subView === "underground" || cutawayMode ? Math.PI : Math.PI / 2 + 0.1}
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
              rotation={[Math.PI / 2, 0, 0]}
            />
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE A: Building Envelope View */}
        {/* ------------------------------------------------------------- */}
        {(subView === "building" || cutawayMode) &&
          layers.buildings &&
          data?.results?.map((b) => (
            <BuildingObject
              key={b.building_id}
              building={b}
              isSelected={selectedBuildingId === b.building_id}
              isDimmed={Boolean((selectedBuildingId && selectedBuildingId !== b.building_id) || cutawayMode)}
              isWireframe={isWireframe || cutawayMode}
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

        {/* ------------------------------------------------------------- */}
        {/* MODE E: Underground / Subsurface Assets (Step 20) */}
        {/* ------------------------------------------------------------- */}
        {(subView === "underground" || cutawayMode || layers.underground) &&
          undergroundData?.features?.map((feat) => (
            <UndergroundObject
              key={feat.underground_feature_id}
              feature={feat}
              isSelected={selectedUndergroundId === feat.underground_feature_id}
              isDimmed={Boolean(selectedUndergroundId && selectedUndergroundId !== feat.underground_feature_id)}
              isWireframe={isWireframe}
              cutawayMode={cutawayMode}
              onSelect={(id) => onSelectUnderground?.(id === selectedUndergroundId ? null : id)}
            />
          ))}
      </Canvas>
    </div>
  );
}

export default Cadastral3DViewer;
