'use client';

import React, { useState } from 'react';
import {
  CandidateFeature,
  ModelMetadata,
  CandidateValidationResponse,
  CandidateComparisonResponse,
  DemoAiExtractionResponse,
} from '@/types/cadastre';
import { cadastreApi } from '@/lib/api/client';

const DEFAULT_REGISTERED_MODELS: ModelMetadata[] = [
  {
    model_id: 'bld_cv_otsu_v1',
    model_version: '1.0.0',
    task: 'BUILDING',
    framework: 'numpy + rasterio + shapely',
    input_type: 'RASTER_IMAGE / DSM',
    output_type: 'CANDIDATE_BUILDING_FOOTPRINT',
    availability: 'AVAILABLE',
    limitations: 'Classical Otsu automated binarization + contour simplification.',
  },
  {
    model_id: 'flr_hist_cluster_v1',
    model_version: '1.0.0',
    task: 'FLOOR',
    framework: 'numpy 1D density clustering',
    input_type: 'POINT_CLOUD_Z / BUILDING_HEIGHT',
    output_type: 'CANDIDATE_FLOOR_INTERVAL',
    availability: 'AVAILABLE',
    limitations: 'Derives candidate floor strata from vertical return density peaks.',
  },
  {
    model_id: 'unit_partition_v1',
    model_version: '1.0.0',
    task: 'UNIT',
    framework: 'shapely orthogonal partitioning',
    input_type: 'FLOOR_POLYGON + CORRIDOR_GRID',
    output_type: 'CANDIDATE_UNIT_POLYGON',
    availability: 'AVAILABLE',
    limitations: 'Delineates interior unit partition candidates from floor perimeter.',
  },
  {
    model_id: 'vert_delineator_v1',
    model_version: '1.0.0',
    task: 'VERTICAL_FEATURE',
    framework: 'deterministic elevation stratification',
    input_type: 'GROUND_ELEVATION + ROOF_ELEVATION',
    output_type: 'VERTICAL_STRATA_INTERVALS',
    availability: 'AVAILABLE',
    limitations: 'Coordinates candidate vertical intervals for ground, floors, and units.',
  },
  {
    model_id: 'sih_benchmark_demo_v1',
    model_version: '1.0.0',
    task: 'BUILDING',
    framework: 'calibrated synthetic benchmark',
    input_type: 'SYNTHETIC_TOWER_1_SPEC',
    output_type: 'CANDIDATE_MULTI_LAYER',
    availability: 'AVAILABLE',
    limitations: 'Pre-calibrated benchmark for reproducible demonstration consistency.',
  },
  {
    model_id: 'pytorch_mask_rcnn_v1',
    model_version: '2.1.0',
    task: 'BUILDING',
    framework: 'PyTorch + torchvision (Mask-RCNN)',
    input_type: 'DRONE_RGB_HIGHRES',
    output_type: 'CANDIDATE_BUILDING_FOOTPRINT',
    availability: 'MODEL_UNAVAILABLE',
    limitations: 'PyTorch runtime weights are not bundled in this lightweight distribution.',
  },
  {
    model_id: 'open3d_pointnet_v1',
    model_version: '1.2.0',
    task: 'VERTICAL_FEATURE',
    framework: 'Open3D + PointNet',
    input_type: 'LAS_LIDAR_POINT_CLOUD',
    output_type: 'POINT_CLOUD_SEGMENTATION',
    availability: 'MODEL_UNAVAILABLE',
    limitations: 'Open3D C++ binaries not present in current environment.',
  },
];

