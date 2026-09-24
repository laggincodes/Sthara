import React, { useState, useId, useMemo, useEffect } from "react";
import { BuildingSourceAttributes } from "@/lib/cadastral/sourceAttributes";
import { useCadastreContext } from "@/context/CadastreContext";
import { cadastreApi, BuildingBlueprintRecord, DrawingAnalysis, BuildModelResult } from "@/lib/api/client";
import { BuildingBlueprintViewerModal } from "./BuildingBlueprintViewerModal";
import { DrawingImportModal } from "../drawing/DrawingImportModal";
import { DrawingReviewWorkspace } from "../drawing/DrawingReviewWorkspace";

export interface BuildingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: string | null;
  buildingName?: string | null;
  initialFloors?: number;
  initialBasements?: number;
  initialHeight?: number;
  footprintAreaSqm?: number | null;
  sourceAttributes?: BuildingSourceAttributes | null;
  onGenerate: (config: {
    buildingId: string;
    numberOfFloors: number;
    numberOfBasements: number;
    buildingHeight: number;
  }) => Promise<void>;
}

export function BuildingConfigModal(props: BuildingConfigModalProps) {
  if (!props.isOpen || !props.buildingId) return null;
  return <BuildingConfigModalContent key={props.buildingId} {...props} />;
}

function BuildingConfigModalContent({
  onClose,
  buildingId,
  buildingName,
  initialFloors,
  initialBasements,
  initialHeight,
  footprintAreaSqm,
  sourceAttributes,
  onGenerate,
}: BuildingConfigModalProps) {
  const { activeDatasetId } = useCadastreContext();
  const dsId = activeDatasetId || "ds_tagore_garden_map_osm";

  const [blueprint, setBlueprint] = useState<BuildingBlueprintRecord | null>(null);
  const [isUploadingBlueprint, setIsUploadingBlueprint] = useState<boolean>(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);

  // Drawing Intelligence state
  const [isDrawingImportOpen, setIsDrawingImportOpen] = useState<boolean>(false);
  const [isDrawingReviewOpen, setIsDrawingReviewOpen] = useState<boolean>(false);
  const [drawingAnalysis, setDrawingAnalysis] = useState<DrawingAnalysis | null>(null);

  useEffect(() => {
    if (buildingId) {
      cadastreApi
        .getBuildingBlueprint(dsId, buildingId)
        .then((res) => {
          if (res.success && res.blueprint) {
            setBlueprint(res.blueprint);
          } else {
            setBlueprint(null);
          }
        })
        .catch(() => setBlueprint(null));
    }
  }, [buildingId, dsId]);

  const handleUploadBlueprint = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !buildingId) return;
    setIsUploadingBlueprint(true);
    setBlueprintError(null);
    try {
      const res = await cadastreApi.uploadBuildingBlueprint(dsId, buildingId, file);
      if (res.success && res.blueprint) {
        setBlueprint(res.blueprint);
      }
    } catch (err: unknown) {
      setBlueprintError(err instanceof Error ? err.message : "Failed to upload building blueprint.");
    } finally {
      setIsUploadingBlueprint(false);
      e.target.value = "";
    }
  };

  const handleRemoveBlueprint = async () => {
    if (!buildingId) return;
    setIsUploadingBlueprint(true);
    setBlueprintError(null);
    try {
      await cadastreApi.deleteBuildingBlueprint(dsId, buildingId);
      setBlueprint(null);
    } catch (err: unknown) {
      setBlueprintError(err instanceof Error ? err.message : "Failed to remove building blueprint.");
    } finally {
      setIsUploadingBlueprint(false);
    }
  };
  // Use source attributes if available, otherwise fall back to explicit initial props or Step 1 defaults
  const startingFloors = sourceAttributes ? sourceAttributes.defaultFloors : (initialFloors ?? 5);
  const startingBasements = sourceAttributes ? sourceAttributes.defaultBasements : (initialBasements ?? 0);
  const startingHeight = sourceAttributes ? sourceAttributes.defaultHeight : (initialHeight ?? 18.0);

  const [numberOfFloors, setNumberOfFloors] = useState<string>(String(startingFloors));
  const [numberOfBasements, setNumberOfBasements] = useState<string>(String(startingBasements));
  const [buildingHeight, setBuildingHeight] = useState<string>(String(startingHeight));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titleId = useId();

  // Handle resetting back to source detected values
  const handleResetToSource = () => {
    if (!sourceAttributes) return;
    setNumberOfFloors(String(sourceAttributes.defaultFloors));
    setNumberOfBasements(String(sourceAttributes.defaultBasements));
    setBuildingHeight(String(sourceAttributes.defaultHeight));
  };

  // Validation
  const parsedFloors = Number(numberOfFloors);
  const parsedBasements = Number(numberOfBasements);
  const parsedHeight = Number(buildingHeight);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!numberOfFloors || isNaN(parsedFloors) || !Number.isInteger(parsedFloors) || parsedFloors < 1) {
      errors.push("Number of floors must be an integer ≥ 1.");
    }
    if (numberOfBasements === "" || isNaN(parsedBasements) || !Number.isInteger(parsedBasements) || parsedBasements < 0) {
      errors.push("Number of basements must be an integer ≥ 0.");
    }
    if (!buildingHeight || isNaN(parsedHeight) || parsedHeight <= 0) {
      errors.push("Building height must be a positive number (> 0 m).");
    }
    return errors;
  }, [numberOfFloors, numberOfBasements, buildingHeight, parsedFloors, parsedBasements, parsedHeight]);

  const isValid = validationErrors.length === 0;

  // Dynamic provenance determination based on current input values vs source attributes
  const currentFloorsSource = useMemo(() => {
    if (!sourceAttributes || !sourceAttributes.hasDetectedFloors) return "Configured / Derived";
    if (parsedFloors === sourceAttributes.detectedFloors) {
      return sourceAttributes.floorsSourceLabel;
    }
    return "Configured / Derived";
  }, [sourceAttributes, parsedFloors]);

  const currentBasementsSource = useMemo(() => {
    if (!sourceAttributes || !sourceAttributes.hasDetectedBasements) return "Configured / Derived";
    if (parsedBasements === sourceAttributes.detectedBasements) {
      return sourceAttributes.basementsSourceLabel;
    }
    return "Configured / Derived";
  }, [sourceAttributes, parsedBasements]);

  const currentHeightSource = useMemo(() => {
    if (!sourceAttributes) return "Configured / Derived";
    if (sourceAttributes.hasDetectedHeight && parsedHeight === sourceAttributes.detectedHeight) {
      return sourceAttributes.heightSourceLabel;
    }
    // Check if derived from floor levels
    if (
      !sourceAttributes.hasDetectedHeight &&
      sourceAttributes.hasDetectedFloors &&
      sourceAttributes.detectedFloors !== null &&
      parsedFloors === sourceAttributes.detectedFloors &&
      parsedHeight === Number((sourceAttributes.detectedFloors * 3.0).toFixed(2))
    ) {
      return "Source: Derived from OSM levels";
    }
    return "Configured / Derived";
  }, [sourceAttributes, parsedHeight, parsedFloors]);

  const isFloorsOverridden = sourceAttributes?.hasDetectedFloors && parsedFloors !== sourceAttributes.detectedFloors;
  const isBasementsOverridden = sourceAttributes?.hasDetectedBasements && parsedBasements !== sourceAttributes.detectedBasements;
  const isHeightOverridden = sourceAttributes?.hasDetectedHeight
    ? parsedHeight !== sourceAttributes.detectedHeight
    : Boolean(
        sourceAttributes?.hasDetectedFloors &&
        sourceAttributes.detectedFloors !== null &&
        parsedHeight !== Number((sourceAttributes.detectedFloors * 3.0).toFixed(2))
      );

  const hasAnyOverrides = Boolean(isFloorsOverridden || isBasementsOverridden || isHeightOverridden);

  // Floor slice calculations
  const floorHeightM = isValid && parsedFloors > 0 ? Number((parsedHeight / parsedFloors).toFixed(2)) : 0;
  const basementDepthM = 3.0; // Sensible deterministic architectural basement depth

  // Generate levels preview
  const levelsPreview = useMemo(() => {
    if (!isValid) return [];
    const levels: Array<{ name: string; type: string; zMin: string; zMax: string; isTop?: boolean }> = [];

    // Basements (deepest to -1)
    for (let b = parsedBasements; b >= 1; b--) {
      const zMin = -(b * basementDepthM);
      const zMax = -((b - 1) * basementDepthM);
      levels.push({
        name: `Basement -${b}`,
        type: "Basement",
        zMin: `${zMin.toFixed(1)}m`,
        zMax: `${zMax.toFixed(1)}m`,
      });
    }

    // Above-ground floors (0 to N-1)
    for (let i = 0; i < parsedFloors; i++) {
      const zMin = i * floorHeightM;
      const zMax = i === parsedFloors - 1 ? parsedHeight : (i + 1) * floorHeightM;
      levels.push({
        name: i === 0 ? "Ground Floor" : `Floor ${i}`,
        type: "Above Ground",
        zMin: `${zMin.toFixed(1)}m`,
        zMax: `${zMax.toFixed(1)}m`,
        isTop: i === parsedFloors - 1 && parsedFloors > 1,
      });
    }

    return levels;
  }, [isValid, parsedFloors, parsedBasements, parsedHeight, floorHeightM]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || !isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onGenerate({
        buildingId,
        numberOfFloors: parsedFloors,
        numberOfBasements: parsedBasements,
        buildingHeight: parsedHeight,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to generate 3D building models.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--sth-border)] bg-[var(--sth-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-[var(--sth-border)] flex items-center justify-between"
          style={{ backgroundColor: "var(--sth-surface)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#DDBCB4]"
              style={{ backgroundColor: "var(--sth-clay-bg)", color: "var(--sth-accent)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 id={titleId} className="text-sm font-bold text-[var(--sth-text)]">
                Building Configuration
              </h2>
              <p className="text-[11px] font-mono text-[var(--sth-text-2)] truncate max-w-[280px]">
                {buildingName || buildingId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--sth-text-2)] hover:text-[var(--sth-text)] p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Building Footprint Context */}
          <div
            className="p-3 rounded-lg border border-[var(--sth-border)] text-xs flex items-center justify-between"
            style={{ backgroundColor: "var(--sth-surface)" }}
          >
            <div>
              <span className="text-[10px] font-mono text-[var(--sth-text-2)] uppercase block">
                Selected 2D Footprint
              </span>
              <span className="font-mono font-semibold text-[var(--sth-text)]">
                {buildingId}
              </span>
            </div>
            {footprintAreaSqm && (
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--sth-text-2)] uppercase block">
                  Ground Area
                </span>
                <span className="font-mono font-semibold text-[var(--sth-accent)]">
                  {footprintAreaSqm.toFixed(1)} m²
                </span>
              </div>
            )}
          </div>

          {/* Plan-to-Spatial Model / Drawing Intelligence Banner */}
          <div className="p-3 rounded-lg border border-[#DDBCB4] bg-[#A85D48]/5 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#A85D48]" />
                <span className="font-mono font-bold text-xs text-[#A85D48]">
                  DRAWING INTELLIGENCE v1
                </span>
              </div>
              <p className="text-[11px] text-[#62635D] mt-0.5">
                Import multi-drawing PDFs (ARCH/STRU) to detect floors, typical levels &amp; units automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawingImportOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#A85D48] text-white font-mono text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import Drawings</span>
            </button>
          </div>

          {/* Detected from Source Banner */}
          {sourceAttributes && (
            <div
              className="p-3 rounded-lg border border-[var(--sth-border)] space-y-2"
              style={{ backgroundColor: "var(--sth-surface)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--sth-text)] flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[var(--sth-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detected from Source
                  </span>
                  <span className="text-[10px] font-mono text-[var(--sth-text-2)]">
                    {sourceAttributes.statusSummary.hasAnySourceAttributes
                      ? "(Auto-read from dataset)"
                      : "(No vertical tags found in dataset)"}
                  </span>
                </div>
                {hasAnyOverrides && sourceAttributes.statusSummary.hasAnySourceAttributes && (
                  <button
                    type="button"
                    onClick={handleResetToSource}
                    className="text-[10px] font-mono font-medium text-[var(--sth-accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>↺</span> Reset to Detected Values
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sourceAttributes.hasDetectedHeight ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Height ({sourceAttributes.detectedHeight}m)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {sourceAttributes.hasDetectedFloors && sourceAttributes.detectedFloors !== null
                      ? `Height: Derived (${(sourceAttributes.detectedFloors * 3.0).toFixed(1)}m)`
                      : "Height: Fallback (18m)"}
                  </span>
                )}
                {sourceAttributes.hasDetectedFloors ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Floor count ({sourceAttributes.detectedFloors})
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 text-[var(--sth-text-2)]">
                    Floors: Fallback (5)
                  </span>
                )}
                {sourceAttributes.hasDetectedBasements ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Basement count ({sourceAttributes.detectedBasements})
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 text-[var(--sth-text-2)]">
                    Basements: None (0)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Number of Floors */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="cfg-floors"
                  className="block text-[11px] font-mono font-medium text-[var(--sth-text-2)] uppercase"
                >
                  Floors
                </label>
                <span
                  title={currentFloorsSource}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[110px] ${
                    currentFloorsSource.startsWith("Source: OSM")
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-[var(--sth-card)] text-[var(--sth-text-2)] border border-[var(--sth-border)]"
                  }`}
                >
                  {currentFloorsSource.replace("Source: ", "")}
                </span>
              </div>
              <input
                id="cfg-floors"
                type="number"
                min="1"
                step="1"
                value={numberOfFloors}
                onChange={(e) => setNumberOfFloors(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text)] focus:border-[var(--sth-accent)] focus:outline-none transition-colors"
                placeholder="5"
                required
              />
              <span className="text-[9px] font-mono text-[var(--sth-text-2)] mt-0.5 block">
                Above ground (≥ 1)
              </span>
            </div>

            {/* Number of Basements */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="cfg-basements"
                  className="block text-[11px] font-mono font-medium text-[var(--sth-text-2)] uppercase"
                >
                  Basements
                </label>
                <span
                  title={currentBasementsSource}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[110px] ${
                    currentBasementsSource.startsWith("Source: OSM")
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-[var(--sth-card)] text-[var(--sth-text-2)] border border-[var(--sth-border)]"
                  }`}
                >
                  {currentBasementsSource.replace("Source: ", "")}
                </span>
              </div>
              <input
                id="cfg-basements"
                type="number"
                min="0"
                step="1"
                value={numberOfBasements}
                onChange={(e) => setNumberOfBasements(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text)] focus:border-[var(--sth-accent)] focus:outline-none transition-colors"
                placeholder="0"
                required
              />
              <span className="text-[9px] font-mono text-[var(--sth-text-2)] mt-0.5 block">
                Subterranean (≥ 0)
              </span>
            </div>

            {/* Building Height */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="cfg-height"
                  className="block text-[11px] font-mono font-medium text-[var(--sth-text-2)] uppercase"
                >
                  Height (m)
                </label>
                <span
                  title={currentHeightSource}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[110px] ${
                    currentHeightSource.startsWith("Source: OSM") || currentHeightSource.startsWith("Source: Derived")
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-[var(--sth-card)] text-[var(--sth-text-2)] border border-[var(--sth-border)]"
                  }`}
                >
                  {currentHeightSource.replace("Source: ", "")}
                </span>
              </div>
              <div className="relative">
                <input
                  id="cfg-height"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={buildingHeight}
                  onChange={(e) => setBuildingHeight(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 pr-7 text-xs font-mono rounded-md border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text)] focus:border-[var(--sth-accent)] focus:outline-none transition-colors"
                  placeholder="18.0"
                  required
                />
                <span className="absolute right-2.5 top-2 text-xs font-mono text-[var(--sth-text-2)] pointer-events-none">
                  m
                </span>
              </div>
              <span className="text-[9px] font-mono text-[var(--sth-text-2)] mt-0.5 block">
                Roof to ground (&gt; 0)
              </span>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-2.5 rounded-md border border-[#DDBCB4] bg-[var(--sth-clay-bg)] text-xs text-[var(--sth-clay)] font-mono space-y-0.5">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Structural Hierarchy Preview */}
          {isValid && (
            <div className="rounded-lg border border-[var(--sth-border)] p-3 space-y-2 bg-[var(--sth-surface)]">
              <div className="flex items-center justify-between border-b border-[var(--sth-border)] pb-1.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--sth-text-2)]">
                  Structural Hierarchy Preview
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold"
                  style={{
                    backgroundColor: "var(--sth-sage-bg)",
                    color: "var(--sth-sage)",
                    border: "1px solid #C0CAC0",
                  }}
                >
                  {levelsPreview.length} Separate 3D Solids
                </span>
              </div>

              {/* Floor list preview */}
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {levelsPreview.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded text-[11px] font-mono border"
                    style={
                      lvl.type === "Basement"
                        ? {
                            backgroundColor: "rgba(59, 130, 246, 0.08)",
                            borderColor: "rgba(59, 130, 246, 0.25)",
                            color: "#2563eb",
                          }
                        : {
                            backgroundColor: "var(--sth-card)",
                            borderColor: "var(--sth-border)",
                            color: "var(--sth-text)",
                          }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: lvl.type === "Basement" ? "#3b82f6" : "var(--sth-sage)",
                        }}
                      />
                      <span className="font-semibold">{lvl.name}</span>
                      <span className="text-[9px] opacity-75">({lvl.type})</span>
                    </div>
                    <span className="text-[10px] font-medium opacity-85">
                      {lvl.zMin} → {lvl.zMax}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metrics Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--sth-border)] text-[10px] font-mono text-[var(--sth-text-2)]">
                <div>
                  Avg. Floor Height:{" "}
                  <strong className="text-[var(--sth-text)]">{floorHeightM}m</strong>
                </div>
                <div>
                  Basement Depth:{" "}
                  <strong className="text-[#2563eb]">
                    {parsedBasements > 0 ? `${(parsedBasements * basementDepthM).toFixed(1)}m` : "None"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Provenance Disclosure */}
          <div
            className="p-2.5 rounded-md border border-[#D8C8A8] text-[10px] leading-relaxed"
            style={{ backgroundColor: "var(--sth-geo-bg)", color: "var(--sth-text-2)" }}
          >
            <div className="font-semibold text-[var(--sth-geo)] uppercase tracking-wider mb-0.5">
              Source Attribution
            </div>
            Active provenance:{" "}
            <strong className="text-[var(--sth-text)]">
              Height ({currentHeightSource}) | Floors ({currentFloorsSource}) | Basements ({currentBasementsSource})
            </strong>
            . Horizontal boundary geometry is preserved identically from the selected 2D building footprint.
          </div>

          {/* Building Blueprint Attachment Section */}
          <div className="space-y-2 pt-1 border-t border-[var(--sth-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--sth-text-2)]">
                Building Blueprint
              </span>
              <span className="text-[9px] font-mono text-[var(--sth-text-2)]">
                Whole Building Reference
              </span>
            </div>

            {blueprintError && (
              <div className="p-2 rounded border border-[#DDBCB4] bg-[var(--sth-clay-bg)] text-[11px] text-[var(--sth-clay)] font-mono">
                {blueprintError}
              </div>
            )}

            {!blueprint ? (
              <div className="p-3.5 rounded-lg border border-dashed border-[var(--sth-border)] bg-[var(--sth-surface)] flex flex-col items-center text-center space-y-2">
                <span className="text-xs font-mono text-[var(--sth-text-2)]">
                  No building blueprint attached
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[var(--sth-accent)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
                  {isUploadingBlueprint ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>+ Add Building Blueprint</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleUploadBlueprint}
                        className="hidden"
                        disabled={isUploadingBlueprint}
                      />
                    </>
                  )}
                </label>
                <span className="text-[10px] font-mono text-[var(--sth-text-2)] opacity-80">
                  Supported: PDF, PNG, JPG, JPEG • Max 10 MB
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-[#D8C8A8] bg-[var(--sth-geo-bg)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="px-2 py-1 rounded bg-[#E9E5DA] text-[10px] font-mono font-bold text-[var(--sth-geo)] border border-[#D8C8A8] shrink-0 uppercase">
                    {blueprint.file_type}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--sth-text)] truncate">
                      {blueprint.filename}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--sth-text-2)]">
                      {blueprint.file_type} • {(blueprint.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    className="px-2.5 py-1 rounded bg-[#E9E5DA] text-[var(--sth-text)] border border-[var(--sth-border)] hover:bg-[#D7D4CB] transition-colors cursor-pointer"
                  >
                    View
                  </button>
                  <label className="px-2.5 py-1 rounded bg-[#E9E5DA] text-[var(--sth-text)] border border-[var(--sth-border)] hover:bg-[#D7D4CB] transition-colors cursor-pointer inline-block">
                    <span>Replace</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleUploadBlueprint}
                      className="hidden"
                      disabled={isUploadingBlueprint}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveBlueprint}
                    disabled={isUploadingBlueprint}
                    className="px-2.5 py-1 rounded bg-[#FAF0EE] text-[#C05040] border border-[#DDBCB4] hover:bg-[#F5E1DD] transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submission Error */}
          {submitError && (
            <div className="p-2.5 rounded-md border border-[#DDBCB4] bg-[var(--sth-clay-bg)] text-xs text-[var(--sth-clay)] font-mono">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--sth-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text-2)] hover:text-[var(--sth-text)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow transition-opacity disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: "var(--sth-accent)" }}
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating 3D...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Generate 3D
                </>
              )}
            </button>
          </div>
        </form>

        {/* Building Blueprint Viewer Modal */}
        <BuildingBlueprintViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          blueprint={blueprint}
          buildingName={buildingName || buildingId}
        />

        {/* Drawing Intelligence Import Modal */}
        <DrawingImportModal
          isOpen={isDrawingImportOpen}
          onClose={() => setIsDrawingImportOpen(false)}
          datasetId={dsId}
          onAnalysisReady={(res) => {
            setDrawingAnalysis(res);
            setIsDrawingReviewOpen(true);
          }}
        />

        {/* Drawing Intelligence Review Workspace */}
        {drawingAnalysis && (
          <DrawingReviewWorkspace
            isOpen={isDrawingReviewOpen}
            onClose={() => setIsDrawingReviewOpen(false)}
            analysis={drawingAnalysis}
            datasetId={dsId}
            onModelBuilt={(modelRes) => {
              // Update form state with values from drawing model
              setNumberOfFloors(String(modelRes.number_of_floors));
              setBuildingHeight(String(modelRes.total_height_m));
              setIsDrawingReviewOpen(false);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
