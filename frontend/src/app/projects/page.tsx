"use client";

import React from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

export default function ProjectsPage() {
  const {
    activeProjectName,
    buildingDatasetName,
    conversionResult,
    runOsm3DConversion,
    loadDemoParcels,
  } = useCadastreContext();

  return (
    <div
      className="h-full overflow-y-auto p-6 space-y-8 max-w-6xl mx-auto"
      style={{ fontFamily: "var(--font-sans)", color: "var(--sth-text)" }}
    >
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: "1px solid var(--sth-border)" }}
      >
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#252622" }}
          >
            Projects &amp; Datasets Directory
          </h1>
          <p className="text-xs mt-1" style={{ color: "#62635D" }}>
            Manage local geospatial projects, OpenStreetMap building footprints, and 3D cadastral registries.
          </p>
        </div>

        <Link
          href="/data"
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-md shadow-sm transition-colors"
          style={{
            backgroundColor: "#A85D48",
            color: "#FFFFFF",
            fontFamily: "var(--font-sans)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Import New Dataset</span>
        </Link>
      </div>

      {/* ── Dataset Cards Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project 1: Delhi Test Area (Active) */}
        <div
          className="rounded-md p-6 space-y-4 transition-all"
          style={{
            backgroundColor: "#F8F6F0",
            border: "1px solid #A85D48",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className="inline-block text-[10px] px-2.5 py-0.5 rounded font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#E2E8DF",
                  color: "#526052",
                  border: "1px solid #C8D0C5",
                }}
              >
                REAL OPENSTREETMAP DATASET
              </span>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-heading)", color: "#252622" }}
              >
                Delhi Test Area
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#62635D" }}>
                Tagore Garden, New Delhi, India. 155 physical building footprints extruded to 3D.
              </p>
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#E4E8DF",
                color: "#4F5D4F",
                border: "1px solid #C7D0C4",
              }}
            >
              Active 3D
            </span>
          </div>

          {/* Light Matte Metadata Panel */}
          <div
            className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-md text-xs"
            style={{
              backgroundColor: "#E9E5DA",
              border: "1px solid #D7D4CB",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                BUILDINGS
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                155
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                CRS
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                EPSG:32643
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                FORMAT
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                GLB 2.0
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: "#A85D48" }}
            >
              <span>Open in 3D Workspace &rarr;</span>
            </Link>

            <a
              href="http://localhost:8000/api/v1/export/glb/latest"
              download="city_model_3d.glb"
              className="text-xs font-medium transition-colors"
              style={{ color: "#252622", fontFamily: "var(--font-mono)" }}
            >
              Download GLB
            </a>
          </div>
        </div>

        {/* Project 2: Pune Cadastral Benchmark (Fully Readable Inactive/Benchmark Card) */}
        <div
          className="rounded-md p-6 space-y-4 transition-all"
          style={{
            backgroundColor: "#F8F6F0",
            border: "1px solid #D7D4CB",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className="inline-block text-[10px] px-2.5 py-0.5 rounded font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#E9E1D5",
                  color: "#766044",
                  border: "1px solid #D8CBB8",
                }}
              >
                SYNTHETIC CADASTRAL BENCHMARK
              </span>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-heading)", color: "#252622" }}
              >
                Pune Cadastral Benchmark
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#62635D" }}>
                Kothrud, Pune, Maharashtra. Multi-tier land parcels with DEM ground elevation and 3D ULPIN registry.
              </p>
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#E9E5DA",
                color: "#6F7069",
                border: "1px solid #D7D4CB",
              }}
            >
              Benchmark
            </span>
          </div>

          {/* Light Matte Metadata Panel */}
          <div
            className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-md text-xs"
            style={{
              backgroundColor: "#E9E5DA",
              border: "1px solid #D7D4CB",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                PARCELS
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                4 Parcels
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                CRS
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                EPSG:32643
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase" style={{ color: "#77786F" }}>
                REGISTRY
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#252622" }}>
                3D ULPIN
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/workspace/2d"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: "#A85D48" }}
            >
              <span>Open in 2D GIS Map &rarr;</span>
            </Link>
            <Link
              href="/pipeline"
              className="text-xs font-medium transition-colors"
              style={{ color: "#252622", fontFamily: "var(--font-mono)" }}
            >
              View Verification Audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
