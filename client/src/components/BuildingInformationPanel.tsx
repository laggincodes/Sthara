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

const unavailable = "Data not available / Not verified";

function valueFrom(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return null;
}

function formatNumber(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? unavailable
    : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
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

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div className="building-info-field">
      <dt>{label}</dt>
      <dd className={children === unavailable ? "unavailable" : ""}>
        {children}
      </dd>
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
  const [copiedUlpin, setCopiedUlpin] = useState<string | null>(null);

  if (!selection && !floorStack) {
    return (
      <section
        className="building-information-panel empty"
        aria-label="Building information panel"
      >
        <div className="building-information-heading">
          <div>
            <p>3D Cadastral & Floor Information</p>
            <h2>Select a visible building or search for a place</h2>
          </div>
          <Building2 size={18} />
        </div>
        <p className="building-information-empty-copy">
          Search for an institution (e.g. <b>IIT Patna</b>, <b>Amity University</b>, or <b>Patna Central Heights</b>) or click any building on the 3D map to inspect multi-storey floor stacks and cadastral units.
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
  const name =
    floorStack?.buildingName ??
    valueFrom(properties, ["name", "title", "buildingName"]) ??
    unavailable;
  const location =
    floorStack?.address ??
    valueFrom(properties, ["location", "address", "locality", "place"]) ??
    unavailable;
  const buildingType =
    valueFrom(properties, [
      "buildingType",
      "propertyType",
      "buildingUse",
      "use",
    ]) ?? "Institutional / Multi-Storey";
  const height = floorStack
    ? `${floorStack.actualHeightM.toFixed(1)} m (${floorStack.actualFloors})`
    : valueFrom(properties, ["approvedHeightMetres", "heightMetres"])
      ? `${valueFrom(properties, ["approvedHeightMetres", "heightMetres"])} m`
      : unavailable;

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

  const handleCopy = (ulpin: string) => {
    navigator.clipboard.writeText(ulpin);
    setCopiedUlpin(ulpin);
    toast.success("3D ULPIN Copied", { description: ulpin });
    setTimeout(() => setCopiedUlpin(null), 2000);
  };

  return (
    <section
      className="building-information-panel"
      aria-label="Building information panel"
    >
      {/* Top Header */}
      <div className="building-information-heading">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              3D Cadastre Active
            </span>
            {floorStack?.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS" && (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle size={10} /> Sanction Deviation
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-100">{name}</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin size={12} className="text-cyan-400 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        </div>
        {isOsm ? (
          <ShieldAlert size={20} className="text-amber-400" />
        ) : (
          <ShieldCheck size={20} className="text-cyan-400" />
        )}
      </div>

      {/* Building 3D Metrics Grid */}
      <dl className="building-information-grid">
        <Field label="Building Height">{height}</Field>
        <Field label="Total Storeys">
          {floorStack ? `${floorStack.floors.length} Levels (${floorStack.actualFloors})` : unavailable}
        </Field>
        <Field label="3D ULPIN Envelope">
          {floorStack?.ulpin ?? valueFrom(properties, ["ulpin"]) ?? unavailable}
        </Field>
        <Field label="Sanction Number">
          {floorStack?.municipalSanctionNo ?? unavailable}
        </Field>
      </dl>

      {/* Building Storeys / Level Stepper Simulator */}
      {onOverrideFloorCountChange && (
        <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl mb-3 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              Storey Level Detection / Simulator:
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
              {overrideFloorCount ? `${overrideFloorCount} Storeys (Manual)` : "Auto-Inferred from Sanction/Height"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { label: "Auto", count: null },
              { label: "4 Storeys (G+3)", count: 4 },
              { label: "7 Storeys (G+6)", count: 7 },
              { label: "8 Storeys (G+7)", count: 8 },
              { label: "10 Storeys (G+9)", count: 10 },
              { label: "12 Storeys (G+11)", count: 12 },
              { label: "15 Storeys (G+14)", count: 15 },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onOverrideFloorCountChange(preset.count)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  overrideFloorCount === preset.count
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-300"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3D Explosion Slicer Slider (Integrated in Panel) */}
      {onExplosionFactorChange && (
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              3D Floor Separation (Explode View)
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              {Math.round(explosionFactor * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={explosionFactor}
            onChange={e => onExplosionFactorChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0% Compact</span>
            <span>50% Layered</span>
            <span>100% Fully Exploded</span>
          </div>
        </div>
      )}

      {/* Floor-by-Floor Quick Slicer Selector */}
      {floorStack && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-cyan-400" />
              Select Floor Level
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {activeFloorIndex === null ? "Viewing All Floors" : `Level ${currentFloor?.floorCode || ""}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onFloorSelect?.(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFloorIndex === null
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50"
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/30 ring-2 ring-cyan-300"
                      : floor.isUnauthorizedFloor
                        ? "bg-rose-950/40 text-rose-300 border border-rose-700/50 hover:bg-rose-900/50"
                        : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50"
                  }`}
                  title={`${floor.floorName} (${floor.elevationMsl})`}
                >
                  {floor.floorCode}
                  {floor.isUnauthorizedFloor && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {currentFloor && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs">
              <div className="flex items-center justify-between font-bold text-cyan-300 mb-1">
                <span>{currentFloor.floorName}</span>
                <span className="font-mono text-[11px] bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-200">
                  {currentFloor.elevationMsl}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                <span>Floor Area: <b>{currentFloor.grossAreaSqM} m²</b></span>
                <span>Units on Floor: <b>{currentFloor.units.length}</b></span>
              </div>
              {currentFloor.isUnauthorizedFloor && (
                <div className="mt-2 p-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{currentFloor.heightViolationNotice || "Floor built without approved municipal height sanction."}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cadastral Units List */}
      {floorStack && unitsToDisplay.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>Registered Cadastral Units ({unitsToDisplay.length})</span>
            <span className="text-[10px] text-cyan-400 font-normal">Click unit for Deed & Clearances</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {unitsToDisplay.map(({ floor, unit }) => {
              const badge = getUnitTypeBadge(unit.unitType);
              return (
                <div
                  key={unit.id}
                  onClick={() => onUnitSelect?.(floor, unit)}
                  className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          Lvl {floor.floorCode}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                        {unit.unitNumber}
                      </h4>
                    </div>
                    <ChevronRight size={15} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>

                  {/* 3D ULPIN Row */}
                  <div className="mt-2 flex items-center justify-between gap-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-[10px] text-cyan-300 truncate">
                      {unit.ulpin3d}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleCopy(unit.ulpin3d);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      title="Copy 14-Digit 3D ULPIN"
                    >
                      <Copy size={11} />
                    </button>
                  </div>

                  {/* Unit Area / Owner / Clearances row */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-400">
                    <div>Carpet: <b className="text-slate-200">{unit.carpetAreaSqM} m²</b> ({unit.volumeCuM} m³)</div>
                    <div>Owner: <b className="text-slate-200 truncate inline-block max-w-[110px] align-bottom">{unit.owner.name}</b></div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Flame size={10} /> Fire NOC {unit.clearances.fireNoc}
                    </span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <Zap size={10} /> {unit.clearances.electricitySanctionedKw} kW
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <CheckCircle2 size={10} /> Tax {unit.clearances.municipalTaxStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification footer */}
      <div className="building-information-verification">
        <MapPin size={14} className="text-cyan-400 shrink-0" />
        <span>
          <b>Source / Cadastral Verification</b>
          {floorStack
            ? `National 3D ULPIN Cadastre · Institutional Block · Verified with ${floorStack.floors.length} levels & ${floorStack.totalUnits} volumetric units.`
            : "Live PostGIS source layer; floor levels rendered dynamically for this footprint."}
        </span>
      </div>
    </section>
  );
}

export default BuildingInformationPanel;
