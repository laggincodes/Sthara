"use client";

import React, { useState, useMemo } from "react";
import { GeoJSONFeatureCollection, GeoJSONFeature } from "@/types/cadastre";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";
import { CadastralMap } from "@/components/cadastral/CadastralMap";
import { ParcelInspector } from "@/components/cadastral/ParcelInspector";

export default function Cadastral2DPage() {
  const router = useRouter();
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const {
    isLoading,
    isAssociating,
    isSamplingElevation,
    isCalculatingHeight,
    isGeneratingFloors,
    generalError,
    associationError,
    elevationError,
    heightError,
    floorError,
    geojson,
    buildingsGeojson,
    unitsGeojson,
    validationResult,
    associationData,
    demMetadata,
    property3DData,
    ulpins3D,
    selectedParcelId,
    selectedParcel,
    selectedBuildingId,
    selectedBuilding,
    selectedParcelAssociatedBuildings,
    selectedParcelElevation,
    selectedBuildingElevation,
    selectedBuildingHeight,
    selectedBuildingFloors,
    selectedBuildingSpec,
    selectedBuilding3D,
    selectedBuildingFloors3D,
    selectedFloorId,
    selectedPropertyId,
    selectedUnitId,
    unitPropertyRecord,
    layerVisibility,
    toggleLayer,
    loadDemoParcels,
    loadDemoBuildings,
    loadRealOSMBuildings,
    loadDemoUnits,
    sampleActiveElevation,
    calculateSelectedBuildingHeight,
    generateSelectedBuildingFloors,
    setSelectedParcelId,
    setSelectedBuildingId,
    setSelectedFloorId,
    setSelectedPropertyId,
    setSelectedUnitId,
    setSubView3D,
    undergroundBundle,
    selectedUndergroundId,
    setSelectedUndergroundId,
    loadDemoUnderground,
    topologyData,
    isAuditingTopology,
    runTopologyAudit,
    loadDemoTopology,
  } = useCadastreContext();

  const undergroundGeojson: GeoJSONFeatureCollection | null = useMemo(() => {
    if (!undergroundBundle || !undergroundBundle.features) return null;
    return {
      type: "FeatureCollection",
      features: undergroundBundle.features.map((feat) => ({
        type: "Feature",
        id: feat.underground_feature_id,
        geometry: (feat.geometry_2d as GeoJSONFeature["geometry"]) || { type: "Polygon", coordinates: [] },
        properties: {
          underground_feature_id: feat.underground_feature_id,
          name: feat.name,
          feature_type: feat.feature_type,
          utility_type: feat.utility_type,
          depth_to_top_m: feat.depth_to_top_m,
          depth_to_base_m: feat.depth_to_base_m,
          is_cadastral_property: feat.is_cadastral_property,
        },
      })),
    };
  }, [undergroundBundle]);

  const crsString = validationResult?.crs || geojson?.crs?.properties?.name || "WGS 84 (EPSG:4326)";
  const hasData = (geojson && geojson.features.length > 0) || (buildingsGeojson && buildingsGeojson.features.length > 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* 2D Map Control Sub-Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur px-4 py-2 text-xs font-mono shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-200">2D CADASTRAL GIS</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Layer toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleLayer("parcels")}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                layerVisibility.parcels
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              Parcels ({geojson?.features?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => toggleLayer("buildings")}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                layerVisibility.buildings
                  ? "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              Buildings ({buildingsGeojson?.features?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => toggleLayer("units")}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                layerVisibility.units
                  ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              Units ({unitsGeojson?.features?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!undergroundBundle) loadDemoUnderground();
                toggleLayer("underground");
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                layerVisibility.underground
                  ? "bg-blue-950/80 text-blue-300 border border-blue-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              Subsurface ({undergroundBundle?.total_features || 0})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick 3D Switch */}
          <Link
            href="/workspace/3d"
            className="flex items-center gap-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 px-3 py-1 text-xs font-semibold font-sans transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>Open 3D Stage</span>
          </Link>

          {/* Inspector Toggle */}
          <button
            type="button"
            onClick={() => setInspectorOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 text-xs font-sans transition-colors"
            title={inspectorOpen ? "Hide Inspector" : "Show Inspector"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span>{inspectorOpen ? "Hide" : "Inspect"}</span>
          </button>
        </div>
      </div>

      {/* Error banner if any */}
      {(generalError || associationError || elevationError || heightError || floorError) && (
        <div className="border-b border-red-500/30 bg-red-950/50 px-4 py-1.5 text-xs font-mono text-red-300 flex items-center justify-between shrink-0">
          <span>{generalError || associationError || elevationError || heightError || floorError}</span>
        </div>
      )}

      {/* Main Map Stage and Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* MapLibre Canvas Container */}
        <div className="flex-1 h-full min-h-[350px] relative">
          <CadastralMap
            geojson={geojson}
            buildingsGeojson={buildingsGeojson}
            unitsGeojson={unitsGeojson}
            undergroundGeojson={undergroundGeojson}
            selectedParcelId={selectedParcelId}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            selectedUndergroundId={selectedUndergroundId}
            onSelectParcel={setSelectedParcelId}
            onSelectBuilding={setSelectedBuildingId}
            onSelectUnit={setSelectedUnitId}
            onSelectUnderground={setSelectedUndergroundId}
            layerVisibility={layerVisibility}
            onToggleLayer={toggleLayer}
            isActive={true}
          />

          {/* Empty State Overlay */}
          {!hasData && !isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F19]/80 backdrop-blur-[2px] p-6 text-center">
              <div className="max-w-md rounded-xl border border-slate-800 bg-[#111827]/90 p-8 shadow-2xl">
                <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-white mb-2">No 2D Data Loaded</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Load synthetic cadastral parcels, building footprints, or real OpenStreetMap data to visualize boundaries.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={loadDemoParcels}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Load Parcels
                  </button>
                  <button
                    type="button"
                    onClick={loadDemoBuildings}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Load Buildings
                  </button>
                  <button
                    type="button"
                    onClick={loadRealOSMBuildings}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Load Real OSM
                  </button>
                  <button
                    type="button"
                    onClick={loadDemoUnits}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Load Units
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator Overlay */}
          {(isLoading || isAssociating) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0B0F19]/60 backdrop-blur-[1px]">
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-xl flex items-center gap-3 text-xs font-mono text-slate-200">
                <span className="h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>{isAssociating ? "Running spatial association..." : "Loading 2D dataset..."}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Dock */}
        {inspectorOpen && (
          <aside
            aria-label="2D Cadastral Inspector"
            className="w-full lg:w-[380px] shrink-0 h-full overflow-y-auto bg-[#111827]/80 border-l border-slate-800/80"
          >
            <ParcelInspector
              selectedParcel={selectedParcel}
              selectedBuilding={selectedBuilding}
              associatedBuildingIds={selectedParcelAssociatedBuildings}
              associationSummary={associationData?.summary}
              crs={crsString}
              parcelElevation={selectedParcelElevation}
              buildingElevation={selectedBuildingElevation}
              buildingHeight={selectedBuildingHeight}
              buildingFloors={selectedBuildingFloors}
              buildingSpec={selectedBuildingSpec}
              building3D={selectedBuilding3D}
              buildingFloors3D={selectedBuildingFloors3D}
              properties3D={property3DData?.results}
              ulpins3D={ulpins3D}
              units={unitsGeojson?.features?.map((f) => f.properties)}
              selectedFloorId={selectedFloorId}
              selectedPropertyId={selectedPropertyId}
              selectedUnitId={selectedUnitId}
              unitPropertyRecord={unitPropertyRecord}
              demMetadata={demMetadata}
              isSamplingElevation={isSamplingElevation}
              isCalculatingHeight={isCalculatingHeight}
              isGeneratingFloors={isGeneratingFloors}
              onSelectParcelId={setSelectedParcelId}
              onSelectBuildingId={setSelectedBuildingId}
              onSelectFloorId={setSelectedFloorId}
              onSelectPropertyId={setSelectedPropertyId}
              onSelectUnitId={setSelectedUnitId}
              onSampleElevation={sampleActiveElevation}
              onCalculateHeight={calculateSelectedBuildingHeight}
              onGenerateFloors={generateSelectedBuildingFloors}
              onSwitchTo3D={() => {
                setSubView3D("building");
                router.push("/workspace/3d");
              }}
              onSwitchToFloors3D={() => {
                setSubView3D("floors");
                router.push("/workspace/3d");
              }}
              onSwitchToProperty3D={() => {
                setSubView3D("property");
                router.push("/workspace/3d");
              }}
              topologyData={topologyData}
              isAuditingTopology={isAuditingTopology}
              onRunTopologyAudit={runTopologyAudit}
              onLoadDemoTopology={loadDemoTopology}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
