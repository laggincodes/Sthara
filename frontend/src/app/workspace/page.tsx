"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { useCadastre } from "@/hooks/useCadastre";
import { CadastralMap } from "@/components/cadastral/CadastralMap";
import { WorkspaceHeader } from "@/components/cadastral/WorkspaceHeader";
import { ParcelInspector } from "@/components/cadastral/ParcelInspector";
import { ValidationCard } from "@/components/cadastral/ValidationCard";
import { PipelineStatus } from "@/components/cadastral/PipelineStatus";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const Cadastral3DViewer = dynamic(
  () => import("@/components/viewer3d/Cadastral3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing 3D Cadastral Stage...</span>
      </div>
    ),
  }
);

export default function WorkspacePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPipelineStatus, setShowPipelineStatus] = React.useState<boolean>(true);

  const {
    backendConnected,
    isLoading,
    isValidating,
    isAssociating,
    isSamplingElevation,
    isCalculatingHeight,
    isGeneratingFloors,
    isGenerating3D,
    isGeneratingFloors3D,
    isGeneratingProperty3D,
    generalError,
    validationError,
    associationError,
    elevationError,
    heightError,
    floorError,
    building3DError,
    floors3DError,
    property3DError,
    geojson,
    buildingsGeojson,
    validationResult,
    associationData,
    demMetadata,
    building3DData,
    floors3DData,
    property3DData,
    ulpins3D,
    viewMode,
    setViewMode,
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
    activeDatasetName,
    buildingDatasetName,
    layerVisibility,
    toggleLayer,
    loadDemoParcels,
    loadDemoBuildings,
    loadRealOSMBuildings,
    uploadGeoJson,
    runValidation,
    runBuildingAssociation,
    sampleActiveElevation,
    calculateSelectedBuildingHeight,
    generateSelectedBuildingFloors,
    generate3DBuildingModels,
    generate3DFloorModels,
    generate3DPropertyModels,
    setSelectedParcelId,
    setSelectedBuildingId,
    isDemoRunning,
    runEndToEndDemo,
    resetDemo,
    pipelineSteps,
  } = useCadastre();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadGeoJson(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const crsString = validationResult?.crs || geojson?.crs?.properties?.name || "WGS 84 (EPSG:4326)";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0F19] text-slate-100 font-sans">
      {/* Hidden File Input for GeoJSON Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        aria-label="Upload GeoJSON File"
      />

      {/* Top Header Bar */}
      <WorkspaceHeader
        backendConnected={backendConnected}
        isLoading={isLoading}
        isAssociating={isAssociating}
        isSamplingElevation={isSamplingElevation}
        isDemoRunning={isDemoRunning}
        onRunDemo={runEndToEndDemo}
        onResetDemo={resetDemo}
        showPipelineStatus={showPipelineStatus}
        onTogglePipelineStatus={() => setShowPipelineStatus((prev) => !prev)}
        isGenerating3D={isGenerating3D}
        onGenerateFloors3D={generate3DFloorModels}
        isGeneratingFloors3D={isGeneratingFloors3D}
        onGenerateProperty3D={generate3DPropertyModels}
        isGeneratingProperty3D={isGeneratingProperty3D}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onLoadDemoParcels={loadDemoParcels}
        onLoadDemoBuildings={loadDemoBuildings}
        onLoadRealOSMBuildings={loadRealOSMBuildings}
        onUploadClick={() => fileInputRef.current?.click()}
        onRunValidation={runValidation}
        onRunAssociation={runBuildingAssociation}
        onSampleElevation={sampleActiveElevation}
        onGenerate3D={generate3DBuildingModels}
        hasParcels={!!geojson && geojson.features.length > 0}
        hasBuildings={!!buildingsGeojson && buildingsGeojson.features.length > 0}
        has3DData={!!building3DData && building3DData.summary.successful > 0}
        hasFloors3DData={!!floors3DData && floors3DData.summary.successful > 0}
        hasProperty3DData={!!property3DData && property3DData.summary.successful > 0}
        activeDatasetName={activeDatasetName}
        buildingDatasetName={buildingDatasetName}
      />

      {/* End-to-End Pipeline Audit Status Bar */}
      {showPipelineStatus && (
        <PipelineStatus
          steps={pipelineSteps}
          isDemoRunning={isDemoRunning}
          onRunDemo={runEndToEndDemo}
          onResetDemo={resetDemo}
        />
      )}

      {/* General Alert / Error Banner */}
      {(generalError || associationError || elevationError || heightError || floorError || building3DError || floors3DError || property3DError) && (
        <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-xs font-mono text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>
              {generalError || associationError || elevationError || heightError || floorError || building3DError || floors3DError || property3DError}
            </span>
          </div>
          <span className="text-[11px] text-red-400/80">
            Ensure FastAPI server is running on :8000
          </span>
        </div>
      )}

      {/* Main Workspace Stage */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        {/* Left: 2D Cadastral Map / 3D Cadastre Viewport (Flex 1) */}
        <section
          aria-label={viewMode === "3d" ? "3D Cadastral Stage Viewport" : "2D Cadastral Map Viewport"}
          className="flex-1 h-full min-h-[350px] relative border-b lg:border-b-0 lg:border-r border-slate-800"
        >
          {/* Dynamic 2D / 3D Viewport Component */}
          {viewMode === "3d" ? (
            <ErrorBoundary
              fallbackTitle="3D Cadastral Stage Fault"
              onReset={() => {
                setViewMode("2d");
              }}
            >
              <Cadastral3DViewer
              data={building3DData}
              floorsData={floors3DData}
              propertiesData={property3DData}
              subView={subView3D}
              onChangeSubView={setSubView3D}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={setSelectedBuildingId}
              selectedFloorId={selectedFloorId}
              onSelectFloor={setSelectedFloorId}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={setSelectedPropertyId}
              explodeDistance={explodeDistance}
              onChangeExplodeDistance={setExplodeDistance}
              isolatedFloorIndex={isolatedFloorIndex}
              onSelectIsolatedFloorIndex={setIsolatedFloorIndex}
              isLoading={isGenerating3D || isGeneratingFloors3D || isGeneratingProperty3D}
              onGenerate3D={generate3DBuildingModels}
              onGenerateFloors={generate3DFloorModels}
              onGenerateProperties={generate3DPropertyModels}
              onSwitchTo2D={() => setViewMode("2d")}
            />
            </ErrorBoundary>
          ) : (
            <CadastralMap
              geojson={geojson}
              buildingsGeojson={buildingsGeojson}
              selectedParcelId={selectedParcelId}
              selectedBuildingId={selectedBuildingId}
              onSelectParcel={setSelectedParcelId}
              onSelectBuilding={setSelectedBuildingId}
              layerVisibility={layerVisibility}
              onToggleLayer={toggleLayer}
            />
          )}

          {/* Empty State Overlay when no dataset is loaded */}
          {(!geojson || geojson.features.length === 0) &&
            (!buildingsGeojson || buildingsGeojson.features.length === 0) &&
            !isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F19]/75 backdrop-blur-[2px] p-6 text-center">
                <div className="max-w-md rounded-xl border border-slate-800 bg-[#111827]/90 p-8 shadow-2xl">
                  <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
                    <svg
                      className="h-6 w-6 stroke-current"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-white mb-2">
                    No Cadastral Layer Active
                  </h2>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Load the synthetic parcel & building datasets or upload your own GeoJSON file to inspect 2D cadastral boundaries, analyze building relationships, and run topological validation.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={loadDemoParcels}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                    >
                      Load Demo Parcels
                    </button>
                    <button
                      type="button"
                      onClick={loadDemoBuildings}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                    >
                      Load Demo Buildings
                    </button>
                    <button
                      type="button"
                      onClick={loadRealOSMBuildings}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold text-amber-200 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                      title="Load real-world OpenStreetMap footprints (155 buildings, New Delhi)"
                    >
                      Load Real OSM (Delhi)
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
                    >
                      Upload File
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
                <span>
                  {isAssociating
                    ? "Running deterministic spatial relationship analysis..."
                    : "Loading geospatial dataset..."}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Right: Analytical Inspector Dock (Width: 380px) */}
        <aside
          aria-label="Cadastral Inspector Panel"
          className="w-full lg:w-[380px] shrink-0 h-full overflow-y-auto bg-[#111827]/70 border-l border-slate-800/80 divide-y divide-slate-800"
        >
          {/* Section 1: Validation Status */}
          <div className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 font-semibold">
              Spatial Validation Analysis
            </div>
            <ValidationCard
              validation={validationResult}
              isValidating={isValidating}
              validationError={validationError}
            />
          </div>

          {/* Section 2: Selected Parcel / Building Inspector */}
          <div className="flex-1">
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
              selectedFloorId={selectedFloorId}
              selectedPropertyId={selectedPropertyId}
              demMetadata={demMetadata}
              isSamplingElevation={isSamplingElevation}
              isCalculatingHeight={isCalculatingHeight}
              isGeneratingFloors={isGeneratingFloors}
              onSelectParcelId={setSelectedParcelId}
              onSelectBuildingId={setSelectedBuildingId}
              onSelectFloorId={setSelectedFloorId}
              onSelectPropertyId={setSelectedPropertyId}
              onSampleElevation={sampleActiveElevation}
              onCalculateHeight={calculateSelectedBuildingHeight}
              onGenerateFloors={generateSelectedBuildingFloors}
              onSwitchTo3D={() => {
                setViewMode("3d");
                setSubView3D("building");
              }}
              onSwitchToFloors3D={() => {
                setViewMode("3d");
                setSubView3D("floors");
              }}
              onSwitchToProperty3D={() => {
                setViewMode("3d");
                setSubView3D("property");
              }}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
