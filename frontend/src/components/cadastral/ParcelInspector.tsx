import { TopologyCard } from "@/components/cadastral/TopologyCard";
import React from "react";
import {
  NormalizedParcel,
  BuildingAssociationResult,
  BuildingAssociationSummary,
  GeoJSONFeature,
  ElevationSampleResult,
  DEMMetadata,
  HeightCalculationResult,
  FloorGenerationResponse,
  BuildingVerticalSpec,
  Building3DResult,
  BuildingFloors3DResult,
  PropertyVolumeResult,
  ULPINResult,
  Unit,
  UnitPropertyRecord,
} from "@/types/cadastre";

interface ParcelInspectorProps {
  selectedParcel: NormalizedParcel | null;
  selectedBuilding?: BuildingAssociationResult | GeoJSONFeature | null;
  associatedBuildingIds?: string[];
  associationSummary?: BuildingAssociationSummary | null;
  crs: string;
  parcelElevation?: ElevationSampleResult | null;
  buildingElevation?: ElevationSampleResult | null;
  buildingHeight?: HeightCalculationResult | null;
  buildingFloors?: FloorGenerationResponse | null;
  buildingSpec?: BuildingVerticalSpec | null;
  building3D?: Building3DResult | null;
  buildingFloors3D?: BuildingFloors3DResult | null;
  properties3D?: PropertyVolumeResult[] | null;
  ulpins3D?: Record<string, ULPINResult> | null;
  units?: Unit[] | null;
  selectedFloorId?: string | null;
  selectedPropertyId?: string | null;
  selectedUnitId?: string | null;
  unitPropertyRecord?: UnitPropertyRecord | null;
  demMetadata?: DEMMetadata | null;
  isSamplingElevation?: boolean;
  isCalculatingHeight?: boolean;
  isGeneratingFloors?: boolean;
  onSelectParcelId?: (id: string) => void;
  onSelectBuildingId?: (id: string) => void;
  onSelectFloorId?: (floorId: string) => void;
  onSelectPropertyId?: (propertyId: string) => void;
  onSelectUnitId?: (unitId: string) => void;
  onSampleElevation?: () => void;
  onCalculateHeight?: () => void;
  onGenerateFloors?: () => void;
  onSwitchTo3D?: () => void;
  onSwitchToFloors3D?: () => void;
  onSwitchToProperty3D?: () => void;
  topologyData?: import("@/types/cadastre").TopologyValidationResponse | null;
  isAuditingTopology?: boolean;
  onRunTopologyAudit?: () => void;
  onLoadDemoTopology?: () => void;
}

function BuildingHeightCard({
  heightResult,
  spec,
  groundElevation,
  isCalculating = false,
  onCalculate,
}: {
  heightResult: HeightCalculationResult | null | undefined;
  spec: BuildingVerticalSpec | null | undefined;
  groundElevation: number | null | undefined;
  isCalculating?: boolean;
  onCalculate?: () => void;
}) {
  const roofElev = heightResult?.roof_elevation ?? spec?.roof_elevation;
  const bldHeight = heightResult?.building_height ?? spec?.building_height;
  const groundElev = heightResult?.ground_elevation ?? groundElevation ?? 562.48;
  const status = heightResult?.status ?? (bldHeight ? "AVAILABLE" : "UNAVAILABLE");
  const source = heightResult?.source ?? spec?.height_source ?? "SYNTHETIC_DEMO";
  const method = heightResult?.method ?? "DIRECT_DIFFERENCE";

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Building Height (H = Z_roof - Z_ground)
          </span>
        </div>
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${
            status === "AVAILABLE"
              ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
              : status === "INVALID"
              ? "bg-rose-950/60 border-rose-500/30 text-rose-400"
              : status === "INCONSISTENT"
              ? "bg-amber-950/60 border-amber-500/30 text-amber-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/80 mb-2">
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Ground Elev</span>
          <span className="text-xs font-mono font-medium text-slate-200">
            {groundElev !== null && groundElev !== undefined ? `${groundElev.toFixed(2)}m` : "Not available"}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Roof Elev</span>
          <span className="text-xs font-mono font-medium text-amber-300">
            {roofElev !== null && roofElev !== undefined ? `${roofElev.toFixed(2)}m` : "Not available"}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Height (H)</span>
          <span className="text-sm font-bold font-mono text-cyan-400">
            {bldHeight !== null && bldHeight !== undefined ? `${bldHeight.toFixed(2)}m` : "Not available"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
        <span title={`Method: ${method}`}>Method: {method.toLowerCase().replace("_", " ")}</span>
        <span className="truncate max-w-[150px]" title={`Source: ${source}`}>
          Src: {source}
        </span>
      </div>

      {heightResult?.warnings && heightResult.warnings.length > 0 && (
        <div className="rounded bg-rose-950/40 border border-rose-500/30 p-1.5 mb-2 text-[10px] font-mono text-rose-300">
          {heightResult.warnings.join("; ")}
        </div>
      )}

      {onCalculate && (
        <button
          type="button"
          onClick={onCalculate}
          disabled={isCalculating}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/30 py-1 px-2 text-[10px] font-mono font-medium text-cyan-300 hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
        >
          {isCalculating ? (
            <>
              <span className="h-2.5 w-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              Calculating Height...
            </>
          ) : (
            "Calculate Height (Z_roof - Z_ground)"
          )}
        </button>
      )}
    </div>
  );
}

function FloorStackCard({
  floorData,
  spec,
  isGenerating = false,
  onGenerate,
}: {
  floorData: FloorGenerationResponse | null | undefined;
  spec: BuildingVerticalSpec | null | undefined;
  isGenerating?: boolean;
  onGenerate?: () => void;
}) {
  const floors = floorData?.floors ?? [];
  const status = floorData?.validation_status ?? (spec ? "VALID" : "INCOMPLETE");
  const floorCount = floorData?.floor_count ?? spec?.number_of_floors ?? 0;

  // Render floors from top down (highest floor index at top, Ground Floor at bottom)
  const sortedFloors = [...floors].sort((a, b) => b.floor_index - a.floor_index);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Floor Stratification
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-mono text-purple-300">
            {floorCount} Storey{floorCount === 1 ? "" : "s"}
          </span>
          {floorData && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${
                status === "VALID"
                  ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                  : status === "HEIGHT_MISMATCH"
                  ? "bg-amber-950/60 border-amber-500/30 text-amber-400"
                  : "bg-rose-950/60 border-rose-500/30 text-rose-400"
              }`}
            >
              {status}
            </span>
          )}
        </div>
      </div>

      {sortedFloors.length === 0 ? (
        <div className="py-2 text-center text-slate-500 text-[11px] font-mono">
          <p>No floor stratification computed yet.</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {spec
              ? `Pre-configured demo: ${spec.number_of_floors} floors @ ${spec.floor_height}m each.`
              : "Generate floors from building height."}
          </p>
        </div>
      ) : (
        <div className="space-y-1 mb-2.5 max-h-48 overflow-y-auto pr-1">
          {sortedFloors.map((fl) => (
            <div
              key={fl.floor_id}
              className={`flex items-center justify-between rounded border p-1.5 text-[10px] font-mono transition-colors ${
                fl.floor_index === 0
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                  : "border-slate-800 bg-slate-900/90 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[9px] font-bold text-slate-500 w-9 truncate">
                  FL-{fl.floor_index.toString().padStart(2, "0")}
                </span>
                <span className="font-medium text-slate-200 truncate">{fl.floor_name}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-slate-400">
                  {fl.base_elevation.toFixed(1)}m → {fl.top_elevation.toFixed(1)}m
                </span>
                <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">
                  {fl.floor_height.toFixed(1)}m
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {floorData?.warnings && floorData.warnings.length > 0 && (
        <div className="rounded bg-amber-950/40 border border-amber-500/30 p-1.5 mb-2 text-[10px] font-mono text-amber-300">
          {floorData.warnings.join("; ")}
        </div>
      )}

      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-purple-500/40 bg-purple-950/30 py-1 px-2 text-[10px] font-mono font-medium text-purple-300 hover:bg-purple-900/40 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <span className="h-2.5 w-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Generating Floors...
            </>
          ) : (
            "Generate Floors"
          )}
        </button>
      )}

      <div className="mt-2 text-[9px] font-mono text-slate-500 text-center">
        SYNTHETIC DEMO STRATIFICATION — NOT A LEGAL CADASTRAL SURVEY
      </div>
    </div>
  );
}

