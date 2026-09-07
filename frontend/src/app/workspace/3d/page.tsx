"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";
import { ParcelInspector } from "@/components/cadastral/ParcelInspector";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const Cadastral3DViewer = dynamic(
  () => import("@/components/viewer3d/Cadastral3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing 3D Cadastral Engine (Three.js / R3F)...</span>
      </div>
    ),
  }
);

export default function Cadastral3DPage() {
  const router = useRouter();
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const {
    isLoading,
    isSamplingElevation,
    isCalculatingHeight,
    isGeneratingFloors,
    isGenerating3D,
    isGeneratingFloors3D,
    isGeneratingProperty3D,
    generalError,
    elevationError,
    heightError,
    floorError,
    building3DError,
    floors3DError,
    property3DError,
    geojson,
    validationResult,
    associationData,
    demMetadata,
    building3DData,
    floors3DData,
    property3DData,
    units3DData,
    isGeneratingUnits3D,
    units3DError,
    ulpins3D,
    subView3D,
    setSubView3D,
    selectedFloorId,
    setSelectedFloorId,
    selectedPropertyId,
    setSelectedPropertyId,
    explodeDistance,
    setExplodeDistance,
    isolatedFloorIndex,
    setIsolatedFloorIndex,
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
    unitsGeojson,
    selectedUnitId,
    unitPropertyRecord,
    sampleActiveElevation,
    calculateSelectedBuildingHeight,
    generateSelectedBuildingFloors,
    generate3DBuildingModels,
    generate3DFloorModels,
    generate3DPropertyModels,
    generate3DUnitModels,
    setSelectedParcelId,
    setSelectedBuildingId,
    setSelectedUnitId,
  } = useCadastreContext();

  const crsString = validationResult?.crs || geojson?.crs?.properties?.name || "WGS 84 (EPSG:4326)";
  const hasAny3D = (building3DData && building3DData.summary.successful > 0) ||
    (floors3DData && floors3DData.summary.successful > 0) ||
    (property3DData && property3DData.summary.successful > 0) ||
    (units3DData && units3DData.summary.successful > 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* 3D Stage Top Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur px-4 py-2 text-xs font-mono shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-slate-200">3D CADASTRE STAGE</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Sub-view switcher */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setSubView3D("building")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "building"
                  ? "bg-cyan-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Building ({building3DData?.summary.successful || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubView3D("floors")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "floors"
                  ? "bg-purple-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Floors ({floors3DData?.summary.successful || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubView3D("property")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "property"
                  ? "bg-amber-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Property Vol ({property3DData?.summary.successful || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubView3D("units")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "units"
                  ? "bg-cyan-500 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Units ({units3DData?.summary.successful || 0})
            </button>
          </div>

          {/* Model Generation Buttons */}
          <div className="hidden xl:flex items-center gap-2">
            <button
              type="button"
              onClick={generate3DBuildingModels}
              disabled={isGenerating3D}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors disabled:opacity-50"
            >
              {isGenerating3D ? "Generating..." : "Gen Buildings"}
            </button>
            <button
              type="button"
              onClick={generate3DFloorModels}
              disabled={isGeneratingFloors3D}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors disabled:opacity-50"
            >
              {isGeneratingFloors3D ? "Generating..." : "Gen Floors"}
            </button>
            <button
              type="button"
              onClick={generate3DPropertyModels}
              disabled={isGeneratingProperty3D}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors disabled:opacity-50"
            >
              {isGeneratingProperty3D ? "Generating..." : "Gen Property Vol"}
            </button>
            <button
              type="button"
              onClick={generate3DUnitModels}
              disabled={isGeneratingUnits3D}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] transition-colors disabled:opacity-50"
            >
              {isGeneratingUnits3D ? "Generating..." : "Gen Units"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick 2D Switch */}
          <Link
            href="/workspace/2d"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 text-xs font-semibold font-sans transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to 2D Map</span>
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
      {(generalError || elevationError || heightError || floorError || building3DError || floors3DError || property3DError || units3DError) && (
        <div className="border-b border-red-500/30 bg-red-950/50 px-4 py-1.5 text-xs font-mono text-red-300 flex items-center justify-between shrink-0">
          <span>
            {generalError || elevationError || heightError || floorError || building3DError || floors3DError || property3DError || units3DError}
          </span>
        </div>
      )}

      {/* Main 3D Canvas Stage and Right Volumetric Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 h-full min-h-[350px] relative">
          <ErrorBoundary
            fallbackTitle="3D Cadastral Stage Fault"
            onReset={() => {
              setSubView3D("building");
            }}
          >
            <Cadastral3DViewer
              data={building3DData}
              floorsData={floors3DData}
              propertiesData={property3DData}
              unitsData={units3DData}
              subView={subView3D}
              onChangeSubView={setSubView3D}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={setSelectedBuildingId}
              selectedFloorId={selectedFloorId}
              onSelectFloor={setSelectedFloorId}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={setSelectedPropertyId}
              selectedUnitId={selectedUnitId}
              onSelectUnit={setSelectedUnitId}
              explodeDistance={explodeDistance}
              onChangeExplodeDistance={setExplodeDistance}
              isolatedFloorIndex={isolatedFloorIndex}
              onSelectIsolatedFloorIndex={setIsolatedFloorIndex}
              isLoading={isGenerating3D || isGeneratingFloors3D || isGeneratingProperty3D || isGeneratingUnits3D}
              onGenerate3D={generate3DBuildingModels}
              onGenerateFloors={generate3DFloorModels}
              onGenerateProperties={generate3DPropertyModels}
              onGenerateUnits={generate3DUnitModels}
              onSwitchTo2D={() => router.push("/workspace/2d")}
            />
          </ErrorBoundary>

          {/* Empty State Overlay */}
          {!hasAny3D && !isLoading && !isGenerating3D && !isGeneratingFloors3D && !isGeneratingProperty3D && !isGeneratingUnits3D && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F19]/80 backdrop-blur-[2px] p-6 text-center">
              <div className="max-w-md rounded-xl border border-slate-800 bg-[#111827]/90 p-8 shadow-2xl">
                <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-white mb-2">No 3D Models Generated</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Generate watertight 3D building meshes, stratified floor-level volumes, apartment units, and cadastral property volumes from active datasets.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={generate3DBuildingModels}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Generate Buildings
                  </button>
                  <button
                    type="button"
                    onClick={generate3DFloorModels}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Generate Floors
                  </button>
                  <button
                    type="button"
                    onClick={generate3DPropertyModels}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Generate Property Vol
                  </button>
                  <button
                    type="button"
                    onClick={generate3DUnitModels}
                    className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-400 px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Generate Units
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Volumetric & ULPIN Inspector */}
        {inspectorOpen && (
          <aside
            aria-label="3D Volumetric Inspector"
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
              onSwitchTo3D={() => setSubView3D("building")}
              onSwitchToFloors3D={() => setSubView3D("floors")}
              onSwitchToProperty3D={() => setSubView3D("property")}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
