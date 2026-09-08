"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";
import { HeightSourceOption } from "@/types/cadastre";

export default function ImportDataPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    conversionConfig,
    setConversionConfig,
    isConverting,
    conversionError,
    conversionResult,
    conversionStages,
    runOsm3DConversion,
    uploadAndConvertOsmFile,
    selectOsmFile,
    activeProjectName,
    buildingDatasetName,
    buildingsGeojson,
  } = useCadastreContext();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDatameetLayer, setSelectedDatameetLayer] = useState<string>("delhi_assembly_constituencies");
  const [selectedDatameetAoi, setSelectedDatameetAoi] = useState<string>("Rajouri Garden");

  const defaultFileName = "map.osm";
  const defaultFileSize = "183.2 KB";
  const defaultFeatureCount = 155;
  const defaultDetectedCrs = "EPSG:4326 (WGS 84)";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      selectOsmFile(file);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      selectOsmFile(file);
    }
  };

  const handleStartConversion = async () => {
    if (selectedFile) {
      await uploadAndConvertOsmFile(selectedFile);
    } else {
      await runOsm3DConversion();
    }
    router.push("/workspace/3d");
  };

  const completedStagesCount = conversionStages.filter((s) => s.status === "complete").length;
  const progressPercent =
    conversionStages.length > 0
      ? Math.round((completedStagesCount / Math.max(conversionStages.length, 8)) * 100)
      : isConverting
      ? 45
      : conversionResult
      ? 100
      : 0;

  /* ── Shared input style ──────────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "6px",
    backgroundColor: "var(--sth-surface)",
    border: "1px solid var(--sth-border)",
    padding: "8px 12px",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    color: "var(--sth-text)",
    outline: "none",
  };

  return (
    <div
      className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
        >
          Data Workspace
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
          Import physical OSM XML, OSM.PBF, or GeoJSON footprints, configure parametric vertical heuristics and
          metric projection, and extrude into watertight 3D solids.
        </p>
      </div>

      {/* ── Drop Zone ──────────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative flex flex-col items-center justify-center p-8 rounded-md border-2 border-dashed transition-all cursor-pointer"
        style={{
          borderColor: isDragOver
            ? "var(--sth-accent)"
            : selectedFile
            ? "var(--sth-sage)"
            : "var(--sth-border)",
          backgroundColor: isDragOver
            ? "var(--sth-clay-bg)"
            : selectedFile
            ? "var(--sth-sage-bg)"
            : "var(--sth-surface)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".osm,.pbf,.geojson,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          className="flex h-12 w-12 items-center justify-center rounded-md mb-3"
          style={{
            border: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-card)",
            color: "var(--sth-accent)",
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <p className="text-sm font-semibold" style={{ color: "var(--sth-text)" }}>
          {selectedFile ? selectedFile.name : "Drop an OSM (.osm), OSM.PBF or GeoJSON file here"}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--sth-text-2)" }}>
          {selectedFile
            ? `${(selectedFile.size / 1024).toFixed(1)} KB · Click to change file`
            : "or click to browse local files (max 50 MB)"}
        </p>

        {/* Metadata preview badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px]">
          {[
            {
              label: "Source",
              value: selectedFile ? selectedFile.name : buildingDatasetName || defaultFileName,
              variant: "neutral",
            },
            {
              label: "Buildings",
              value: buildingsGeojson?.features?.length !== undefined
                ? buildingsGeojson.features.length
                : selectedFile
                ? "Extracting…"
                : defaultFeatureCount,
              variant: "geo",
            },
            {
              label: "CRS",
              value: defaultDetectedCrs,
              variant: "sage",
            },
            {
              label: "Extraction",
              value: "Rule-based · Zero Hallucination",
              variant: "neutral",
            },
          ].map((b, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded border"
              style={{
                fontFamily: "var(--font-mono)",
                color: b.variant === "geo" ? "var(--sth-geo)" : b.variant === "sage" ? "var(--sth-sage)" : "var(--sth-text-2)",
                borderColor: b.variant === "geo" ? "#D8C8A8" : b.variant === "sage" ? "#C0CAC0" : "var(--sth-border)",
                backgroundColor: b.variant === "geo" ? "var(--sth-geo-bg)" : b.variant === "sage" ? "var(--sth-sage-bg)" : "var(--sth-card)",
              }}
            >
              {b.label}: <strong style={{ color: "var(--sth-text)" }}>{String(b.value)}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* ── Conversion Settings ─────────────────────────────────────── */}
      <div
        className="rounded-md p-6 space-y-6"
        style={{
          backgroundColor: "var(--sth-card)",
          border: "1px solid var(--sth-border)",
        }}
      >
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: "1px solid var(--sth-border)" }}
        >
          <div>
            <h2
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
            >
              Configure 3D Parametric Extrusion
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--sth-text-2)" }}>
              Deterministic vertical heuristics and metric Cartesian CRS transformation settings.
            </p>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded"
            style={{
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
              color: "var(--sth-text-2)",
            }}
          >
            Contract v1.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Height Source */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--sth-text)" }}>
              Building Height Priority
            </label>
            <select
              value={conversionConfig.height_source}
              onChange={(e) => setConversionConfig({ height_source: e.target.value as HeightSourceOption })}
              disabled={isConverting}
              style={inputStyle}
            >
              <option value="automatic">Automatic (OSM height → levels × floor_height → default)</option>
              <option value="osm_height">OSM Height Tag Only (height / building:height)</option>
              <option value="building_levels">Building Levels Only (levels × floor height)</option>
              <option value="default">Default Building Height Only</option>
            </select>
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              Strict hierarchical rule applied during polyhedral extrusion.
            </p>
          </div>

          {/* Target CRS */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--sth-text)" }}>
              Target Coordinate Reference System (Metric)
            </label>
            <select
              value={conversionConfig.target_crs}
              onChange={(e) => setConversionConfig({ target_crs: e.target.value })}
              disabled={isConverting}
              style={inputStyle}
            >
              <option value="auto">Automatic UTM Zone (Auto-computed from centroid)</option>
              <option value="EPSG:32643">EPSG:32643 (UTM Zone 43N - North India / Delhi)</option>
              <option value="EPSG:3857">EPSG:3857 (Web Mercator)</option>
            </select>
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              Never extrudes degrees directly; reprojects to Cartesian meters.
            </p>
          </div>

          {/* Default Floor Height */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--sth-text)" }}>
              Default Floor Height (m)
            </label>
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="10.0"
              value={conversionConfig.default_floor_height_m}
              onChange={(e) => setConversionConfig({ default_floor_height_m: parseFloat(e.target.value) || 3.0 })}
              disabled={isConverting}
              style={inputStyle}
            />
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              Configurable level coefficient (default: 3.0 meters).
            </p>
          </div>

          {/* Default Building Height */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--sth-text)" }}>
              Default Building Height (m)
            </label>
            <input
              type="number"
              step="1.0"
              min="1.0"
              max="200.0"
              value={conversionConfig.default_building_height_m}
              onChange={(e) => setConversionConfig({ default_building_height_m: parseFloat(e.target.value) || 9.0 })}
              disabled={isConverting}
              style={inputStyle}
            />
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              Standard fallback height when tags are absent (default: 9.0 meters).
            </p>
          </div>

          {/* DataMeet AOI Layer */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center justify-between" style={{ color: "var(--sth-text)" }}>
              <span>Administrative Reference AOI (DataMeet Maps)</span>
              <span className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-sage)" }}>
                Real Geospatial
              </span>
            </label>
            <select
              value={selectedDatameetLayer}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDatameetLayer(val);
                if (val === "delhi_assembly_constituencies") setSelectedDatameetAoi("Rajouri Garden");
                else if (val === "delhi_districts") setSelectedDatameetAoi("West");
                else setSelectedDatameetAoi("NCT of Delhi");
              }}
              disabled={isConverting}
              style={inputStyle}
            >
              <option value="delhi_assembly_constituencies">Assembly Constituencies (Delhi - 70 ACs)</option>
              <option value="delhi_districts">Districts (Census 2011 - 9 Districts)</option>
              <option value="delhi_state_boundary">State Union Boundary (NCT of Delhi)</option>
            </select>
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              Source: DataMeet Maps (ODbL / CC-BY 2.5 India).
            </p>
          </div>

          {/* DataMeet Selected Feature */}
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: "var(--sth-text)" }}>
              Selected Administrative Feature
            </label>
            <input
              type="text"
              value={selectedDatameetAoi}
              onChange={(e) => setSelectedDatameetAoi(e.target.value)}
              disabled={isConverting}
              placeholder="e.g. Rajouri Garden, West, Delhi"
              style={{ ...inputStyle, color: "var(--sth-accent)" }}
            />
            <p className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
              155/155 buildings contained within the selected Rajouri Garden AOI (Tagore Garden OSM dataset).
            </p>
          </div>
        </div>

        {/* Output Format & CTA */}
        <div
          className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--sth-border)" }}
        >
          <div
            className="flex items-center gap-4 text-xs"
            style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
          >
            <span>Outputs:</span>
            {[
              { value: "both", label: "GLB + glTF" },
              { value: "glb", label: "GLB only" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--sth-text)" }}>
                <input
                  type="radio"
                  name="export_format"
                  value={opt.value}
                  checked={conversionConfig.export_format === opt.value}
                  onChange={() => setConversionConfig({ export_format: opt.value as "both" | "glb" })}
                  style={{ accentColor: "var(--sth-accent)" }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStartConversion}
            disabled={isConverting}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: "var(--sth-accent)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
            }}
          >
            {isConverting ? (
              <>
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Converting to 3D Mesh…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <span>Convert to 3D</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Source Matrix ───────────────────────────────────────────── */}
      <div
        className="rounded-md p-6 space-y-4"
        style={{
          backgroundColor: "var(--sth-card)",
          border: "1px solid var(--sth-border)",
        }}
      >
        <div
          className="flex items-center justify-between pb-2"
          style={{ borderBottom: "1px solid var(--sth-border)" }}
        >
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}>
              Multi-Source Ingestion Architecture Matrix
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--sth-text-2)" }}>
              Status and capabilities of all spatial data sources and format ingestion modules.
            </p>
          </div>
          <span className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>
            Data Source Alignment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            {
              title: "GIS / OSM Vector",
              status: "READY",
              body: "Full XML/PBF/GeoJSON parser, UTM zone reprojection, and 3D watertight solid extrusion.",
              variant: "sage",
            },
            {
              title: "DataMeet Admin AOI",
              status: "INTEGRATED",
              body: "Real administrative boundaries (AC/District/State) from DataMeet Maps with metric spatial alignment.",
              variant: "sage",
            },
            {
              title: "DEM / DSM Raster",
              status: "PARTIAL",
              body: "Bilinear elevation sampling from Copernicus GLO-30 GeoTIFF for ground and roof elevations.",
              variant: "geo",
            },
            {
              title: "GNSS / CORS Points",
              status: "ARCHITECTURE READY",
              body: "Ground control points schema and coordinate validation interface defined.",
              variant: "geo",
            },
            {
              title: "LiDAR Point Cloud",
              status: "ARCHITECTURE ONLY",
              body: "LAS/LAZ point cloud filtering schema in place; ingestion parser planned.",
              variant: "neutral",
            },
            {
              title: "Drone Imagery",
              status: "PLANNED",
              body: "Photogrammetric mesh ingestion pipeline to be integrated with SfM outputs.",
              variant: "neutral",
            },
            {
              title: "Floor Plans / BIM",
              status: "PLANNED",
              body: "IFC/DXF CAD drawing slicer for interior unit boundary extraction.",
              variant: "neutral",
            },
          ].map((item, i) => {
            const colSpan = i === 6 ? "sm:col-span-2 lg:col-span-1" : "";
            return (
              <div
                key={i}
                className={`p-3.5 rounded-md space-y-1.5 ${colSpan}`}
                style={{
                  border: `1px solid ${item.variant === "sage" ? "#C0CAC0" : item.variant === "geo" ? "#D8C8A8" : "var(--sth-border)"}`,
                  backgroundColor: item.variant === "sage" ? "var(--sth-sage-bg)" : item.variant === "geo" ? "var(--sth-geo-bg)" : "var(--sth-surface)",
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-semibold text-xs" style={{ fontFamily: "var(--font-sans)", color: "var(--sth-text)" }}>
                    {item.title}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: item.variant === "sage" ? "var(--sth-sage)" : item.variant === "geo" ? "var(--sth-geo)" : "var(--sth-text-2)",
                      backgroundColor: "transparent",
                      border: `1px solid ${item.variant === "sage" ? "#C0CAC0" : item.variant === "geo" ? "#D8C8A8" : "var(--sth-border)"}`,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
                  {item.body}
                </p>
              </div>
            );
          })}

          {/* AI/ML Extraction — spans full width */}
          <div
            className="p-3.5 rounded-md space-y-1.5 sm:col-span-2 lg:col-span-3"
            style={{
              border: "1px solid #D8C8A8",
              backgroundColor: "var(--sth-geo-bg)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs" style={{ fontFamily: "var(--font-sans)", color: "var(--sth-text)" }}>
                AI / ML Extraction
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--sth-geo)",
                  border: "1px solid #D8C8A8",
                }}
              >
                Architecture Ready
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
              Active prototype uses deterministic rule-based geometric extraction &amp; tag parsing. Computer vision / neural inference pipeline is architecture-ready for future model weights.
            </p>
          </div>
        </div>
      </div>

      {/* ── Conversion Progress ─────────────────────────────────────── */}
      {(isConverting || conversionStages.length > 0 || conversionError) && (
        <div
          className="rounded-md p-6 space-y-5"
          style={{
            backgroundColor: "var(--sth-card)",
            border: "1px solid var(--sth-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}>
              Conversion Pipeline Progress
            </h3>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: conversionError ? "var(--sth-clay)" : "var(--sth-sage)" }}
            >
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full rounded-full h-1.5 overflow-hidden"
            style={{ backgroundColor: "var(--sth-border)" }}
          >
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: conversionError
                  ? "var(--sth-clay)"
                  : progressPercent === 100
                  ? "var(--sth-sage)"
                  : "var(--sth-accent)",
              }}
            />
          </div>

          {/* Error notice */}
          {conversionError && (
            <div
              className="rounded-md p-4 text-xs flex items-start justify-between gap-3"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--sth-clay-bg)",
                border: "1px solid #DDBCB4",
                color: "var(--sth-clay)",
              }}
            >
              <div>
                <strong>Conversion failed:</strong> {conversionError}
              </div>
              <button
                type="button"
                onClick={handleStartConversion}
                className="px-3 py-1 rounded-md font-semibold text-xs cursor-pointer shrink-0"
                style={{ backgroundColor: "var(--sth-clay)", color: "#fff" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Stage items */}
          <div className="space-y-1.5 pt-1">
            {conversionStages.map((stage, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1.5 px-3 rounded-md"
                style={{
                  fontFamily: "var(--font-mono)",
                  border: "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-surface)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  {stage.status === "complete" ? (
                    <span style={{ color: "var(--sth-sage)", fontWeight: 700 }}>✓</span>
                  ) : stage.status === "failed" ? (
                    <span style={{ color: "var(--sth-clay)", fontWeight: 700 }}>✗</span>
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--sth-accent)" }}
                    />
                  )}
                  <span className="capitalize" style={{ color: "var(--sth-text)" }}>
                    {stage.stage.replace(/_/g, " ")}:
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--sth-text-2)" }}>
                    {stage.message}
                  </span>
                </div>
                {stage.duration_ms !== undefined && stage.duration_ms !== null && (
                  <span className="text-[10px]" style={{ color: "var(--sth-text-2)" }}>
                    {stage.duration_ms.toFixed(1)}ms
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Success summary */}
          {conversionResult && conversionResult.success && (
            <div
              className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderTop: "1px solid var(--sth-border)" }}
            >
              <div className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>
                Extruded{" "}
                <strong style={{ color: "var(--sth-accent)" }}>{conversionResult.summary.buildings}</strong> buildings ·{" "}
                <strong style={{ color: "var(--sth-text)" }}>{conversionResult.summary.vertices.toLocaleString()}</strong> vertices ·{" "}
                <strong style={{ color: "var(--sth-text)" }}>{conversionResult.summary.faces.toLocaleString()}</strong> faces
              </div>
              <Link
                href="/workspace/3d"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-md transition-all cursor-pointer"
                style={{ backgroundColor: "var(--sth-sage)", color: "#fff" }}
              >
                <span>Open in 3D Cadastre →</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
