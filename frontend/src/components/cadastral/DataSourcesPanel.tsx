"use client";

import React, { useState, useEffect } from "react";
import { SpatialSource, SourceRegisterRequest, SpatialSourceType } from "@/types/cadastre";
import { cadastreApi } from "@/lib/api/client";

interface DataSourcesPanelProps {
  activeDatasetId: string;
  onToggleReferenceLayer?: (sourceId: string, visible: boolean) => void;
  visibleReferenceSourceIds?: string[];
  onSelectSourceFilter?: (sourceId: string | null) => void;
  selectedSourceFilter?: string | null;
}

export function DataSourcesPanel({
  activeDatasetId,
  onToggleReferenceLayer,
  visibleReferenceSourceIds = [],
  onSelectSourceFilter,
  selectedSourceFilter,
}: DataSourcesPanelProps) {
  const [sources, setSources] = useState<SpatialSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<SpatialSource | null>(null);

  // Form State
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<SpatialSourceType>("Reference Layer");
  const [newSourceCrs, setNewSourceCrs] = useState("EPSG:4326");
  const [newSourceDesc, setNewSourceDesc] = useState("");
  const [newGeoJsonText, setNewGeoJsonText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshSources = async () => {
    if (!activeDatasetId) return;
    setIsLoading(true);
    try {
      const res = await cadastreApi.listSources(activeDatasetId);
      setSources(res.sources || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await cadastreApi.listSources(activeDatasetId);
        if (active) {
          setSources(res.sources || []);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load sources");
          setSources([]);
          setIsLoading(false);
        }
      }
    }
    if (activeDatasetId) {
      load();
    }
    return () => {
      active = false;
    };
  }, [activeDatasetId]);

  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) {
      setFormError("Source name is required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      let parsedFeatures: Record<string, unknown> | undefined = undefined;
      if (newGeoJsonText.trim()) {
        try {
          parsedFeatures = JSON.parse(newGeoJsonText.trim());
        } catch {
          setFormError("Invalid GeoJSON JSON text syntax.");
          setIsSubmitting(false);
          return;
        }
      }

      const req: SourceRegisterRequest = {
        dataset_id: activeDatasetId,
        source_name: newSourceName.trim(),
        source_type: newSourceType,
        crs: newSourceCrs.trim() || "EPSG:4326",
        description: newSourceDesc.trim() || undefined,
        format: "GeoJSON",
        features: parsedFeatures,
      };

      await cadastreApi.registerSource(req);
      setNewSourceName("");
      setNewSourceDesc("");
      setNewGeoJsonText("");
      setIsAdding(false);
      await refreshSources();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to register source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSource = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove spatial source '${sourceId}'?`)) return;
    try {
      await cadastreApi.deleteSource(activeDatasetId, sourceId);
      if (selectedSourceDetail?.source_id === sourceId) {
        setSelectedSourceDetail(null);
      }
      if (selectedSourceFilter === sourceId && onSelectSourceFilter) {
        onSelectSourceFilter(null);
      }
      await refreshSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete source");
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "VALID":
      case "Imported":
        return {
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          color: "#10B981",
          borderColor: "rgba(16, 185, 129, 0.3)",
        };
      case "WARNING":
        return {
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          color: "#F59E0B",
          borderColor: "rgba(245, 158, 11, 0.3)",
        };
      default:
        return {
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          color: "#EF4444",
          borderColor: "rgba(239, 68, 68, 0.3)",
        };
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden text-xs"
      style={{
        backgroundColor: "var(--sth-card)",
        color: "var(--sth-text)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: "var(--sth-border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--sth-sage)" }}
          />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Spatial Sources & Layers
          </span>
          <span
            className="px-1.5 py-0.2 rounded text-[10px] border"
            style={{
              backgroundColor: "var(--sth-geo-bg)",
              color: "var(--sth-geo)",
              borderColor: "var(--sth-border)",
            }}
          >
            {sources.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-2 py-0.5 rounded text-[11px] border font-medium transition-colors"
          style={{
            borderColor: isAdding ? "var(--sth-geo)" : "var(--sth-border)",
            backgroundColor: isAdding ? "var(--sth-geo-bg)" : "transparent",
            color: isAdding ? "var(--sth-geo)" : "var(--sth-text-muted)",
          }}
          title={isAdding ? "Cancel Add Source" : "Register New Reference Source"}
        >
          {isAdding ? "Cancel" : "+ Add Source"}
        </button>
      </div>

      {/* ── Content Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Dataset Context Bar */}
        <div
          className="px-2.5 py-1.5 rounded border text-[11px] flex items-center justify-between"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            borderColor: "var(--sth-border)",
          }}
        >
          <span className="text-[10px] uppercase text-zinc-400">Context:</span>
          <span className="font-medium truncate max-w-[190px]" style={{ color: "var(--sth-geo)" }}>
            {activeDatasetId || "No active dataset"}
          </span>
        </div>

        {/* Inline Registration Form */}
        {isAdding && (
          <form
            onSubmit={handleRegisterSource}
            className="p-3 rounded border space-y-2.5"
            style={{
              backgroundColor: "var(--sth-card-accent)",
              borderColor: "var(--sth-geo)",
            }}
          >
            <div className="text-[11px] font-semibold text-zinc-300">
              Register Spatial Reference Source
            </div>

            {formError && (
              <div className="p-1.5 rounded bg-red-950/60 border border-red-800 text-red-300 text-[10px]">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                Source Name *
              </label>
              <input
                type="text"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g. Ward 12 Boundary or Survey Points"
                className="w-full px-2 py-1 rounded bg-black/40 border border-zinc-700 text-xs focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                  Source Type
                </label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value as SpatialSourceType)}
                  className="w-full px-1.5 py-1 rounded bg-black/40 border border-zinc-700 text-xs focus:outline-none"
                >
                  <option value="Reference Layer">Reference Layer</option>
                  <option value="GeoJSON">GeoJSON</option>
                  <option value="User-provided">User-provided</option>
                  <option value="DataMeet">DataMeet</option>
                  <option value="OSM">OSM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                  Declared CRS
                </label>
                <input
                  type="text"
                  value={newSourceCrs}
                  onChange={(e) => setNewSourceCrs(e.target.value)}
                  placeholder="EPSG:4326"
                  className="w-full px-2 py-1 rounded bg-black/40 border border-zinc-700 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newSourceDesc}
                onChange={(e) => setNewSourceDesc(e.target.value)}
                placeholder="Reference context description"
                className="w-full px-2 py-1 rounded bg-black/40 border border-zinc-700 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                Inline GeoJSON Features (Optional)
              </label>
              <textarea
                value={newGeoJsonText}
                onChange={(e) => setNewGeoJsonText(e.target.value)}
                placeholder='{"type": "FeatureCollection", "features": [...]}'
                rows={3}
                className="w-full px-2 py-1 rounded bg-black/40 border border-zinc-700 text-[10px] font-mono focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Save Source"}
              </button>
            </div>
          </form>
        )}

        {/* Loading / Error States */}
        {isLoading && (
          <div className="text-center py-4 text-zinc-500 animate-pulse">
            Loading dataset sources...
          </div>
        )}

        {error && (
          <div className="p-2 rounded bg-red-950/40 border border-red-800 text-red-300 text-[11px]">
            {error}
          </div>
        )}

        {/* Source List */}
        {!isLoading && sources.length === 0 && !error && (
          <div className="text-center py-6 text-zinc-500 italic">
            No registered sources found for this dataset.
          </div>
        )}

        {!isLoading && sources.length > 0 && (
          <div className="space-y-2">
            {sources.map((src) => {
              const isVisible = visibleReferenceSourceIds.includes(src.source_id);
              const isSelected = selectedSourceDetail?.source_id === src.source_id;
              const isFiltered = selectedSourceFilter === src.source_id;

              return (
                <div
                  key={src.source_id}
                  onClick={() => setSelectedSourceDetail(isSelected ? null : src)}
                  className={`p-2.5 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-500/80 bg-black/40 shadow-sm"
                      : "border-zinc-800 hover:border-zinc-700 bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-zinc-200 truncate">
                          {src.source_name}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono border"
                          style={{
                            backgroundColor: "rgba(139, 92, 246, 0.15)",
                            color: "#A78BFA",
                            borderColor: "rgba(139, 92, 246, 0.3)",
                          }}
                        >
                          {src.source_type}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono border"
                          style={getBadgeStyle(src.status)}
                        >
                          {src.status}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                        <span>ID: {src.source_id}</span>
                        <span>•</span>
                        <span>CRS: {src.crs}</span>
                        <span>•</span>
                        <span>Features: {src.feature_count}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Layer Visibility Toggle */}
                      {onToggleReferenceLayer && src.feature_count > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleReferenceLayer(src.source_id, !isVisible);
                          }}
                          className={`p-1 rounded border text-[10px] transition-colors ${
                            isVisible
                              ? "bg-cyan-950/80 border-cyan-700 text-cyan-300"
                              : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                          }`}
                          title={isVisible ? "Hide Reference Layer" : "Show Reference Layer on Map"}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Filter by Source */}
                      {onSelectSourceFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSourceFilter(isFiltered ? null : src.source_id);
                          }}
                          className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-mono ${
                            isFiltered
                              ? "bg-amber-950/80 border-amber-700 text-amber-300"
                              : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                          title={isFiltered ? "Clear Filter" : "Filter Map by Source"}
                        >
                          {isFiltered ? "Active" : "Filter"}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSource(src.source_id, e)}
                        className="p-1 rounded border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-900"
                        title="Delete Source"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isSelected && (
                    <div
                      className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] space-y-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {src.description && (
                        <div className="text-zinc-300 italic mb-1">
                          {src.description}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-zinc-400">
                        <div>Working CRS: <span className="text-zinc-200">{src.working_crs}</span></div>
                        <div>Format: <span className="text-zinc-200">{src.format}</span></div>
                        <div>Imported: <span className="text-zinc-200">{new Date(src.imported_at).toLocaleDateString()}</span></div>
                        {src.file_name && <div>File: <span className="text-zinc-200">{src.file_name}</span></div>}
                      </div>

                      {/* Disclaimer */}
                      <div
                        className="mt-2 p-1.5 rounded border text-[9px] leading-tight"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          borderColor: "var(--sth-border)",
                          color: "var(--sth-text-muted)",
                        }}
                      >
                        <span className="font-semibold text-zinc-400">Notice: </span>
                        {src.disclaimer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