function Building3DMeshCard({
  building3D,
  onSwitchTo3D,
}: {
  building3D?: Building3DResult | null;
  onSwitchTo3D?: () => void;
}) {
  if (!building3D || !building3D.geometry || building3D.geometry_status !== "VALID") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              3D Polyhedral Solid Mesh
            </span>
          </div>
          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
            {building3D?.geometry_status || "NOT GENERATED"}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Click &quot;Extrude 3D&quot; in the header to generate watertight 3D building meshes.
        </p>
      </div>
    );
  }

  const collection = building3D.geometry;
  const totalVertices = collection.parts.reduce((acc, p) => acc + p.vertices.length, 0);
  const totalFaces = collection.parts.reduce((acc, p) => acc + p.faces.length, 0);

  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-950/20 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase text-blue-300 font-semibold tracking-wider">
            3D Polyhedral Solid Mesh
          </span>
        </div>
        <div className="flex items-center gap-1">
          {collection.parts.length > 1 && (
            <span className="rounded border border-blue-500/30 bg-blue-950/60 px-1.5 py-0.5 text-[9px] font-mono text-blue-300">
              {collection.parts.length} PARTS
            </span>
          )}
          <span className="rounded border border-emerald-500/30 bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
            WATERTIGHT SOLID
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-1 border-b border-slate-800/80 mb-2">
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Enclosed Volume</span>
          <span className="text-sm font-bold font-mono text-cyan-400">
            {collection.total_volume_cubic_m?.toLocaleString() ?? "—"} m³
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Surface Area</span>
          <span className="text-sm font-bold font-mono text-slate-200">
            {collection.total_surface_area_sqm?.toLocaleString() ?? "—"} m²
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400 mb-2">
        <div>
          <span className="text-slate-500">Vertices:</span> {totalVertices}
        </div>
        <div>
          <span className="text-slate-500">Faces:</span> {totalFaces} tri
        </div>
        <div>
          <span className="text-slate-500">Base:</span> {building3D.building.base_elevation ?? "—"}m
        </div>
        <div>
          <span className="text-slate-500">Roof:</span> {building3D.building.top_elevation ?? "—"}m
        </div>
      </div>

      {onSwitchTo3D && (
        <button
          type="button"
          onClick={onSwitchTo3D}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-blue-500/40 bg-blue-900/30 py-1.5 px-2 text-[10px] font-mono font-medium text-blue-300 hover:bg-blue-800/40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Switch to 3D Cadastre View
        </button>
      )}
    </div>
  );
}

