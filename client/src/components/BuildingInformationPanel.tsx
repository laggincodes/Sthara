import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  Layers,
  Sparkles,
  Sliders,
  Copy,
  FileCheck2,
  Flame,
  Zap,
  Droplet,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Scale,
  FileText,
} from "lucide-react";
import type { DetailedMapSelection } from "@/components/CesiumSpatialViewer";
import type {
  BuildingFloorStackRecord,
  FloorStackLevel,
  FloorUnitCadastre,
  UnitType,
} from "@shared/floorCadastre";
import { toast } from "sonner";

type BuildingInformationPanelProps = {
  selection: DetailedMapSelection | null;
  floorStack?: BuildingFloorStackRecord | null;
  activeFloorIndex?: number | null;
  onFloorSelect?: (floorIndex: number | null) => void;
  onUnitSelect?: (floor: FloorStackLevel, unit: FloorUnitCadastre) => void;
  explosionFactor?: number;
  onExplosionFactorChange?: (factor: number) => void;
  overrideFloorCount?: number | null;
  onOverrideFloorCountChange?: (count: number | null) => void;
};

const notAvailable = "Not available";

function valueFrom(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return null;
}

function numberFrom(properties: Record<string, unknown>, keys: string[]) {
  const value = valueFrom(properties, keys);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function centroidFromGeometry(geometry: unknown) {
  if (!geometry || typeof geometry !== "object") return null;
  const candidate = geometry as { coordinates?: unknown };
  const points: number[][] = [];
  const collect = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      points.push([value[0], value[1]]);
      return;
    }
    value.forEach(collect);
  };
  collect(candidate.coordinates);
  if (!points.length) return null;
  const [longitude, latitude] = points.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0]
  );
  return {
    longitude: longitude / points.length,
    latitude: latitude / points.length,
  };
}

function InspectorField({
  label,
  value,
  isCode = false,
  highlight = false,
}: {
  label: string;
  value: string | null | undefined;
  isCode?: boolean;
  highlight?: boolean;
}) {
  const isUnavail = !value || value === notAvailable || value === "Not exposed by OSM tile";
  const displayVal = isUnavail ? notAvailable : value;

  return (
    <div className="inspector-field-row">
      <span className="field-label">{label}</span>
      <span
        className={`field-value ${isUnavail ? "text-slate-500 italic" : highlight ? "text-cyan-300 font-semibold" : "text-slate-200"} ${isCode && !isUnavail ? "font-mono text-[11px]" : ""}`}
      >
        {displayVal}
      </span>
    </div>
  );
}

