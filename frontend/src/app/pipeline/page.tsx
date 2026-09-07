"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";
import { PipelineStepStatus } from "@/components/cadastral/PipelineStatus";
import { TopologyCard } from "@/components/cadastral/TopologyCard";
import { RealPipelineCard } from "@/components/cadastral/RealPipelineCard";

export default function PipelineAuditPage() {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const {
    pipelineSteps,
    isDemoRunning,
    runEndToEndDemo,
    resetDemo,
    activeDatasetName,
    buildingDatasetName,
    validationResult,
    associationData,
    demMetadata,
    building3DData,
    floors3DData,
    property3DData,
    ulpins3D,
    runValidation,
    runBuildingAssociation,
    sampleActiveElevation,
    generate3DBuildingModels,
    generate3DFloorModels,
    generate3DPropertyModels,
    topologyData,
    isAuditingTopology,
    runTopologyAudit,
    loadDemoTopology,
  } = useCadastreContext();

  const completedCount = pipelineSteps.filter((s) => s.status === "COMPLETE").length;
  const progressPercent = Math.round((completedCount / pipelineSteps.length) * 100);

  const getStatusIcon = (status: PipelineStepStatus) => {
    switch (status) {
      case "COMPLETE":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
            ✓
          </span>
        );
      case "PROCESSING":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/50">
            <span className="h-2.5 w-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </span>
        );
      case "WARNING":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold">
            !
          </span>
        );
      case "ERROR":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold">
            ✕
          </span>
        );
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-xs">
            ○
          </span>
        );
    }
  };

  const getStatusBadge = (status: PipelineStepStatus) => {
    switch (status) {
      case "COMPLETE":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/30";
      case "PROCESSING":
        return "text-cyan-300 bg-cyan-950/50 border-cyan-400/40 animate-pulse";
      case "WARNING":
        return "text-amber-400 bg-amber-950/40 border-amber-500/30";
      case "ERROR":
        return "text-rose-400 bg-rose-950/40 border-rose-500/30";
      default:
        return "text-slate-500 bg-slate-900/40 border-slate-800";
    }
  };

  const selectedStep = pipelineSteps.find((s) => s.id === selectedStageId) || pipelineSteps[0];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded bg-purple-950/80 px-2 py-0.5 text-[11px] font-mono font-medium text-purple-400 border border-purple-500/30">
              AUDIT & VERIFICATION
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline Provenance & Audit Console</h1>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end verification, deterministic stage logs, and cryptographic provenance across all 8 cadastral stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetDemo}
            disabled={isDemoRunning}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            Reset Pipeline
          </button>
          <button
            type="button"
            onClick={runEndToEndDemo}
            disabled={isDemoRunning}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {isDemoRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <span>▶ Run Full Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">{completedCount}</span> of{" "}
            <span className="font-bold">{pipelineSteps.length}</span> Stages Verified Complete
          </div>
          <span className="text-xs font-mono font-semibold text-cyan-400">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2-Column Layout: Stage Selector Grid & Stage Audit Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 8 Stages List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 px-1 font-semibold">
            Pipeline Verification Stages
          </div>

          <div className="space-y-2">
            {pipelineSteps.map((step) => {
              const isSelected = (selectedStageId || pipelineSteps[0]?.id) === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStageId(step.id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-start gap-3 ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/20"
                      : "bg-[#111827]/60 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getStatusIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-white truncate">
                        <span className="font-mono text-cyan-400 mr-1.5">{step.stepNumber}</span>
                        {step.title}
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono border ${getStatusBadge(
                          step.status
                        )}`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{step.description}</p>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                      Engine: {step.provenance}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Stage Audit Details (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-800 bg-[#111827]/90 p-6 space-y-6 sticky top-20">
            {selectedStep && (
              <>
                {/* Stage Header */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-cyan-400 font-semibold">
                      STAGE {selectedStep.stepNumber} VERIFICATION
                    </span>
                    <span
                      className={`rounded px-2.5 py-1 text-xs font-mono font-medium border ${getStatusBadge(
                        selectedStep.status
                      )}`}
                    >
                      {selectedStep.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedStep.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedStep.description}</p>
                </div>

                {/* Audit Evidence & Engine */}
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                      Deterministic Engine & Standards
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-xs text-cyan-300">
                      {selectedStep.provenance}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                      Current Verification Evidence
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-200 leading-relaxed">
                      {selectedStep.detail || "No active telemetry recorded for this stage yet."}
                    </div>
                  </div>

                  {/* Stage-Specific Contextual Details */}
                  {selectedStep.id === "01-data-sources" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Parcels Dataset:</span>
                        <span className="text-emerald-400 font-mono">{activeDatasetName || "None"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Buildings Dataset:</span>
                        <span className="text-purple-400 font-mono">{buildingDatasetName || "None"}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>CRS Authority:</span>
                        <span className="text-slate-200 font-mono">EPSG:4326 (WGS 84)</span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "02-topological-validation" && validationResult && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Validation Status:</span>
                        <span className="text-emerald-400 font-mono">{validationResult.valid ? "PASSED" : "FAILED"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Total Features:</span>
                        <span className="text-white font-mono">{validationResult.feature_count} features</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Errors / Issues:</span>
                        <span className="text-amber-400 font-mono">{validationResult.errors?.length || 0} issues</span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "03-spatial-relationships" && associationData && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Total Buildings:</span>
                        <span className="text-white font-mono">{associationData.summary?.total_buildings ?? associationData.associations?.length ?? 0}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Associated Buildings:</span>
                        <span className="text-emerald-400 font-mono">{associationData.summary?.associated_buildings ?? 0}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Multi-Parcel Overlap:</span>
                        <span className="text-amber-400 font-mono">{associationData.summary?.multi_parcel_buildings ?? 0}</span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "04-dem-elevation" && demMetadata && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>DEM Source:</span>
                        <span className="text-cyan-400 font-mono">{demMetadata.filename || "Copernicus GLO-30"}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Resolution:</span>
                        <span className="text-slate-200 font-mono">
                          {demMetadata.resolution ? `${demMetadata.resolution[0]}° x ${demMetadata.resolution[1]}°` : "30m"}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "06-canonical-3d-geometry" && building3DData && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Contract Version:</span>
                        <span className="text-cyan-400 font-mono">v1.0 (Mesh3D)</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Meshes Generated:</span>
                        <span className="text-white font-mono">{building3DData.summary.successful} models</span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "07-stratified-volumes" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Floor Volumes:</span>
                        <span className="text-purple-400 font-mono">{floors3DData?.summary.successful || 0}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Property Volumes:</span>
                        <span className="text-amber-400 font-mono">{property3DData?.summary.successful || 0}</span>
                      </div>
                    </div>
                  )}

                  {(selectedStep.id === "topology-engine" || selectedStep.id.includes("topology")) && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Engine Status:</span>
                        <span className="text-cyan-400 font-mono">
                          {topologyData?.summary.overall_status || "NOT_AUDITED"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Checks Evaluated:</span>
                        <span className="text-white font-mono">{topologyData?.summary.total_checks || 0} checks</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Active Conflicts:</span>
                        <span className="text-rose-400 font-mono font-bold">{topologyData?.summary.conflict_checks || 0}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Overlaps / Duplicates:</span>
                        <span className="text-amber-400 font-mono">
                          {(topologyData?.summary.overlaps_found || 0) + (topologyData?.summary.duplicates_found || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedStep.id === "08-deterministic-3d-ulpin" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-400">
                        <span>Prototype Version:</span>
                        <span className="text-cyan-400 font-mono">v1 (SHA-256 state hash)</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-400">
                        <span>Generated ULPINs:</span>
                        <span className="text-white font-mono">{Object.keys(ulpins3D).length} assigned</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Stage Execution Action */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Stage Operator Action</span>
                  <div className="flex items-center gap-2">
                    {selectedStep.id === "02-topological-validation" && (
                      <button
                        type="button"
                        onClick={runValidation}
                        className="rounded bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      >
                        Re-run Validation
                      </button>
                    )}
                    {selectedStep.id === "03-spatial-relationships" && (
                      <button
                        type="button"
                        onClick={runBuildingAssociation}
                        className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      >
                        Re-run Association
                      </button>
                    )}
                    {selectedStep.id === "04-dem-elevation" && (
                      <button
                        type="button"
                        onClick={sampleActiveElevation}
                        className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      >
                        Re-sample Elevation
                      </button>
                    )}
                    {selectedStep.id === "06-canonical-3d-geometry" && (
                      <button
                        type="button"
                        onClick={generate3DBuildingModels}
                        className="rounded bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      >
                        Generate 3D Buildings
                      </button>
                    )}
                    {(selectedStep.id === "topology-engine" || selectedStep.id.includes("topology")) && (
                      <button
                        type="button"
                        onClick={runTopologyAudit}
                        disabled={isAuditingTopology}
                        className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                      >
                        {isAuditingTopology ? "Auditing..." : "Audit Topology"}
                      </button>
                    )}

                    {selectedStep.id === "07-stratified-volumes" && (
                      <button
                        type="button"
                        onClick={() => {
                          generate3DFloorModels();
                          generate3DPropertyModels();
                        }}
                        className="rounded bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      >
                        Generate Volumes
                      </button>
                    )}
                    <Link
                      href={
                        selectedStep.id === "01-data-sources" || selectedStep.id === "02-topological-validation"
                          ? "/data"
                          : selectedStep.id === "03-spatial-relationships"
                          ? "/workspace/2d"
                          : "/workspace/3d"
                      }
                      className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Open in Viewport →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Step 22: Unified Topology & Spatial Conflict Engine Panel */}
        <div className="mt-8">
          <TopologyCard
            topologyData={topologyData}
            isAuditing={isAuditingTopology}
            onRunAudit={runTopologyAudit}
            onLoadDemo={loadDemoTopology}
          />
        </div>

        {/* Step 23: Real Multi-Source End-to-End Validation Panel */}
        <div className="mt-8">
          <RealPipelineCard />
        </div>
      </div>
    </div>
  );
}