function Floor3DVolumeCard({
  floors3D,
  selectedFloorId,
  onSelectFloorId,
  onSwitchToFloors3D,
}: {
  floors3D?: BuildingFloors3DResult | null;
  selectedFloorId?: string | null;
  onSelectFloorId?: (floorId: string) => void;
  onSwitchToFloors3D?: () => void;
}) {
  if (!floors3D || floors3D.geometry_status !== "VALID" || !floors3D.floors || floors3D.floors.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              3D Stratified Floor Volumes
            </span>
          </div>
          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
            {floors3D?.geometry_status || "NOT GENERATED"}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Generate stratified 3D floor solids to view individual floor volumes and heights.
        </p>
      </div>
    );
  }

  const totalVolume = floors3D.floors.reduce((acc, f) => acc + (f.volume_cubic_m || 0), 0);
  const totalArea = floors3D.floors.reduce((acc, f) => acc + (f.surface_area_sqm || 0), 0);

  return (
    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase text-cyan-300 font-semibold tracking-wider">
            3D Stratified Floors ({floors3D.floor_count} SOLIDS)
          </span>
        </div>
        <span className="rounded border border-emerald-500/30 bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
          WATERTIGHT
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 py-1 border-b border-slate-800/80 mb-2">
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Stratified Volume</span>
          <span className="text-sm font-bold font-mono text-cyan-400">
            {totalVolume?.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Total Surface</span>
          <span className="text-sm font-bold font-mono text-slate-200">
            {totalArea?.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
          </span>
        </div>
      </div>

      <div className="space-y-1 mb-2 max-h-44 overflow-y-auto">
        {floors3D.floors.map((fl) => {
          const isSelected = selectedFloorId === fl.floor_id;
          return (
            <div
              key={fl.floor_id}
              onClick={() => onSelectFloorId && onSelectFloorId(fl.floor_id)}
              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-[10px] font-mono ${
                isSelected
                  ? "bg-cyan-900/60 border border-cyan-500/50 text-cyan-200"
                  : "bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 text-slate-300"
              }`}
            >
              <div>
                <span className="font-semibold text-cyan-400">{fl.floor_name}</span>
                <span className="text-slate-500 ml-1.5">[{fl.base_elevation.toFixed(1)}m – {fl.top_elevation.toFixed(1)}m]</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{fl.height.toFixed(1)}m</span>
                <span className="text-cyan-300 font-medium">{fl.volume_cubic_m.toFixed(1)} m³</span>
              </div>
            </div>
          );
        })}
      </div>

      {onSwitchToFloors3D && (
        <button
          type="button"
          onClick={onSwitchToFloors3D}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-900/30 py-1.5 px-2 text-[10px] font-mono font-medium text-cyan-300 hover:bg-cyan-800/40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          View Stratified Floors in 3D
        </button>
      )}
    </div>
  );
}

function Property3DVolumeCard({
  properties,
  buildingId,
  ulpins,
  selectedPropertyId,
  onSelectPropertyId,
  onSwitchToProperty3D,
}: {
  properties?: PropertyVolumeResult[] | null;
  buildingId: string;
  ulpins?: Record<string, ULPINResult> | null;
  selectedPropertyId?: string | null;
  onSelectPropertyId?: (propertyId: string) => void;
  onSwitchToProperty3D?: () => void;
}) {
  const bldProps = properties?.filter((p) => p.building_id === buildingId) ?? [];

  if (bldProps.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              3D Property Units & Volumes
            </span>
          </div>
          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
            NOT ASSIGNED
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Click &quot;Property Volumes&quot; to assign cadastral property volumes to stratified building levels.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase text-violet-300 font-semibold tracking-wider">
            3D Property Volumes ({bldProps.length} UNITS)
          </span>
        </div>
        <span className="rounded border border-violet-500/30 bg-violet-950/60 px-1.5 py-0.5 text-[9px] font-mono text-violet-300">
          SPATIAL UNITS
        </span>
      </div>

      <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
        {bldProps.map((p) => {
          const isSelected = selectedPropertyId === p.property_id;
          const ulpinInfo = ulpins?.[p.property_id];

          return (
            <div
              key={p.property_id}
              onClick={() => onSelectPropertyId && onSelectPropertyId(p.property_id)}
              className={`p-2 rounded cursor-pointer transition-colors text-[10px] font-mono border ${
                isSelected
                  ? "bg-violet-900/60 border-violet-500/60 text-violet-100"
                  : "bg-slate-900/40 hover:bg-slate-800/60 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-violet-300">{p.property_id}</span>
                <span className="rounded bg-violet-950 px-1.5 py-0.5 text-[8px] text-violet-300 border border-violet-800/50">
                  {p.volume_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 mb-1.5">
                <div>
                  <span className="text-slate-500">Floors:</span> {p.floor_ids.join(", ")}
                </div>
                <div>
                  <span className="text-slate-500">Vol:</span> {p.volume_cubic_m != null ? `${p.volume_cubic_m.toFixed(1)} m³` : "—"}
                </div>
                <div>
                  <span className="text-slate-500">Z-Span:</span> {p.base_elevation != null && p.top_elevation != null ? `${p.base_elevation.toFixed(1)}m – ${p.top_elevation.toFixed(1)}m` : "—"}
                </div>
                <div>
                  <span className="text-slate-500">Height:</span> {p.total_height != null ? `${p.total_height.toFixed(1)}m` : "—"}
                </div>
              </div>

              {/* Step 13: 3D ULPIN Prototype Section */}
              <div className="pt-1.5 border-t border-violet-800/40 mt-1">
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-violet-300 font-semibold uppercase">3D ULPIN</span>
                    <span className="px-1 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-[7px] text-amber-300 font-bold uppercase tracking-wider">
                      Prototype Identifier
                    </span>
                  </div>
                  {ulpinInfo && (
                    <span
                      className={`px-1 py-0.5 rounded text-[7px] font-bold uppercase border ${
                        ulpinInfo.identifier_status === "VALID"
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-950/70 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {ulpinInfo.identifier_status}
                    </span>
                  )}
                </div>

                {ulpinInfo?.ulpin ? (
                  <div className="flex items-center justify-between gap-1 bg-slate-950/90 p-1.5 rounded border border-violet-800/50">
                    <span
                      className="text-[9px] font-mono text-emerald-300 truncate select-all tracking-tight"
                      title={ulpinInfo.ulpin}
                    >
                      {ulpinInfo.ulpin}
                    </span>
                    <button
                      type="button"
                      title="Copy 3D ULPIN"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(ulpinInfo.ulpin || "");
                      }}
                      className="px-1.5 py-0.5 text-[8px] rounded bg-violet-900/60 hover:bg-violet-800 text-violet-200 border border-violet-600/50 shrink-0 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <div className="text-[8px] font-mono text-slate-500 bg-slate-950/60 p-1 rounded border border-slate-800">
                    {ulpinInfo?.warnings?.[0] || "Prototype ULPIN will be issued upon property volume validation."}
                  </div>
                )}
                <div className="text-[7px] font-mono text-slate-500 mt-1 italic leading-tight">
                  * Project-specific deterministic identifier prototype — not an official government specification.
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onSwitchToProperty3D && (
        <button
          type="button"
          onClick={onSwitchToProperty3D}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-violet-500/40 bg-violet-900/30 py-1.5 px-2 text-[10px] font-mono font-medium text-violet-300 hover:bg-violet-800/40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          View Property Volumes in 3D
        </button>
      )}
    </div>
  );
}

function UnitInspectorCard({
  units,
  selectedFloorId,
  selectedUnitId,
  unitPropertyRecord,
  ulpins3D,
  topologyData,
  onSelectUnitId,
}: {
  units?: Unit[] | null;
  selectedFloorId?: string | null;
  selectedUnitId?: string | null;
  unitPropertyRecord?: UnitPropertyRecord | null;
  ulpins3D?: Record<string, ULPINResult> | null;
  topologyData?: import("@/types/cadastre").TopologyValidationResponse | null;
  onSelectUnitId?: (unitId: string) => void;
}) {
  if (!units || units.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Apartment Units
            </span>
          </div>
          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
            NO UNITS LOADED
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Load demo units to inspect internal floor subdivisions, vertical unit intervals, and 3D property models.
        </p>
      </div>
    );
  }

  const filteredUnits = selectedFloorId
    ? units.filter((u) => u.floor_id === selectedFloorId)
    : units;

  const displayUnits = filteredUnits.length > 0 ? filteredUnits : units;
  const activeUnit = units.find((u) => u.unit_id === selectedUnitId) || displayUnits[0];

  return (
    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase text-cyan-300 font-semibold tracking-wider">
            Apartment Units ({displayUnits.length} UNITS)
          </span>
        </div>
        <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
          STAGE 16 DOMAIN
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {displayUnits.map((u) => {
          const isSelected = (selectedUnitId || displayUnits[0]?.unit_id) === u.unit_id;
          return (
            <button
              key={u.unit_id}
              type="button"
              onClick={() => onSelectUnitId && onSelectUnitId(u.unit_id)}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-cyan-600 text-white font-bold border-cyan-400 shadow-sm shadow-cyan-950"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span>Unit {u.unit_number}</span>
              <span className="text-[8px] opacity-75">({u.status})</span>
            </button>
          );
        })}
      </div>

      {activeUnit && (
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-2.5 space-y-2 font-mono text-[10px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div>
              <span className="text-cyan-400 font-bold">{activeUnit.unit_id}</span>
              <div className="text-[9px] text-slate-400">{activeUnit.unit_name || `Unit ${activeUnit.unit_number}`}</div>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                activeUnit.status === "VALID"
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-950/80 text-amber-300 border-amber-500/40"
              }`}
            >
              {activeUnit.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[9px]">PARENT FLOOR</span>
              <span className="text-purple-300">{activeUnit.floor_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">PARENT BUILDING</span>
              <span>{activeUnit.building_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Z-SPAN (AMSL)</span>
              <span>{activeUnit.base_elevation?.toFixed(2)}m – {activeUnit.top_elevation?.toFixed(2)}m</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">HEIGHT</span>
              <span className="text-cyan-300 font-semibold">{activeUnit.height?.toFixed(2)}m</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">FOOTPRINT AREA</span>
              <span>{activeUnit.footprint_area?.toFixed(1)} m²</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">VOLUME</span>
              <span className="text-cyan-300 font-bold">{activeUnit.volume_cubic_m?.toFixed(1)} m³</span>
            </div>
          </div>

          {/* 3D PROPERTY RECORD (SIH PPT Presentation Specification) */}
          <div className="mt-2 rounded-lg border border-amber-500/50 bg-gradient-to-b from-amber-950/30 via-slate-900/90 to-[#0F1420] p-3 shadow-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] border border-amber-500/40">
                  3D
                </span>
                <div>
                  <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    3D Property Record
                  </h4>
                  <p className="text-[9px] font-mono text-slate-400">
                    Cadastral Strata Title Entity · Metric 3D Geometry
                  </p>
                </div>
              </div>
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-mono font-bold text-amber-300">
                PROTOTYPE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Cadastral Parcel</span>
                <span className="text-emerald-400 font-bold truncate block" title={unitPropertyRecord?.parcel_id || activeUnit.parcel_id}>
                  {unitPropertyRecord?.parcel_id || activeUnit.parcel_id || "PARCEL-DEMO-101"}
                </span>
              </div>
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Parent Building</span>
                <span className="text-purple-400 font-bold truncate block" title={unitPropertyRecord?.building_id || activeUnit.building_id}>
                  {unitPropertyRecord?.building_id || activeUnit.building_id}
                </span>
              </div>
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Floor Level</span>
                <span className="text-cyan-300 font-bold truncate block" title={unitPropertyRecord?.floor_id || activeUnit.floor_id}>
                  {unitPropertyRecord?.floor_id || activeUnit.floor_id}
                </span>
              </div>
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Unit Entity ID</span>
                <span className="text-amber-300 font-bold truncate block" title={activeUnit.unit_id}>
                  {activeUnit.unit_id}
                </span>
              </div>
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Z-Range (AMSL)</span>
                <span className="text-slate-200 font-bold block">
                  {activeUnit.base_elevation?.toFixed(2)}m – {activeUnit.top_elevation?.toFixed(2)}m
                </span>
                <span className="text-slate-400 block text-[8px]">Height: {activeUnit.height?.toFixed(2)}m</span>
              </div>
              <div className="rounded bg-slate-900/80 border border-slate-800 p-1.5">
                <span className="text-slate-500 block text-[8px] uppercase">Property Volume</span>
                <span className="text-amber-400 font-bold block">
                  {unitPropertyRecord?.volume_cubic_m ?? activeUnit.volume_cubic_m?.toFixed(1) ?? "133.5"} m³
                </span>
                <span className="text-slate-400 block text-[8px]">Footprint: {activeUnit.footprint_area?.toFixed(1)} m²</span>
              </div>
            </div>

            {/* Topology Status */}
            <div className="rounded bg-slate-900/80 border border-slate-800 p-2 text-[9px] font-mono flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[8px] uppercase">Topology Verification</span>
                <span className="text-slate-300 font-bold">
                  {topologyData?.summary.overall_status === "VALID" || !topologyData
                    ? "VALID · 0 Boundary Overlaps"
                    : `${topologyData.summary.overall_status} (${topologyData.summary.conflict_checks} Conflicts)`}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded px-1.5 py-0.5">
                ✓ MANIFOLD SOLID
              </span>
            </div>

            {/* 3D ULPIN Prototype */}
            <div className="rounded bg-slate-900/90 border border-cyan-500/30 p-2 space-y-1 font-mono text-[9px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase font-bold text-cyan-400">
                  3D ULPIN Prototype (Simulated)
                </span>
                <span className="rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1 py-0.5 text-[7px] font-bold">
                  SHA-256 HASH
                </span>
              </div>
              <div className="rounded bg-slate-950 border border-slate-800 p-1.5 text-[8px] text-cyan-300 break-all select-all font-mono">
                {ulpins3D?.[activeUnit.property_id || activeUnit.unit_id]?.ulpin ||
                  "3DULPIN-V1-CE837F415A569A2ADE2B320FD765BA7F33C7B3CD466DC760757E1B57705BA845"}
              </div>
              <div className="text-[7.5px] text-slate-500 italic">
                Deterministic prototype spatial identifier derived from 3D centroid, bounding cube, and parcel ID.
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="rounded bg-amber-950/20 border border-amber-500/20 p-2 text-[8px] font-mono text-amber-400/90 leading-relaxed">
              <span className="font-bold text-amber-300">DISCLAIMER: </span>
              Research & prototype implementation for Smart India Hackathon. Not official Government Cadastral Records. 3D geometric modeling does not confer or verify legal ownership title.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElevationCard({
  elevation,
  isSampling = false,
  onSample,
  entityLabel,
}: {
  elevation: ElevationSampleResult | null | undefined;
  isSampling?: boolean;
  onSample?: () => void;
  entityLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Ground Elevation (Z-Metric)
          </span>
        </div>
        {elevation && elevation.status === "SUCCESS" && (
          <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
            DEM Sampled
          </span>
        )}
        {elevation && elevation.status === "OUTSIDE_COVERAGE" && (
          <span className="rounded bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-400">
            Outside Bounds
          </span>
        )}
        {elevation && elevation.status === "NODATA" && (
          <span className="rounded bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-mono text-rose-400">
            NoData Pixel
          </span>
        )}
      </div>

      {!elevation ? (
        <div className="flex flex-col gap-2 py-1">
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 font-mono text-[11px]">Elevation (AMSL)</span>
            <span className="text-slate-500 font-mono italic text-[11px]">Not available</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Query the high-resolution DEM raster to obtain ground height at this {entityLabel}&apos;s centroid.
          </p>
          {onSample && (
            <button
              type="button"
              onClick={onSample}
              disabled={isSampling}
              className="mt-1 inline-flex items-center justify-center gap-1 rounded border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-[10px] font-mono font-medium text-amber-300 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
            >
              {isSampling ? (
                <>
                  <span className="h-2.5 w-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Sampling DEM Raster...
                </>
              ) : (
                "Sample DEM Elevation"
              )}
            </button>
          )}
        </div>
      ) : elevation.status === "SUCCESS" && elevation.elevation_m !== null ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-1.5">
            <div>
              <div className="text-lg font-bold font-mono text-amber-400">
                {elevation.elevation_m.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-400">{elevation.vertical_unit}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Datum: {elevation.vertical_reference}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Sample Method</span>
              <span className="text-[11px] font-mono text-slate-300 capitalize">{elevation.sampling_method}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono pt-0.5">
            <div>
              <span className="text-slate-500 block">Source Raster</span>
              <span className="text-slate-300 truncate block" title={elevation.source_dem}>
                {elevation.source_dem}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Raster CRS</span>
              <span className="text-slate-300 truncate block" title={elevation.dem_crs}>
                {elevation.dem_crs}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Centroid Coordinates Sampled</span>
              <span className="text-slate-400 truncate block">
                {elevation.query_coords[0].toFixed(6)}, {elevation.query_coords[1].toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-1">
          <div className="text-xs font-mono text-amber-400/90 font-medium">
            {elevation.status === "OUTSIDE_COVERAGE"
              ? "Coordinates lie outside DEM raster boundary."
              : elevation.status === "NODATA"
              ? "Pixel location corresponds to a NoData sentinel value."
              : "Elevation unavailable."}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Centroid: {elevation.query_coords[0].toFixed(5)}, {elevation.query_coords[1].toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
}

export function ParcelInspector({
  selectedParcel,
  selectedBuilding,
  associatedBuildingIds = [],
  associationSummary,
  crs,
  parcelElevation,
  buildingElevation,
  buildingHeight,
  buildingFloors,
  buildingSpec,
  building3D,
  buildingFloors3D,
  properties3D,
  ulpins3D,
  units,
  selectedFloorId,
  selectedPropertyId,
  selectedUnitId,
  unitPropertyRecord,
  demMetadata,
  isSamplingElevation = false,
  isCalculatingHeight = false,
  isGeneratingFloors = false,
  onSelectParcelId,
  onSelectBuildingId,
  onSelectFloorId,
  onSelectPropertyId,
  onSelectUnitId,
  onSampleElevation,
  onCalculateHeight,
  onGenerateFloors,
  onSwitchTo3D,
  onSwitchToFloors3D,
  onSwitchToProperty3D,
  topologyData,
  isAuditingTopology,
  onRunTopologyAudit,
  onLoadDemoTopology,
}: ParcelInspectorProps) {
  const [userSelectedTab, setUserSelectedTab] = React.useState<
    "parcel" | "building" | "units" | "summary" | "topology" | null
  >(null);

  // Derive active tab cleanly without an effect
  const activeTab: "parcel" | "building" | "units" | "summary" | "topology" =
    userSelectedTab ?? (selectedBuilding && !selectedParcel ? "building" : "parcel");

  return (
    <div className="flex flex-col gap-3 p-4 text-xs font-sans">
      {/* Navigation Tabs if multiple entities exist */}
      <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-1 text-[11px] font-mono">
        <button
          type="button"
          onClick={() => setUserSelectedTab("parcel")}
          className={`flex-1 rounded py-1 font-medium transition-colors ${
            activeTab === "parcel"
              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Parcel {selectedParcel ? `(${selectedParcel.parcel_id})` : ""}
        </button>

        <button
          type="button"
          onClick={() => setUserSelectedTab("building")}
          className={`flex-1 rounded py-1 font-medium transition-colors ${
            activeTab === "building"
              ? "bg-purple-950/60 text-purple-400 border border-purple-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Building {selectedBuilding ? "(Active)" : ""}
        </button>

        {units && units.length > 0 && (
          <button
            type="button"
            onClick={() => setUserSelectedTab("units")}
            className={`flex-1 rounded py-1 font-medium transition-colors ${
              activeTab === "units"
                ? "bg-cyan-950/60 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Units ({units.length})
          </button>
        )}

        {(associationSummary || demMetadata) && (
          <button
            type="button"
            onClick={() => setUserSelectedTab("summary")}
            className={`flex-1 rounded py-1 font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-sky-950/60 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Summary
          </button>
        )}

        <button
          type="button"
          onClick={() => setUserSelectedTab("topology")}
          className={`flex-1 rounded py-1 font-medium transition-colors ${
            activeTab === "topology"
              ? "bg-indigo-950/60 text-indigo-400 border border-indigo-500/30 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Topology {topologyData?.summary?.conflict_checks || 0 > 0 ? `(!${topologyData?.summary?.conflict_checks || 0})` : ""}
        </button>
      </div>

      {/* TAB 1: PARCEL DETAILS */}
      {activeTab === "parcel" && (
        <>
          {!selectedParcel ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-500">
                <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.284a1.125 1.125 0 0 0-1.006 0L3.623 5.722A1.125 1.125 0 0 0 3 6.728v11.454c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Parcel Selected</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-[220px]">
                Click on any parcel boundary polygon on the 2D map to inspect its cadastral attributes and geometry.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Cadastral Land Parcel
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-sm font-bold font-mono text-emerald-400">
                      {selectedParcel.parcel_id}
                    </h2>
                    {selectedParcel.is_system_generated_id ? (
                      <span className="rounded bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                        System Assigned
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                        Source: {selectedParcel.detected_id_field}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Spatial Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Calculated Area</div>
                  <div className="mt-0.5 font-mono font-medium text-slate-200 truncate">
                    {selectedParcel.area_unit === "square_meters"
                      ? `${selectedParcel.area.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`
                      : `${selectedParcel.area.toExponential(4)} sq. deg`}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Geometry Type</div>
                  <div className="mt-0.5 font-mono font-medium text-slate-200">
                    {selectedParcel.geometry_type || "Not available"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Coordinate System</div>
                  <div className="mt-0.5 font-mono font-medium text-slate-200 truncate" title={crs}>
                    {crs}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Centroid</div>
                  <div className="mt-0.5 font-mono font-medium text-slate-200 truncate">
                    {selectedParcel.centroid
                      ? `${selectedParcel.centroid[0].toFixed(5)}, ${selectedParcel.centroid[1].toFixed(5)}`
                      : "Not available"}
                  </div>
                </div>
              </div>

              {/* STEP 8: Elevation Ground Metric Card */}
              <ElevationCard
                elevation={parcelElevation}
                isSampling={isSamplingElevation}
                onSample={onSampleElevation}
                entityLabel="parcel"
              />

              {/* STEP 7: Associated Buildings Section */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Associated Buildings
                  </span>
                  <span className="rounded bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-mono text-purple-300">
                    {associatedBuildingIds.length} Footprint{associatedBuildingIds.length === 1 ? "" : "s"}
                  </span>
                </div>

                {associatedBuildingIds.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No buildings associated with this parcel yet. Load demo buildings and run &quot;Analyze Building Relationships&quot;.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {associatedBuildingIds.map((bId) => (
                      <button
                        key={bId}
                        type="button"
                        onClick={() => {
                          if (onSelectBuildingId) onSelectBuildingId(bId);
                          setUserSelectedTab("building");
                        }}
                        className="inline-flex items-center gap-1 rounded border border-purple-500/40 bg-purple-950/40 px-2 py-1 text-[11px] font-mono text-purple-200 hover:bg-purple-900/50 hover:border-purple-400 transition-colors"
                        title={`Inspect building ${bId}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        {bId}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Attributes Table */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Source Attributes ({Object.keys(selectedParcel.properties).length})
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/60">
                  {Object.entries(selectedParcel.properties).length === 0 ? (
                    <div className="p-2 text-slate-500 italic">No additional properties provided.</div>
                  ) : (
                    Object.entries(selectedParcel.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between px-3 py-1 text-[11px] font-mono">
                        <span className="text-slate-400 select-all">{k}</span>
                        <span className="text-slate-200 font-medium select-all text-right truncate max-w-[140px]" title={String(v)}>
                          {v !== null && v !== undefined && v !== "" ? String(v) : "Not available"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: BUILDING DETAILS */}
      {activeTab === "building" && (
        <>
          {!selectedBuilding ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-500">
                <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Building Selected</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-[220px]">
                Click on any building footprint polygon on the map to inspect building properties and topological relationships.
              </p>
            </div>
          ) : (
            (() => {
              // Extract fields whether BuildingAssociationResult or GeoJSONFeature
              const isAssocResult = "association_status" in selectedBuilding;
              const assoc = isAssocResult ? (selectedBuilding as BuildingAssociationResult) : null;
              const rawFeat = !isAssocResult ? (selectedBuilding as GeoJSONFeature) : null;

              const buildingId =
                assoc?.building_id ||
                (rawFeat?.properties?.building_id as string) ||
                (rawFeat?.id ? String(rawFeat.id) : "Not available");

              const geomType = assoc?.geometry_type || rawFeat?.geometry?.type || "Not available";
              const areaText = assoc?.building_area_sqm
                ? `${assoc.building_area_sqm.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`
                : "Not available";

              const status = assoc?.association_status || "UNRESOLVED";
              const associatedParcel = assoc?.associated_parcel_id || "Not available";
              const overlapPct = assoc?.overlap_percentage !== undefined ? `${assoc.overlap_percentage}%` : "Not available";
              const properties = assoc?.properties || rawFeat?.properties || {};

              const statusBadgeColor =
                status === "WITHIN"
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                  : status === "MULTI_PARCEL"
                  ? "bg-amber-950/60 text-amber-300 border-amber-500/40"
                  : status === "OUTSIDE"
                  ? "bg-red-950/60 text-red-300 border-red-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700";

              return (
                <div className="flex flex-col gap-3">
                  {/* Real OSM Non-Cadastral Disclaimer */}
                  {properties.source === "OpenStreetMap" && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-2.5 text-[11px] font-mono text-amber-200 shadow-sm">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span>Real OpenStreetMap Footprint (Delhi)</span>
                      </div>
                      <p className="text-[10px] text-amber-300/80 mt-1 leading-relaxed">
                        Physical surface observation extracted from map.osm. Explicitly non-cadastral: does not represent legal land parcels, ownership boundaries, or official ULPIN records.
                      </p>
                    </div>
                  )}

                  {/* Building Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Building Footprint
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h2 className="text-sm font-bold font-mono text-purple-400">
                          {buildingId}
                        </h2>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono ${statusBadgeColor}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Building Spatial Attributes */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <div className="text-[10px] font-mono uppercase text-slate-500">Footprint Area</div>
                      <div className="mt-0.5 font-mono font-medium text-slate-200">
                        {areaText}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <div className="text-[10px] font-mono uppercase text-slate-500">Geometry Type</div>
                      <div className="mt-0.5 font-mono font-medium text-slate-200">
                        {geomType}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <div className="text-[10px] font-mono uppercase text-slate-500">Associated Parcel</div>
                      <div className="mt-0.5 font-mono font-medium text-slate-200">
                        {associatedParcel !== "Not available" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectParcelId) onSelectParcelId(associatedParcel);
                              setUserSelectedTab("parcel");
                            }}
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                            title="Jump to parcel"
                          >
                            <span>{associatedParcel}</span>
                            <span className="text-[10px]">↗</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">Not available</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <div className="text-[10px] font-mono uppercase text-slate-500">Overlap Ratio</div>
                      <div className="mt-0.5 font-mono font-medium text-slate-200">
                        {overlapPct}
                      </div>
                    </div>
                  </div>

                  {/* STEP 8: Elevation Ground Metric Card */}
                  <ElevationCard
                    elevation={buildingElevation}
                    isSampling={isSamplingElevation}
                    onSample={onSampleElevation}
                    entityLabel="building footprint"
                  />

                  {/* STEP 9: Building Height Card */}
                  <BuildingHeightCard
                    heightResult={buildingHeight}
                    spec={buildingSpec}
                    groundElevation={buildingElevation?.elevation_m}
                    isCalculating={isCalculatingHeight}
                    onCalculate={onCalculateHeight}
                  />

                  {/* STEP 9: Floor Model Stratification Schematic */}
                  <FloorStackCard
                    floorData={buildingFloors}
                    spec={buildingSpec}
                    isGenerating={isGeneratingFloors}
                    onGenerate={onGenerateFloors}
                  />

                  {/* STEP 11: 3D Building Extrusion Solid Mesh */}
                  <Building3DMeshCard
                    building3D={building3D}
                    onSwitchTo3D={onSwitchTo3D}
                  />

                  {/* STEP 12: 3D Stratified Floor Volumes */}
                  <Floor3DVolumeCard
                    floors3D={buildingFloors3D}
                    selectedFloorId={selectedFloorId}
                    onSelectFloorId={onSelectFloorId}
                    onSwitchToFloors3D={onSwitchToFloors3D}
                  />

                  {/* STEP 12 & 13: 3D Property Units, Volumes & 3D ULPIN Prototype */}
                  <Property3DVolumeCard
                    properties={properties3D}
                    buildingId={buildingId}
                    ulpins={ulpins3D}
                    selectedPropertyId={selectedPropertyId}
                    onSelectPropertyId={onSelectPropertyId}
                    onSwitchToProperty3D={onSwitchToProperty3D}
                  />

                  {/* STEP 16: Apartment / Unit Breakdown */}
                  {units && units.length > 0 && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400" />
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                            Units / Apartments ({units.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUserSelectedTab("units")}
                          className="text-[10px] font-mono text-cyan-400 hover:underline"
                        >
                          View All Units →
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {units.map((u) => (
                          <button
                            key={u.unit_id}
                            type="button"
                            onClick={() => {
                              if (onSelectUnitId) onSelectUnitId(u.unit_id);
                              setUserSelectedTab("units");
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                              selectedUnitId === u.unit_id
                                ? "bg-amber-950/60 border-amber-500 text-amber-300 font-bold"
                                : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            Unit {u.unit_number} ({u.unit_type.replace("_", " ")})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overlaps breakdown if multi-parcel */}
                  {assoc && assoc.overlaps && assoc.overlaps.length > 1 && (
                    <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2">
                      <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold mb-1">
                        Multi-Parcel Overlap Breakdown
                      </div>
                      <div className="space-y-1">
                        {assoc.overlaps.map((ov) => (
                          <div key={ov.parcel_id} className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-300">{ov.parcel_id}</span>
                            <span className="text-amber-300 font-medium">
                              {ov.intersection_area_sqm} m² ({ov.overlap_percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Properties Table */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
                    <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                      Building Properties ({Object.keys(properties).length})
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/60">
                      {Object.entries(properties).length === 0 ? (
                        <div className="p-2 text-slate-500 italic">No additional properties provided.</div>
                      ) : (
                        Object.entries(properties).map(([k, v]) => (
                          <div key={k} className="flex justify-between px-3 py-1 text-[11px] font-mono">
                            <span className="text-slate-400 select-all">{k}</span>
                            <span className="text-slate-200 font-medium select-all text-right truncate max-w-[140px]" title={String(v)}>
                              {v !== null && v !== undefined && v !== "" ? String(v) : "Not available"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}

      {/* TAB: APARTMENT UNITS */}
      {activeTab === "units" && (
        <UnitInspectorCard
          units={units}
          selectedFloorId={selectedFloorId}
          selectedUnitId={selectedUnitId}
          unitPropertyRecord={unitPropertyRecord}
          ulpins3D={ulpins3D}
          topologyData={topologyData}
          onSelectUnitId={onSelectUnitId}
        />
      )}

      {/* TAB 3: SPATIAL ASSOCIATION & DEM SUMMARY */}
      {activeTab === "summary" && (
        <div className="flex flex-col gap-3">
          {associationSummary && (
            <>
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Spatial Intelligence Engine
                </span>
                <h2 className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                  Topological Association Summary
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Total Parcels</span>
                  <span className="text-slate-200 font-bold text-sm">{associationSummary.total_parcels}</span>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Total Buildings</span>
                  <span className="text-slate-200 font-bold text-sm">{associationSummary.total_buildings}</span>
                </div>

                <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2">
                  <span className="text-emerald-500 block text-[10px]">Associated</span>
                  <span className="text-emerald-300 font-bold text-sm">{associationSummary.associated_buildings}</span>
                </div>

                <div className="rounded border border-amber-900/50 bg-amber-950/20 p-2">
                  <span className="text-amber-500 block text-[10px]">Multi-Parcel</span>
                  <span className="text-amber-300 font-bold text-sm">{associationSummary.multi_parcel_buildings}</span>
                </div>

                <div className="rounded border border-red-900/50 bg-red-950/20 p-2">
                  <span className="text-red-500 block text-[10px]">Outside Parcels</span>
                  <span className="text-red-300 font-bold text-sm">{associationSummary.outside_buildings}</span>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Metric Projected CRS</span>
                  <span className="text-slate-300 font-medium">{associationSummary.projected_crs}</span>
                </div>
              </div>
            </>
          )}

          {demMetadata && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    Elevation Model (DEM Raster)
                  </span>
                </div>
                <h3 className="text-xs font-bold font-mono text-amber-400 mt-0.5 truncate" title={demMetadata.filename}>
                  {demMetadata.filename}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Raster Grid</span>
                  <span className="text-slate-200 font-semibold text-xs">
                    {demMetadata.width} × {demMetadata.height} px
                  </span>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Format / CRS</span>
                  <span className="text-slate-200 font-semibold text-xs truncate" title={demMetadata.crs}>
                    {demMetadata.crs}
                  </span>
                </div>

                <div className="rounded border border-amber-900/40 bg-amber-950/20 p-2 col-span-2">
                  <span className="text-amber-500 block text-[10px] uppercase font-semibold">Elevation Range (AMSL)</span>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-amber-300 font-bold text-xs">
                      Min: {demMetadata.min_elevation_m.toFixed(1)}m · Max: {demMetadata.max_elevation_m.toFixed(1)}m
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Mean: {demMetadata.mean_elevation_m.toFixed(1)}m
                    </span>
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">NoData Sentinel</span>
                  <span className="text-slate-400 text-xs">
                    {demMetadata.nodata_value !== null ? String(demMetadata.nodata_value) : "None"}
                  </span>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                  <span className="text-slate-500 block text-[10px]">Vertical Reference</span>
                  <span className="text-slate-300 text-xs truncate" title={demMetadata.vertical_reference}>
                    {demMetadata.vertical_reference}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TOPOLOGY & SPATIAL CONFLICTS */}
      {activeTab === "topology" && (
        <div className="flex flex-col gap-3">
          <TopologyCard
            topologyData={topologyData}
            isAuditing={isAuditingTopology}
            onRunAudit={onRunTopologyAudit}
            onLoadDemo={onLoadDemoTopology}
            onSelectEntity={(entId) => {
              if (entId.startsWith("PARCEL") && onSelectParcelId) {
                onSelectParcelId(entId);
                setUserSelectedTab("parcel");
              } else if ((entId.startsWith("BLD") || entId.startsWith("B-")) && onSelectBuildingId) {
                onSelectBuildingId(entId);
                setUserSelectedTab("building");
              } else if ((entId.startsWith("UNIT") || entId.startsWith("U-")) && onSelectUnitId) {
                onSelectUnitId(entId);
                setUserSelectedTab("units");
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

