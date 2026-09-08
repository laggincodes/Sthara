"use client";

import React from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

export default function DashboardPage() {
  const {
    backendConnected,
    buildingsGeojson,
    building3DData,
    conversionResult,
    activeProjectName,
    buildingDatasetName,
  } = useCadastreContext();

  const buildingCount =
    conversionResult?.summary.buildings ||
    building3DData?.summary.successful ||
    (buildingsGeojson?.features.length ?? 155);
  const verticesCount = conversionResult?.summary.vertices || 1260;
  const facesCount = conversionResult?.summary.faces || 1896;
  const crsName = conversionResult?.target_crs || "EPSG:32643 (UTM 43N)";

  return (
    <div
      className="h-full overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-md p-8"
        style={{
          backgroundColor: "var(--sth-card)",
          border: "1px solid var(--sth-border)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: backendConnected ? "#C0CAC0" : "#DDBCB4",
                backgroundColor: backendConnected ? "var(--sth-sage-bg)" : "var(--sth-clay-bg)",
                color: backendConnected ? "var(--sth-sage)" : "var(--sth-clay)",
              }}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${!backendConnected ? "animate-pulse" : ""}`}
                style={{ backgroundColor: backendConnected ? "var(--sth-sage)" : "var(--sth-clay)" }}
              />
              {backendConnected ? "Engine Online · :8000" : "Connecting to Engine"}
              <span style={{ color: "var(--sth-border)" }}>|</span>
              <span style={{ color: "var(--sth-text-2)" }}>Spatial Intelligence Platform</span>
            </div>

            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
            >
              STHARA — 3D Cadastral Intelligence
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
              Transforming conventional 2D surface parcels into Z-aware, volumetric 3D property models with
              watertight polyhedral geometry, topological gate validation, and deterministic 3D spatial identity.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/data"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-md transition-all cursor-pointer"
              style={{ backgroundColor: "var(--sth-accent)", color: "#fff" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <span>Import Data</span>
            </Link>

            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-md transition-colors cursor-pointer"
              style={{
                color: "var(--sth-text)",
                border: "1px solid var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <span>3D Cadastre</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Core Differentiators ──────────────────────────────────────── */}
      <div
        className="rounded-md p-6 space-y-4"
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
            <div
              className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-accent)" }}
            >
              Core Architectural Differentiators
            </div>
            <h2
              className="text-base font-bold mt-0.5"
              style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
            >
              Why STHARA is Different from a 2D Viewer or Simple Extrusion
            </h2>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded"
            style={{
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
              color: "var(--sth-text-2)",
            }}
          >
            Core Cadastral Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {[
            {
              num: "01",
              title: "Z as a First-Class Citizen",
              body: "Every property is modeled with exact [Z_min, Z_max] vertical elevations and calculated enclosed volumes (m³) rather than flat 2D area projections.",
              color: "var(--sth-accent)",
              bg: "var(--sth-clay-bg)",
              border: "#DDBCB4",
            },
            {
              num: "02",
              title: "Multi-tier Spatial Identity",
              body: "Resolves vertical property rights through deterministic spatial hierarchy: Parcel → Building → Floor → Unit → 3D ULPIN.",
              color: "var(--sth-geo)",
              bg: "var(--sth-geo-bg)",
              border: "#D8C8A8",
            },
            {
              num: "03",
              title: "Topology as an Issuance Gate",
              body: "Automated topological validation checks for self-intersections, duplicates, and non-manifold edges before spatial identifiers can be issued.",
              color: "var(--sth-sage)",
              bg: "var(--sth-sage-bg)",
              border: "#C0CAC0",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="p-4 rounded-md space-y-2"
              style={{
                backgroundColor: item.bg,
                border: `1px solid ${item.border}`,
              }}
            >
              <div className="flex items-center gap-2 font-semibold" style={{ fontFamily: "var(--font-mono)", color: item.color }}>
                <span className="text-[10px] uppercase tracking-widest">{item.num} ·</span>
                <span>{item.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Project Overview ───────────────────────────────────── */}
      <div
        className="rounded-md p-6"
        style={{
          backgroundColor: "var(--sth-card)",
          border: "1px solid var(--sth-border)",
        }}
      >
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4"
          style={{ borderBottom: "1px solid var(--sth-border)" }}
        >
          <div>
            <div
              className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-sage)" }}
            >
              Active Dataset
            </div>
            <h2
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
            >
              {activeProjectName || "Delhi Test Area"}
            </h2>
            <div
              className="text-xs mt-1"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
            >
              Source: {buildingDatasetName || "map.osm (Real OpenStreetMap Physical Dataset)"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-md transition-colors cursor-pointer"
              style={{
                color: "var(--sth-accent)",
                border: "1px solid #DDBCB4",
                backgroundColor: "var(--sth-clay-bg)",
              }}
            >
              <span>Open 3D Cadastre →</span>
            </Link>

            <a
              href="http://localhost:8000/api/v1/export/glb/latest"
              download="city_model_3d.glb"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 rounded-md transition-colors cursor-pointer"
              style={{
                color: "var(--sth-text-2)",
                border: "1px solid var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download GLB</span>
            </a>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          {[
            {
              label: "3D Buildings",
              value: buildingCount,
              sub: "Watertight Solids",
              subColor: "var(--sth-sage)",
              valueColor: "var(--sth-text)",
            },
            {
              label: "Mesh Complexity",
              value: `${facesCount.toLocaleString()}`,
              unit: " faces",
              sub: `${verticesCount.toLocaleString()} vertices`,
              subColor: "var(--sth-text-2)",
              valueColor: "var(--sth-accent)",
            },
            {
              label: "Metric Projection",
              value: crsName,
              sub: "Cartesian Units (meters)",
              subColor: "var(--sth-text-2)",
              valueColor: "var(--sth-text)",
              small: true,
            },
            {
              label: "3D Export Format",
              value: "GLB 2.0 & glTF",
              sub: "Standard Binary glTF",
              subColor: "var(--sth-text-2)",
              valueColor: "var(--sth-geo)",
            },
          ].map((m, i) => (
            <div
              key={i}
              className="rounded-md p-3.5"
              style={{
                border: "1px solid var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
              }}
            >
              <div
                className="text-[11px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
              >
                {m.label}
              </div>
              <div
                className={`${m.small ? "text-sm" : "text-2xl"} font-bold mt-1 truncate`}
                style={{ fontFamily: "var(--font-mono)", color: m.valueColor }}
              >
                {m.value}
                {"unit" in m && (
                  <span className="text-xs font-normal" style={{ color: "var(--sth-text-2)" }}>
                    {m.unit}
                  </span>
                )}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ fontFamily: "var(--font-mono)", color: m.subColor }}
              >
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Projects Directory ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
          >
            Demonstration Projects
          </h2>
          <Link
            href="/projects"
            className="text-xs font-medium transition-colors"
            style={{ fontFamily: "var(--font-mono)", color: "var(--sth-accent)" }}
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Real Physical Dataset card */}
          <div
            className="rounded-md p-5 hover:shadow-sm transition-shadow"
            style={{
              border: "1px solid #DDBCB4",
              backgroundColor: "var(--sth-card)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="inline-block text-[9px] uppercase tracking-widest px-2 py-0.5 rounded mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--sth-clay-bg)",
                    color: "var(--sth-accent)",
                    border: "1px solid #DDBCB4",
                  }}
                >
                  Real Physical Dataset
                </span>
                <h3
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                >
                  Delhi Test Area (map.osm)
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--sth-text-2)" }}>
                  155 physical building footprints extracted from OpenStreetMap XML in Tagore Garden, New Delhi.
                </p>
              </div>
              <span
                className="text-xs font-semibold shrink-0 ml-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-sage)" }}
              >
                Active
              </span>
            </div>
            <div
              className="mt-4 pt-3 flex items-center justify-between text-xs"
              style={{
                borderTop: "1px solid var(--sth-border)",
                fontFamily: "var(--font-mono)",
                color: "var(--sth-text-2)",
              }}
            >
              <span>155 Solids · EPSG:32643 UTM</span>
              <Link
                href="/workspace/3d"
                className="font-semibold transition-colors"
                style={{ color: "var(--sth-accent)" }}
              >
                Open in 3D →
              </Link>
            </div>
          </div>

          {/* Synthetic Benchmark card */}
          <div
            className="rounded-md p-5 hover:shadow-sm transition-shadow"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="inline-block text-[9px] uppercase tracking-widest px-2 py-0.5 rounded mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--sth-geo-bg)",
                    color: "var(--sth-geo)",
                    border: "1px solid #D8C8A8",
                  }}
                >
                  Synthetic Benchmark
                </span>
                <h3
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                >
                  Pune Cadastral Benchmark
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--sth-text-2)" }}>
                  Multi-tier parcel parcels, stratified floors, and 3D ULPIN registry.
                </p>
              </div>
              <span
                className="text-xs shrink-0 ml-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
              >
                Benchmark
              </span>
            </div>
            <div
              className="mt-4 pt-3 flex items-center justify-between text-xs"
              style={{
                borderTop: "1px solid var(--sth-border)",
                fontFamily: "var(--font-mono)",
                color: "var(--sth-text-2)",
              }}
            >
              <span>4 Parcels · 3D ULPINs</span>
              <Link
                href="/workspace/2d"
                className="font-medium transition-colors"
                style={{ color: "var(--sth-text-2)" }}
              >
                Open 2D GIS →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