export function AiExtractionCard() {
  const [models, setModels] = useState<ModelMetadata[]>(DEFAULT_REGISTERED_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [activeMode, setActiveMode] = useState<'DEMO' | 'LIVE_CV'>('DEMO');

  // Extraction candidates
  const [buildingCandidates, setBuildingCandidates] = useState<CandidateFeature[]>([]);
  const [floorCandidates, setFloorCandidates] = useState<CandidateFeature[]>([]);
  const [unitCandidates, setUnitCandidates] = useState<CandidateFeature[]>([]);
  const [verticalCandidates, setVerticalCandidates] = useState<CandidateFeature[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateFeature | null>(null);

  // States
  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CandidateValidationResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<CandidateComparisonResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleRefreshModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await cadastreApi.listAiModels();
      setModels(res.models);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to load AI model registry: ${msg}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Load Benchmark Bundle
  const handleLoadDemoBundle = async () => {
    setIsExtracting('demo');
    setActionError(null);
    setActionNotice(null);
    try {
      const data: DemoAiExtractionResponse = await cadastreApi.getDemoAiExtraction();
      setBuildingCandidates(data.building_candidates || []);
      setFloorCandidates(data.floor_candidates || []);
      setUnitCandidates(data.unit_candidates || []);
      setVerticalCandidates(data.vertical_candidates || []);
      setValidationResult(null);
      setComparisonResult(null);
      if (data.building_candidates && data.building_candidates.length > 0) {
        setSelectedCandidate(data.building_candidates[0]);
      }
      setActionNotice(
        `Loaded ${data.total_candidates} deterministic candidates for Tower 1. Status: CANDIDATE — NOT YET AUTHORITATIVE.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to load demo AI candidates: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Run Building Extraction
  const handleExtractBuildings = async () => {
    setIsExtracting('buildings');
    setActionError(null);
    setActionNotice(null);
    try {
      const isDemo = activeMode === 'DEMO';
      const res = await cadastreApi.extractBuildings({
        source_id: isDemo ? 'DEMO_AERIAL_SURFACE' : 'LOCAL_RASTER_DSM',
        model_id: isDemo ? 'sih_benchmark_demo_v1' : 'bld_cv_otsu_v1',
        demo_mode: isDemo,
      });
      setBuildingCandidates(res.candidates);
      if (res.candidates.length > 0) {
        setSelectedCandidate(res.candidates[0]);
      }
      setActionNotice(
        `Extracted ${res.candidates.length} building candidate(s) via ${res.model_id}. Status: CANDIDATE.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Building extraction error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Run Floor Segmentation
  const handleExtractFloors = async () => {
    setIsExtracting('floors');
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await cadastreApi.extractFloors({
        building_id: 'BLD-DEMO-101',
        total_height_m: 15.0,
        ground_elevation_m: 920.0,
        standard_floor_height_m: 3.0,
        demo_mode: activeMode === 'DEMO',
      });
      setFloorCandidates(res.candidates);
      setActionNotice(`Extracted ${res.candidates.length} floor strata intervals.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Floor extraction error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Run Unit Delineation
  const handleExtractUnits = async () => {
    setIsExtracting('units');
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await cadastreApi.extractUnits({
        building_id: 'BLD-DEMO-101',
        floor_number: 5,
        demo_mode: activeMode === 'DEMO',
      });
      setUnitCandidates(res.candidates);
      setActionNotice(`Extracted ${res.candidates.length} candidate units. Party-wall touching verified.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Unit delineation error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Run Vertical Delineation
  const handleExtractVertical = async () => {
    setIsExtracting('vertical');
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await cadastreApi.extractVertical({
        building_id: 'BLD-DEMO-101',
        base_elevation_m: 920.0,
        top_elevation_m: 935.0,
        floor_count: 5,
        demo_mode: activeMode === 'DEMO',
      });
      setVerticalCandidates(res.candidates);
      setActionNotice('Extracted vertical envelope (Base: 920m, Top: 935m, Height: 15m).');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Vertical delineation error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Deterministic Validation Gate
  const handleValidateCandidates = async () => {
    const allCandidates = [
      ...buildingCandidates,
      ...floorCandidates,
      ...unitCandidates,
      ...verticalCandidates,
    ];
    if (allCandidates.length === 0) {
      setActionError('No candidate features available to validate. Extract or load candidates first.');
      return;
    }

    setIsExtracting('validate');
    setActionError(null);
    setActionNotice(null);
    try {
      const demoParcel = {
        type: 'Polygon',
        coordinates: [
          [
            [775900.0, 1297140.0],
            [775970.0, 1297140.0],
            [775970.0, 1297220.0],
            [775900.0, 1297220.0],
            [775900.0, 1297140.0],
          ],
        ],
      };

      const res = await cadastreApi.validateAiCandidates({
        candidates: allCandidates,
        target_parcel: demoParcel,
        confidence_override: false,
      });
      setValidationResult(res);

      const validatedMap = new Map(res.validated_candidates.map((c) => [c.candidate_id, c]));
      setBuildingCandidates((prev) => prev.map((c) => validatedMap.get(c.candidate_id) || c));
      setFloorCandidates((prev) => prev.map((c) => validatedMap.get(c.candidate_id) || c));
      setUnitCandidates((prev) => prev.map((c) => validatedMap.get(c.candidate_id) || c));
      setVerticalCandidates((prev) => prev.map((c) => validatedMap.get(c.candidate_id) || c));

      if (selectedCandidate && validatedMap.has(selectedCandidate.candidate_id)) {
        setSelectedCandidate(validatedMap.get(selectedCandidate.candidate_id)!);
      }

      setActionNotice(
        `Validation complete: ${res.accepted_count} accepted, ${res.review_count} review required, ${res.rejected_count} rejected.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Candidate validation error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  // Run Spatial Comparison (AI Candidate vs OSM Reference)
  const handleCompareWithReference = async () => {
    if (buildingCandidates.length === 0 || !buildingCandidates[0].geometry_2d) {
      setActionError('Extract or load a candidate building footprint before running spatial comparison.');
      return;
    }

    setIsExtracting('compare');
    setActionError(null);
    setActionNotice(null);
    try {
      const candGeom = buildingCandidates[0].geometry_2d as Record<string, unknown>;
      const osmReferenceGeom = {
        type: 'Polygon',
        coordinates: [
          [
            [775912.0, 1297152.0],
            [775953.0, 1297152.0],
            [775953.0, 1297203.0],
            [775912.0, 1297203.0],
            [775912.0, 1297152.0],
          ],
        ],
      };

      const res = await cadastreApi.compareAiCandidate({
        candidate_geometry: candGeom,
        reference_geometry: osmReferenceGeom,
        candidate_id: buildingCandidates[0].candidate_id,
        reference_id: 'OSM-WAY-992144',
      });
      setComparisonResult(res);
      setActionNotice(`Comparison complete. Calculated IoU: ${(res.iou * 100).toFixed(1)}%.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Comparison error: ${msg}`);
    } finally {
      setIsExtracting(null);
    }
  };

  const totalCandidates =
    buildingCandidates.length +
    floorCandidates.length +
    unitCandidates.length +
    verticalCandidates.length;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-6 space-y-6 shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded bg-amber-950/80 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-400 border border-amber-500/30">
              STEP 19 — AI / ML EXTRACTION LAYER
            </span>
            <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
              CANDIDATE EXTRACTION ONLY
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            AI / ML Candidate Extraction & Spatial Validation
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Conforms strictly to the architectural Separation of Concerns: AI extracts candidate features; the
            deterministic spatial engine validates topology, calculates geometry, and enforces legal
            cadastral rules.
          </p>
        </div>

        {/* Mode Toggle & Benchmark Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveMode('DEMO')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeMode === 'DEMO'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Benchmark
            </button>
            <button
              onClick={() => setActiveMode('LIVE_CV')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeMode === 'LIVE_CV'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Local CV
            </button>
          </div>

          <button
            onClick={handleLoadDemoBundle}
            disabled={isExtracting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-md disabled:opacity-50"
          >
            {isExtracting === 'demo' ? 'Loading Bundle...' : 'Load Benchmark Bundle'}
          </button>
        </div>
      </div>

      {/* Notices & Alerts */}
      {actionError && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300 font-mono flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{actionError}</span>
        </div>
      )}

      {actionNotice && (
        <div className="rounded-lg bg-amber-950/40 border border-amber-500/30 p-3 text-xs text-amber-300 font-mono flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 4 Extraction Task Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Task 1: Building Extraction */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-amber-400 font-medium">TASK 01: BUILDING</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {activeMode === 'DEMO' ? 'synthetic_benchmark' : 'bld_cv_otsu'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">Building Footprint</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeMode === 'DEMO'
                ? 'Calibrated Tower 1 candidate polygon (UTM 43N).'
                : 'Otsu binarization + contour simplification from raster.'}
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Candidates:</span>
              <span className="text-amber-400 font-semibold">{buildingCandidates.length}</span>
            </div>
            <button
              onClick={handleExtractBuildings}
              disabled={isExtracting !== null}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isExtracting === 'buildings' ? 'Extracting...' : 'Extract Footprint'}
            </button>
          </div>
        </div>

        {/* Task 2: Floor Segmentation */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-400 font-medium">TASK 02: FLOOR</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                flr_hist_cluster
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">Floor Strata</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              1D vertical density stratification from building height evidence.
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Strata Levels:</span>
              <span className="text-cyan-400 font-semibold">{floorCandidates.length}</span>
            </div>
            <button
              onClick={handleExtractFloors}
              disabled={isExtracting !== null}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isExtracting === 'floors' ? 'Segmenting...' : 'Segment Floors'}
            </button>
          </div>
        </div>

        {/* Task 3: Unit Delineation */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400 font-medium">TASK 03: UNIT</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                unit_partition
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">Apartment Units</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Orthogonal interior partitioning with party-wall touching verification.
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Candidate Units:</span>
              <span className="text-emerald-400 font-semibold">{unitCandidates.length}</span>
            </div>
            <button
              onClick={handleExtractUnits}
              disabled={isExtracting !== null}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isExtracting === 'units' ? 'Delineating...' : 'Delineate Units'}
            </button>
          </div>
        </div>

        {/* Task 4: Vertical Delineation */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-purple-400 font-medium">TASK 04: VERTICAL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                vert_delineator
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">Vertical Strata</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Base-to-roof elevation bounds coordination (920m - 935m ASL).
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Envelopes:</span>
              <span className="text-purple-400 font-semibold">{verticalCandidates.length}</span>
            </div>
            <button
              onClick={handleExtractVertical}
              disabled={isExtracting !== null}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isExtracting === 'vertical' ? 'Delineating...' : 'Extract Vertical'}
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Inspector & Spatial Validation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left 2 Cols: Candidates Table & Detail Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Candidate Feature Register</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                {totalCandidates} Total
              </span>
            </div>

            <button
              onClick={handleValidateCandidates}
              disabled={totalCandidates === 0 || isExtracting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Deterministic Validation
            </button>
          </div>

          {/* Validation Summary Badge if available */}
          {validationResult && (
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-semibold">
                  ✓ {validationResult.accepted_count} Accepted
                </span>
                <span className="text-amber-400 font-semibold">
                  ⚠ {validationResult.review_count} Review Required
                </span>
                <span className="text-red-400 font-semibold">
                  ✕ {validationResult.rejected_count} Rejected
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  validationResult.all_valid
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-950 text-red-300 border border-red-500/30'
                }`}
              >
                {validationResult.all_valid ? 'DETERMINISTIC GATE PASSED' : 'GATE VIOLATIONS FOUND'}
              </span>
            </div>
          )}

          {/* Candidates List */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/80">
              {[
                ...buildingCandidates,
                ...floorCandidates,
                ...unitCandidates,
                ...verticalCandidates,
              ].map((cand) => (
                <div
                  key={cand.candidate_id}
                  onClick={() => setSelectedCandidate(cand)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    selectedCandidate?.candidate_id === cand.candidate_id
                      ? 'bg-slate-800/90 border-l-2 border-amber-400'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                      <span>{cand.candidate_id}</span>
                      <span className="text-[10px] text-slate-400">({cand.feature_type})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Method: {cand.extraction_method} | Model: {cand.provenance.model_id}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {cand.confidence !== null && cand.confidence !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {(cand.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        cand.status === 'ACCEPTED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : cand.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : cand.status === 'REJECTED'
                          ? 'bg-red-950 text-red-300 border border-red-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {cand.status}
                    </span>
                  </div>
                </div>
              ))}

              {totalCandidates === 0 && (
                <div className="p-6 text-center text-slate-500">
                  No candidate features loaded. Click &quot;Load Benchmark Bundle&quot; or run an individual task.
                </div>
              )}
            </div>
          </div>

          {/* Selected Candidate Details Panel */}
          {selectedCandidate && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-xs font-semibold text-white">
                  Candidate Inspector: {selectedCandidate.candidate_id}
                </span>
                <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-300 border border-amber-500/30">
                  CANDIDATE — NOT YET AUTHORITATIVE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Feature Type</span>
                  <span className="text-slate-200 font-semibold">{selectedCandidate.feature_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Confidence Rating</span>
                  <span className="text-amber-400 font-semibold">
                    {selectedCandidate.confidence !== null && selectedCandidate.confidence !== undefined
                      ? `${(selectedCandidate.confidence * 100).toFixed(1)}% (${selectedCandidate.confidence_level})`
                      : 'UNAVAILABLE'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">CRS</span>
                  <span className="text-slate-200 font-semibold">{selectedCandidate.provenance.crs}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Extraction Method</span>
                  <span className="text-slate-200 font-semibold">{selectedCandidate.extraction_method}</span>
                </div>
              </div>

              {/* Estimated Attributes */}
              {selectedCandidate.estimated_attributes &&
                Object.keys(selectedCandidate.estimated_attributes).length > 0 && (
                  <div className="rounded bg-slate-950/60 p-2.5 font-mono text-[11px] text-slate-300 space-y-1">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                      Candidate Physical Attributes:
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(selectedCandidate.estimated_attributes).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-slate-900/60 pb-0.5">
                          <span className="text-slate-400">{k}:</span>
                          <span className="text-slate-200 font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Warnings / Notices */}
              {selectedCandidate.warnings && selectedCandidate.warnings.length > 0 && (
                <div className="rounded bg-amber-950/30 border border-amber-500/20 p-2 text-[11px] text-amber-300/90 font-mono space-y-0.5">
                  {selectedCandidate.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Spatial Comparison (IoU vs OSM) & Model Registry */}
        <div className="space-y-4">
          {/* Spatial Comparison Box */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Spatial Discrepancy & IoU
              </h3>
              <span className="text-[10px] font-mono text-amber-400">AI vs OSM</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Quantify geometric deviation between AI candidate footprint and physical OSM building.
            </p>

            <button
              onClick={handleCompareWithReference}
              disabled={buildingCandidates.length === 0 || isExtracting !== null}
              className="w-full py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 shadow-md"
            >
              {isExtracting === 'compare' ? 'Comparing...' : 'Calculate IoU & Discrepancy'}
            </button>

            {comparisonResult && (
              <div className="rounded bg-slate-950/80 border border-slate-800 p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">IoU Score:</span>
                  <span className="text-base font-bold text-amber-400">
                    {(comparisonResult.iou * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Intersection Area:</span>
                  <span className="text-slate-200">{comparisonResult.intersection_area_m2} m²</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Union Area:</span>
                  <span className="text-slate-200">{comparisonResult.union_area_m2} m²</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Centroid Offset:</span>
                  <span className="text-slate-200">{comparisonResult.centroid_offset_m} m</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Containment:</span>
                  <span className="text-emerald-400 font-semibold">
                    {comparisonResult.containment_status}
                  </span>
                </div>
                <div className="text-[11px] text-amber-300/80 pt-1 border-t border-slate-900">
                  {comparisonResult.discrepancy_summary}
                </div>
              </div>
            )}
          </div>

          {/* Registered Models Registry */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Model Registry ({models.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                <button onClick={handleRefreshModels} className="hover:text-amber-400 transition-colors">
                {isLoadingModels ? 'Checking...' : 'Refresh'}
              </button>
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
              {models.map((m) => (
                <div key={m.model_id} className="rounded bg-slate-950/60 p-2 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-200">{m.model_id}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                        m.availability === 'AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.availability}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {m.framework} | {m.task}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