function getUnitTypeBadge(type: UnitType) {
  switch (type) {
    case "RESIDENTIAL":
      return {
        label: "Residential",
        bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
    case "COMMERCIAL":
      return {
        label: "Commercial",
        bg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      };
    case "PARKING":
      return {
        label: "Parking Bay",
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    case "UTILITY_CORE":
      return {
        label: "Utility Core",
        bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      };
    case "AIR_RIGHTS":
      return {
        label: "Solar / Air-Rights",
        bg: "bg-amber-400/20 text-amber-200 border-amber-400/40",
      };
    case "BASEMENT_STORAGE":
      return {
        label: "Storage",
        bg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      };
    default:
      return {
        label: "General Unit",
        bg: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      };
  }
}

export function BuildingInformationPanel({
  selection,
  floorStack,
  activeFloorIndex = null,
  onFloorSelect,
  onUnitSelect,
  explosionFactor = 0,
  onExplosionFactorChange,
  overrideFloorCount = null,
  onOverrideFloorCountChange,
}: BuildingInformationPanelProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!selection && !floorStack) {
    return (
      <section
        className="building-information-panel empty"
        aria-label="Building inspector panel"
      >
        <div className="building-information-heading">
          <div>
            <p>3D Spatial Cadastre</p>
            <h2>BUILDING INSPECTOR</h2>
          </div>
          <Building2 size={20} className="text-cyan-400/60" />
        </div>
        <p className="building-information-empty-copy">
          Select any 3D building on the map or search for an institution (e.g. <b>IIT Patna</b>, <b>AIIMS Patna</b>, or <b>Patna Central Heights</b>) to inspect source-backed identification, geometry, and vertical cadastre attributes.
        </p>
      </section>
    );
  }

  const properties = selection?.properties ?? {};
  const isOsm = selection?.kind === "osm-3d-tile";
  const layer = valueFrom(properties, [
    "layer",
    "featureType",
    "recordType",
    "propertyType",
  ]);
  const isParcel =
    !isOsm && Boolean(layer && /parcel|plot|land|field/i.test(layer));
  const geometryCentroid = centroidFromGeometry(properties.geometry);
  const latitude =
    selection?.coordinates?.latitude ??
    numberFrom(properties, ["latitude", "lat"]) ??
    floorStack?.coordinates.latitude ??
    geometryCentroid?.latitude ??
    null;
  const longitude =
    selection?.coordinates?.longitude ??
    numberFrom(properties, ["longitude", "lon", "lng"]) ??
    floorStack?.coordinates.longitude ??
    geometryCentroid?.longitude ??
    null;

  const rawName =
    floorStack?.buildingName ??
    valueFrom(properties, ["name", "title", "buildingName", "addr:housename"]);
  const buildingName = rawName && rawName !== "Not exposed by OSM tile" ? rawName : "Unnamed Building";

  const rawBuildingId =
    floorStack?.id ??
    valueFrom(properties, ["buildingId", "osmIdentifier", "osm_id", "id", "featureId"]);
  const buildingId = rawBuildingId && rawBuildingId !== "Not exposed by OSM tile" ? rawBuildingId : notAvailable;

  const rawUlpin = floorStack?.ulpin ?? valueFrom(properties, ["ulpin", "ULPIN"]);
  const ulpin = rawUlpin ? rawUlpin : notAvailable;

  const sourceName = floorStack
    ? "National 3D ULPIN Cadastre / Municipal Authority"
    : isOsm
      ? "OpenStreetMap / Cesium Ion 3D Photogrammetry Tiles"
      : "PostGIS Municipal GIS Spatial Database";

  const sourceCategory = isOsm ? "Visual Context Only" : "Authoritative GIS Survey Layer";

  // Real Geometry Attributes
  const rawHeight =
    floorStack?.actualHeightM !== undefined
      ? `${floorStack.actualHeightM.toFixed(1)} m`
      : valueFrom(properties, ["approvedHeightMetres", "heightMetres", "cesium#estimatedHeight", "height"])
        ? `${parseFloat(String(valueFrom(properties, ["approvedHeightMetres", "heightMetres", "cesium#estimatedHeight", "height"]))).toFixed(1)} m`
        : notAvailable;

  const rawFloors =
    floorStack?.floors
      ? `${floorStack.floors.length} Levels`
      : valueFrom(properties, ["levels", "building:levels", "approvedFloorCount"])
        ? `${valueFrom(properties, ["levels", "building:levels", "approvedFloorCount"])} Levels`
        : notAvailable;

  const rawFootprint =
    floorStack?.floors?.[0]?.grossAreaSqM !== undefined
      ? `${floorStack.floors[0].grossAreaSqM} m²`
      : valueFrom(properties, ["areaSqM", "footprintSqM", "area", "calculatedAreaSqM"])
        ? `${Number(valueFrom(properties, ["areaSqM", "footprintSqM", "area", "calculatedAreaSqM"])).toFixed(1)} m²`
        : notAvailable;

  // Real Property Attributes (Never fake!)
  const ownerName =
    valueFrom(properties, ["ownerName", "owner", "proprietaryName", "holder"]) ??
    notAvailable;

  const parcelStatus =
    valueFrom(properties, ["parcelStatus", "landUseStatus", "cadastralStatus", "status"]) ??
    notAvailable;

  const currentFloor =
    activeFloorIndex !== null && floorStack
      ? floorStack.floors.find(f => f.floorIndex === activeFloorIndex)
      : null;

  const unitsToDisplay: Array<{ floor: FloorStackLevel; unit: FloorUnitCadastre }> = [];
  if (floorStack) {
    if (currentFloor) {
      currentFloor.units.forEach(u => unitsToDisplay.push({ floor: currentFloor, unit: u }));
    } else {
      floorStack.floors.forEach(f => {
        f.units.forEach(u => unitsToDisplay.push({ floor: f, unit: u }));
      });
    }
  }

  const handleCopy = (textToCopy: string, label: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(textToCopy);
    toast.success(`${label} Copied`, { description: textToCopy });
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <section
      className="building-information-panel"
      aria-label="Building inspector panel"
    >
      {/* 1. Header */}
      <div className="building-information-heading border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              BUILDING INSPECTOR
            </span>
            {isOsm ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Visual Mesh Context
              </span>
            ) : (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Source-Backed Layer
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-100">{buildingName}</h2>
          {latitude !== null && longitude !== null && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
              <MapPin size={11} className="text-cyan-400 shrink-0" />
              <span>{latitude.toFixed(6)}°N, {longitude.toFixed(6)}°E</span>
            </p>
          )}
        </div>
        {isOsm ? (
          <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-1" />
        ) : (
          <ShieldCheck size={20} className="text-cyan-400 shrink-0 mt-1" />
        )}
      </div>

      {/* 2. SOURCE Section */}
      <div className="inspector-section">
        <h3 className="inspector-section-title">
          <FileText size={12} className="text-cyan-400" />
          SOURCE
        </h3>
        <div className="inspector-field-grid">
          <InspectorField label="Data Source" value={sourceName} />
          <InspectorField label="Category" value={sourceCategory} />
        </div>
      </div>

      {/* 3. IDENTIFICATION Section */}
      <div className="inspector-section">
        <h3 className="inspector-section-title">
          <Building2 size={12} className="text-cyan-400" />
          IDENTIFICATION
        </h3>
        <div className="inspector-field-grid">
          <div className="flex items-center justify-between inspector-field-row">
            <span className="field-label">Building ID:</span>
            <div className="flex items-center gap-1.5">
              <span className={`field-value ${buildingId === notAvailable ? "text-slate-500 italic" : "font-mono text-cyan-200"}`}>
                {buildingId}
              </span>
              {buildingId !== notAvailable && (
                <button
                  type="button"
                  onClick={() => handleCopy(buildingId, "Building ID")}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Copy ID"
                >
                  <Copy size={10} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between inspector-field-row">
            <span className="field-label">3D ULPIN:</span>
            <div className="flex items-center gap-1.5">
              <span className={`field-value ${ulpin === notAvailable ? "text-slate-500 italic" : "font-mono text-cyan-300 font-bold"}`}>
                {ulpin}
              </span>
              {ulpin !== notAvailable && (
                <button
                  type="button"
                  onClick={() => handleCopy(ulpin, "3D ULPIN")}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Copy 14-Digit 3D ULPIN"
                >
                  <Copy size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. GEOMETRY Section */}
      <div className="inspector-section">
        <h3 className="inspector-section-title">
          <Layers size={12} className="text-cyan-400" />
          GEOMETRY
        </h3>
        <div className="inspector-field-grid">
          <InspectorField label="Footprint Area" value={rawFootprint} />
          <InspectorField label="Building Height" value={rawHeight} highlight={rawHeight !== notAvailable} />
          <InspectorField label="Floors / Levels" value={rawFloors} highlight={rawFloors !== notAvailable} />
        </div>
      </div>

      {/* 5. PROPERTY Section */}
      <div className="inspector-section">
        <h3 className="inspector-section-title">
          <Scale size={12} className="text-cyan-400" />
          PROPERTY & CADASTRE
        </h3>
        <div className="inspector-field-grid">
          <InspectorField label="Registered Owner" value={ownerName} />
          <InspectorField label="Parcel Cadastre Status" value={parcelStatus} />
        </div>
      </div>

      {/* 6. Real Floor Stack & Cadastral Units (If Present) */}
      {floorStack && (
        <div className="inspector-section bg-slate-950/70 p-3 rounded-xl border border-cyan-500/25">
          <div className="flex items-center justify-between mb-2">
            <h3 className="inspector-section-title mb-0">
              <Layers size={12} className="text-cyan-400" />
              FLOOR-BY-FLOOR CADASTRE
            </h3>
            <span className="text-[11px] text-cyan-300 font-mono">
              {activeFloorIndex === null ? "All Floors" : `Level ${currentFloor?.floorCode}`}
            </span>
          </div>

          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            Select Floor Level
          </div>

          {/* Floor Level Pills */}
          <div className="flex flex-wrap gap-1.5 my-2">
            <button
              type="button"
              onClick={() => onFloorSelect?.(null)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activeFloorIndex === null
                  ? "bg-cyan-500 text-slate-950 font-extrabold shadow-sm shadow-cyan-500/40"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Floors
            </button>
            {floorStack.floors.map(floor => {
              const isActive = activeFloorIndex === floor.floorIndex;
              return (
                <button
                  key={floor.floorIndex}
                  type="button"
                  onClick={() => onFloorSelect?.(floor.floorIndex)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 ring-1 ring-cyan-200 font-extrabold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                  }`}
                  title={`${floor.floorName} (${floor.elevationMsl})`}
                >
                  {floor.floorCode}
                </button>
              );
            })}
          </div>

          {/* Registered Units on Floor */}
          {unitsToDisplay.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Registered Cadastral Units ({unitsToDisplay.length})
              </div>
              {unitsToDisplay.map(({ floor, unit }) => {
                const badge = getUnitTypeBadge(unit.unitType);
                return (
                  <div
                    key={unit.id}
                    onClick={() => onUnitSelect?.(floor, unit)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-slate-200">{unit.unitNumber}</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300">{unit.carpetAreaSqM} m²</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Owner: <b className="text-slate-300">{unit.owner.name}</b></span>
                      <span className="font-mono text-slate-500 truncate max-w-[120px]">{unit.ulpin3d}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3D Floor Separation (Explode View) */}
          {onExplosionFactorChange && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold mb-1">
                <span>3D Floor Separation (Explode View)</span>
                <span className="font-mono text-cyan-300">{Math.round(explosionFactor * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explosionFactor}
                onChange={e => onExplosionFactorChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          )}
        </div>
      )}

      {/* 7. EVIDENCE Section */}
      <div className="inspector-section border-t border-slate-800/80 pt-3">
        <h3 className="inspector-section-title">
          <ShieldCheck size={12} className="text-cyan-400" />
          EVIDENCE & INTEGRITY
        </h3>
        <div className="text-[10px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Evidence Basis:</span>
            <b className="text-slate-300">
              {isOsm ? "OSM 3D Photogrammetry Tile" : "Live PostGIS Geometry"}
            </b>
          </div>
          <div className="flex items-center justify-between">
            <span>Confidence:</span>
            <b className={isOsm ? "text-amber-400" : "text-emerald-400"}>
              {isOsm ? "Visual Context / Non-Cadastral" : "Source-backed"}
            </b>
          </div>

          <div className="mt-2 p-2 rounded bg-cyan-950/40 border border-cyan-500/20 text-[10px] text-cyan-200/90 leading-relaxed">
            <span className="font-semibold text-cyan-300 block mb-0.5">Data Integrity</span>
            The system does not invent cadastral facts—it visualizes authoritative data and explicitly reports unavailable attributes.
          </div>

          <p className="mt-1.5 p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            <Info size={11} className="inline mr-1 text-cyan-400" />
            Statutory Notice: 3D models and extruded geometries represent visual spatial context. Authoritative parcel boundaries, heights, ownership, and vertical ULPINs require verification by the state land revenue department.
          </p>
        </div>
      </div>
    </section>
  );
}

export default BuildingInformationPanel;
