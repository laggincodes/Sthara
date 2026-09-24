"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GeoJSONFeatureCollection,
  NormalizedParcel,
  NormalizedParcelDataset,
  GeoJSONValidationResult,
  HeightCalculationResult,
  FloorGenerationResponse,
  BuildingVerticalSpec,
  Generate3DResponse,
  Building3DResult,
  GenerateFloors3DResponse,
  BuildingFloors3DResult,
  GeneratePropertyVolumeResponse,
  PropertyVolumeResult,
  ULPINResult,
  ULPINRequest,
  ULPINVerificationRequest,
  Unit,
  UnitFeatureCollection,
  UnitPropertyRecord,
  GenerateUnits3DResponse,
  Unit3DResult,
  DemoUndergroundResponse,
  TopologyValidationResponse,
  TopologyValidationRequest,
  OsmUploadSummary,
  Osm3DConversionConfig,
  Osm3DConversionResponse,
  ConversionStageReport,
  BuildingMetadataItem,
  SpatialSourceStatus,
  DrawingAnalysis,
  BuildModelResponse,
  UnifiedProjectDataAnalysis,
} from "@/types/cadastre";
import { FloorPlanAssociation } from "@/types/floor_plan";
import { cadastreApi, ApiError } from "@/lib/api/client";

function extractCentroid(geom: unknown): [number, number] | null {
  if (!geom || typeof geom !== "object") return null;
  const coords = (geom as { coordinates?: unknown }).coordinates;
  if (!coords) return null;
  const pts: [number, number][] = [];
  function recurse(arr: unknown) {
    if (Array.isArray(arr)) {
      if (
        arr.length >= 2 &&
        typeof arr[0] === "number" &&
        typeof arr[1] === "number" &&
        !isNaN(arr[0]) &&
        !isNaN(arr[1])
      ) {
        pts.push([arr[0], arr[1]]);
      } else {
        arr.forEach(recurse);
      }
    }
  }
  recurse(coords);
  if (pts.length === 0) return null;
  const cLon = pts.reduce((acc, p) => acc + p[0], 0) / pts.length;
  const cLat = pts.reduce((acc, p) => acc + p[1], 0) / pts.length;
  if (isNaN(cLon) || isNaN(cLat)) return null;
  return [cLon, cLat];
}

export function useCadastre() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [geojson, setGeojson] = useState<GeoJSONFeatureCollection | null>(null);
  const [normalizedDataset, setNormalizedDataset] = useState<NormalizedParcelDataset | null>(null);
  const [validationResult, setValidationResult] = useState<GeoJSONValidationResult | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  // Unified Active Dataset Source of Truth
  const [activeDatasetId, setActiveDatasetId] = useState<string>("ds_tagore_garden_map_osm");
  const [activeDatasetName, setActiveDatasetName] = useState<string | null>("map.osm (Tagore Garden, Delhi)");
  const [activeDatasetType, setActiveDatasetType] = useState<"osm" | "geojson" | "synthetic">("osm");
  const [activeDatasetHash, setActiveDatasetHash] = useState<string | null>(null);

  // Buildings & Spatial Association State
  const [buildingsGeojson, setBuildingsGeojson] = useState<GeoJSONFeatureCollection | null>(null);
  const [buildingDatasetName, setBuildingDatasetName] = useState<string | null>("map.osm (Tagore Garden, Delhi)");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [associationData, setAssociationData] = useState<import("@/types/cadastre").SpatialAssociationResponse | null>(null);
  const [isAssociating, setIsAssociating] = useState<boolean>(false);
  const [associationError, setAssociationError] = useState<string | null>(null);

  // Elevation State (Step 8)
  const [demMetadata, setDemMetadata] = useState<import("@/types/cadastre").DEMMetadata | null>(null);
  const [elevationResults, setElevationResults] = useState<Record<string, import("@/types/cadastre").ElevationSampleResult>>({});
  const [isSamplingElevation, setIsSamplingElevation] = useState<boolean>(false);
  const [elevationError, setElevationError] = useState<string | null>(null);

  // Building Height & Floors State (Step 9)
  const [buildingHeights, setBuildingHeights] = useState<Record<string, HeightCalculationResult>>({});
  const [buildingFloors, setBuildingFloors] = useState<Record<string, FloorGenerationResponse>>({});
  const [demoSpecs, setDemoSpecs] = useState<Record<string, BuildingVerticalSpec>>({});
  const [isCalculatingHeight, setIsCalculatingHeight] = useState<boolean>(false);
  const [isGeneratingFloors, setIsGeneratingFloors] = useState<boolean>(false);
  const [heightError, setHeightError] = useState<string | null>(null);
  const [floorError, setFloorError] = useState<string | null>(null);

  // Step 11: 3D Building Geometry State
  const [building3DData, setBuilding3DData] = useState<Generate3DResponse | null>(null);
  const [isGenerating3D, setIsGenerating3D] = useState<boolean>(false);
  const [building3DError, setBuilding3DError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  // Step 12: 3D Floors & Property Volume State
  const [floors3DData, setFloors3DData] = useState<GenerateFloors3DResponse | null>(null);
  const [isGeneratingFloors3D, setIsGeneratingFloors3D] = useState<boolean>(false);
  const [floors3DError, setFloors3DError] = useState<string | null>(null);

  const [property3DData, setProperty3DData] = useState<GeneratePropertyVolumeResponse | null>(null);
  const [isGeneratingProperty3D, setIsGeneratingProperty3D] = useState<boolean>(false);
  const [property3DError, setProperty3DError] = useState<string | null>(null);

  // Step 13: 3D ULPIN Prototype State
  const [ulpins3D, setUlpins3D] = useState<Record<string, ULPINResult>>({});
  const [isGeneratingULPIN, setIsGeneratingULPIN] = useState<boolean>(false);
  const [ulpinError, setUlpinError] = useState<string | null>(null);

  const [subView3D, setSubView3D] = useState<"building" | "floors" | "property" | "units" | "underground">("building");
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [explodeDistance, setExplodeDistance] = useState<number>(0);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [demoLandingState, setDemoLandingState] = useState<Record<string, unknown> | null>(null);
  const [isolatedFloorIndex, setIsolatedFloorIndex] = useState<number | null>(null);

  // STEP 3: Floor Plans & Blueprints State
  const [floorPlans, setFloorPlans] = useState<Record<string, FloorPlanAssociation>>({});
  const [isUploadingFloorPlan, setIsUploadingFloorPlan] = useState<boolean>(false);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);

  // Step 16: Unit / Apartment Entity State
  const [unitsGeojson, setUnitsGeojson] = useState<UnitFeatureCollection | null>(null);
  const [unitsDatasetName, setUnitsDatasetName] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [unitPropertyRecord, setUnitPropertyRecord] = useState<UnitPropertyRecord | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [unitError, setUnitError] = useState<string | null>(null);

  // STEP 4: Configured 3D Units State
  const [configuredUnits, setConfiguredUnits] = useState<Record<string, Unit>>({});
  const [isCreatingUnit, setIsCreatingUnit] = useState<boolean>(false);
  const [unitCreationError, setUnitCreationError] = useState<string | null>(null);

  // Step 17: 3D Unit Volume State
  const [units3DData, setUnits3DData] = useState<GenerateUnits3DResponse | null>(null);
  const [isGeneratingUnits3D, setIsGeneratingUnits3D] = useState<boolean>(false);
  const [units3DError, setUnits3DError] = useState<string | null>(null);

  // Step 20: Underground / Subsurface Modeling State
  const [undergroundBundle, setUndergroundBundle] = useState<DemoUndergroundResponse | null>(null);
  const [selectedUndergroundId, setSelectedUndergroundId] = useState<string | null>(null);
  const [isLoadingUnderground, setIsLoadingUnderground] = useState<boolean>(false);
  const [undergroundError, setUndergroundError] = useState<string | null>(null);
  const [cutawayMode, setCutawayMode] = useState<boolean>(false);

  // Step 22: Unified Topology & Spatial Conflict Engine State
  const [topologyData, setTopologyData] = useState<TopologyValidationResponse | null>(null);
  const [isAuditingTopology, setIsAuditingTopology] = useState<boolean>(false);
  const [topologyError, setTopologyError] = useState<string | null>(null);

  // Step 21-36: Drawing Intelligence & Spatial Source Modes State
  const [spatialSourceStatus, setSpatialSourceStatus] = useState<SpatialSourceStatus | null>(null);
  const [drawingAnalysis, setDrawingAnalysis] = useState<DrawingAnalysis | null>(null);
  const [isDrawingImportOpen, setIsDrawingImportOpen] = useState<boolean>(false);
  const [isDrawingReviewOpen, setIsDrawingReviewOpen] = useState<boolean>(false);

  // Step 37+: Unified Project Data Entry State
  const [projectDataAnalysis, setProjectDataAnalysis] = useState<UnifiedProjectDataAnalysis | null>(null);
  const [isAnalyzingProjectData, setIsAnalyzingProjectData] = useState<boolean>(false);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);
  const [isProjectDataEntryOpen, setIsProjectDataEntryOpen] = useState<boolean>(false);


  // OSM File Upload State
  type OsmUploadPhase = "idle" | "selected" | "importing" | "done" | "error";
  const [osmUploadPhase, setOsmUploadPhase] = useState<OsmUploadPhase>("idle");
  const [osmUploadFile, setOsmUploadFile] = useState<File | null>(null);
  const [osmUploadResult, setOsmUploadResult] = useState<OsmUploadSummary | null>(null);
  const [osmUploadError, setOsmUploadError] = useState<string | null>(null);

  // Real OSM -> 3D Pipeline & Export State
  const [conversionConfig, setConversionConfigState] = useState<Osm3DConversionConfig>({
    height_source: "automatic",
    default_floor_height_m: 3.0,
    default_building_height_m: 9.0,
    target_crs: "auto",
    export_format: "both",
  });
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<Osm3DConversionResponse | null>(null);
  const [conversionStages, setConversionStages] = useState<ConversionStageReport[]>([]);
  const [activeProjectName, setActiveProjectName] = useState<string>("Delhi Test Area");

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState<{
    parcels: boolean;
    buildings: boolean;
    units: boolean;
    underground: boolean;
  }>({
    parcels: true,
    buildings: true,
    units: true,
    underground: true,
  });

  const toggleLayer = useCallback((layer: "parcels" | "buildings" | "units" | "underground") => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  // 1. Check Backend Connectivity on mount
  useEffect(() => {
    let mounted = true;
    cadastreApi
      .checkHealth()
      .then((res) => {
        if (mounted) setBackendConnected(res.status === "ok");
      })
      .catch(() => {
        if (mounted) setBackendConnected(false);
      });

    cadastreApi
      .getDemoBuildingSpecs()
      .then((specs) => {
        if (mounted && Array.isArray(specs)) {
          const dict: Record<string, BuildingVerticalSpec> = {};
          specs.forEach((s) => {
            dict[s.building_id] = s;
          });
          setDemoSpecs(dict);
        }
      })
      .catch(() => {});

    // Preload latest conversion result from backend if available
    cadastreApi
      .getConversionStatus()
      .then((statusRes) => {
        if (mounted && statusRes?.data?.mesh_data) {
          setConversionResult(statusRes.data);
          setConversionStages(statusRes.data.stages || []);
          setBuilding3DData(statusRes.data.mesh_data);
          if (statusRes.data.source_name) {
            setBuildingDatasetName(`${statusRes.data.source_name} (3D Converted)`);
            setActiveProjectName(statusRes.data.source_name.replace(/\.[^/.]+$/, "") + " 3D City");
          }
          if (statusRes.data.buildings_metadata && statusRes.data.buildings_metadata.length > 0) {
            setSelectedBuildingId(statusRes.data.buildings_metadata[0].building_id);
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // 1b. Auto-load 2D building footprints whenever activeDatasetId changes
  useEffect(() => {
    if (!activeDatasetId) return;

    let isMounted = true;
    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoading(true);
      setGeneralError(null);

      // Clear old map selection & associated state
      setSelectedBuildingId(null);
      setSelectedParcelId(null);
      setAssociationData(null);
      setElevationResults({});
      setBuildingHeights({});
      setBuildingFloors({});
      setFloorPlans({});
      setConfiguredUnits({});
      // Reset synthetic units to null (Units: 0) to avoid stale units across datasets
      setUnitsGeojson(null);
      setUnitsDatasetName(null);
      setSelectedUnitId(null);
    });

    if (activeDatasetId === "demo_buildings") {
      cadastreApi
        .getDemoBuildings()
        .then((data) => {
          if (!isMounted) return;
          setBuildingsGeojson(data.raw_geojson);
          setBuildingDatasetName("demo_buildings.geojson");
          setActiveDatasetName("demo_buildings.geojson");
          setActiveDatasetType("synthetic");
          if (data.raw_geojson?.features?.length > 0) {
            const firstBld = data.raw_geojson.features[0];
            const bId = (firstBld.properties?.building_id as string) || (firstBld.id ? String(firstBld.id) : null);
            if (bId) setSelectedBuildingId(bId);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          const msg = err instanceof ApiError ? err.message : `Unable to load synthetic building dataset '${activeDatasetId}'.`;
          setGeneralError(msg);
          setBuildingsGeojson(null);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }

    cadastreApi
      .getRealOSMBuildings(activeDatasetId)
      .then((data) => {
        if (!isMounted) return;
        if (data.dataset_id !== activeDatasetId && !["real_osm_buildings", "osm_buildings"].includes(activeDatasetId)) {
          console.warn(`Dataset mismatch: expected ${activeDatasetId}, got ${data.dataset_id}`);
          return;
        }
        setBuildingsGeojson(data.raw_geojson);
        setBuildingDatasetName(data.dataset_name || activeDatasetId);
        setActiveDatasetName(data.dataset_name || activeDatasetId);

        if (data.raw_geojson?.features?.length > 0) {
          const firstBld = data.raw_geojson.features[0];
          const bId = (firstBld.properties?.building_id as string) || (firstBld.id ? String(firstBld.id) : null);
          if (bId) setSelectedBuildingId(bId);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof ApiError ? err.message : `Unable to load dataset '${activeDatasetId}'.`;
        setGeneralError(msg);
        setBuildingsGeojson(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  // 1c. Hydrate floor plans whenever activeDatasetId changes (Strict Dataset Isolation)
  useEffect(() => {
    if (!activeDatasetId) return;
    let isMounted = true;
    cadastreApi
      .getDatasetFloorPlans(activeDatasetId)
      .then((res) => {
        if (!isMounted) return;
        const plansMap: Record<string, FloorPlanAssociation> = {};
        for (const fp of res.floor_plans) {
          const key = `${fp.dataset_id}:${fp.building_id}:${fp.floor_id}`;
          plansMap[key] = fp;
        }
        setFloorPlans(plansMap);
      })
      .catch(() => {
        if (!isMounted) return;
        setFloorPlans({});
      });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  // 1d. Hydrate configured 3D units whenever activeDatasetId changes (Strict Dataset Isolation)
  useEffect(() => {
    if (!activeDatasetId) return;
    let isMounted = true;
    cadastreApi
      .getDatasetUnits(activeDatasetId)
      .then((res) => {
        if (!isMounted) return;
        const unitsMap: Record<string, Unit> = {};
        const results3D: Unit3DResult[] = [];
        for (const u of res.units) {
          const key = `${u.dataset_id || activeDatasetId}:${u.building_id}:${u.floor_id}:${u.unit_id}`;
          unitsMap[key] = u;
          if (u.geometry_3d) {
            results3D.push({
              unit_id: u.unit_id,
              dataset_id: u.dataset_id || activeDatasetId,
              property_id: u.property_id,
              parcel_id: u.parcel_id,
              building_id: u.building_id,
              floor_id: u.floor_id,
              unit_number: u.unit_number,
              unit_name: u.unit_name,
              unit_type: u.unit_type,
              base_elevation: u.base_elevation,
              top_elevation: u.top_elevation,
              height: u.height,
              footprint_area: u.footprint_area,
              volume_cubic_m: u.volume_cubic_m,
              surface_area_sqm: ((u.provenance?.surface_area_sqm as number) || undefined),
              geometry_status: "VALID" as import("@/types/geometry3d").Geometry3DStatus,
              geometry: u.geometry_3d as import("@/types/geometry3d").Mesh3DCollection,
              warnings: u.warnings || [],
              provenance: u.provenance || {},
            });
          }
        }
        setConfiguredUnits(unitsMap);
        if (results3D.length > 0) {
          setUnits3DData({
            schema_version: "1.0",
            results: results3D,
            summary: {
              requested: results3D.length,
              successful: results3D.length,
              failed: 0,
            },
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setConfiguredUnits({});
      });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  // 1e. Hydrate Spatial Source Status & Latest Drawing/Project Data Analysis (Step 21-37)
  useEffect(() => {
    if (!activeDatasetId) return;
    let isMounted = true;

    Promise.all([
      cadastreApi.getSpatialSourceStatus(activeDatasetId).catch(() => null),
      cadastreApi.getLatestDrawingAnalysis(activeDatasetId).catch(() => null),
      cadastreApi.getLatestProjectDataAnalysis(activeDatasetId).catch(() => null),
    ])
      .then(([status, analysis, pData]) => {
        if (!isMounted) return;
        setSpatialSourceStatus(status);
        setDrawingAnalysis(analysis);
        setProjectDataAnalysis(pData);
      })
      .catch(() => {
        // Ignored
      });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  const refreshSpatialSourceStatus = useCallback(async () => {
    if (!activeDatasetId) return;
    try {
      const [status, analysis, pData] = await Promise.all([
        cadastreApi.getSpatialSourceStatus(activeDatasetId).catch(() => null),
        cadastreApi.getLatestDrawingAnalysis(activeDatasetId).catch(() => null),
        cadastreApi.getLatestProjectDataAnalysis(activeDatasetId).catch(() => null),
      ]);
      setSpatialSourceStatus(status);
      setDrawingAnalysis(analysis);
      setProjectDataAnalysis(pData);
    } catch {
      // Ignored
    }
  }, [activeDatasetId]);

  const uploadAndAnalyzeProjectData = useCallback(
    async (files: File[], datasetName?: string) => {
      setIsAnalyzingProjectData(true);
      setProjectDataError(null);
      try {
        const result = await cadastreApi.uploadAndAnalyzeProjectData(
          activeDatasetId,
          files,
          datasetName || activeProjectName
        );
        setProjectDataAnalysis(result);
        if (result.spatial_source_status) {
          setSpatialSourceStatus(result.spatial_source_status);
        }
        if (result.drawing_analysis) {
          setDrawingAnalysis(result.drawing_analysis);
        }
        try {
          const res = await cadastreApi.getOsmDatasetGeoJSON(activeDatasetId);
          setBuildingsGeojson(res.raw_geojson);
        } catch {}
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unified project data analysis failed";
        setProjectDataError(msg);
        return null;
      } finally {
        setIsAnalyzingProjectData(false);
      }
    },
    [activeDatasetId, activeProjectName]
  );

  const loadGoldenDemoProjectData = useCallback(
    async (datasetName?: string) => {
      setIsAnalyzingProjectData(true);
      setProjectDataError(null);
      try {
        const result = await cadastreApi.loadGoldenDemoProjectData(
          activeDatasetId,
          datasetName || activeProjectName || "Tagore Garden Unified Project"
        );
        setProjectDataAnalysis(result);
        if (result.spatial_source_status) {
          setSpatialSourceStatus(result.spatial_source_status);
        }
        if (result.drawing_analysis) {
          setDrawingAnalysis(result.drawing_analysis);
        }
        try {
          const res = await cadastreApi.getOsmDatasetGeoJSON(activeDatasetId);
          setBuildingsGeojson(res.raw_geojson);
        } catch {}
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load golden demo project data";
        setProjectDataError(msg);
        return null;
      } finally {
        setIsAnalyzingProjectData(false);
      }
    },
    [activeDatasetId, activeProjectName]
  );

  const updateBuildingCorrelation = useCallback(
    async (correlationId: string, status: string, osmId?: string) => {
      if (!projectDataAnalysis) return;
      try {
        const updated = await cadastreApi.updateBuildingCorrelation(
          projectDataAnalysis.analysis_id,
          correlationId,
          { status, target_osm_building_id: osmId }
        );
        setProjectDataAnalysis((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            building_correlations: prev.building_correlations.map((c) =>
              c.correlation_id === correlationId ? updated : c
            ),
          };
        });
      } catch {
        // Ignored
      }
    },
    [projectDataAnalysis]
  );


  const handleModelBuiltFromDrawings = useCallback(
    async (result: BuildModelResponse) => {
      await refreshSpatialSourceStatus();
      try {
        const res = await cadastreApi.getOsmDatasetGeoJSON(activeDatasetId);
        setBuildingsGeojson(res.raw_geojson);
      } catch {}

      if (result.building_id) {
        setSelectedBuildingId(result.building_id);
      }

      try {
        const unitsRes = await cadastreApi.getDatasetUnits(activeDatasetId);
        const unitsMap: Record<string, Unit> = {};
        for (const u of unitsRes.units) {
          const key = `${u.dataset_id || activeDatasetId}:${u.building_id}:${u.floor_id}:${u.unit_id}`;
          unitsMap[key] = u;
        }
        setConfiguredUnits(unitsMap);
      } catch {}
    },
    [activeDatasetId, refreshSpatialSourceStatus]
  );

  // 2. Load Demo Parcels from FastAPI Backend
  const loadDemoParcels = useCallback(async () => {
    setIsLoading(true);
    setGeneralError(null);
    setValidationError(null);

    try {
      const data = await cadastreApi.getDataset("demo_parcels");
      const rawCollection = data.raw_geojson;

      setGeojson(rawCollection);
      setActiveDatasetName("demo_parcels.geojson");

      // Validate & normalize
      setIsValidating(true);
      const valResponse = await cadastreApi.validateGeoJSON(rawCollection);
      setValidationResult(valResponse.validation);
      setNormalizedDataset(valResponse.normalized_dataset);

      // Auto-select first parcel if available
      if (valResponse.normalized_dataset.parcels.length > 0) {
        setSelectedParcelId(valResponse.normalized_dataset.parcels[0].parcel_id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
        if (err.validationData) {
          setValidationResult(err.validationData);
        }
      } else {
        setGeneralError("Unable to connect to the geospatial processing service.");
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, []);

  // 2c. Load Real OSM Buildings from FastAPI Backend
  const loadRealOSMBuildings = useCallback(async (dsId?: unknown) => {
    const targetId = typeof dsId === "string" && dsId.trim().length > 0 ? dsId : "ds_tagore_garden_map_osm";
    setActiveDatasetId(targetId);
  }, []);

  // 2b. Load Demo Buildings from FastAPI Backend
  const loadDemoBuildings = useCallback(async () => {
    setActiveDatasetId("demo_buildings");
  }, []);

  // 2d. Step 16: Load Demo Units from FastAPI Backend
  const loadDemoUnits = useCallback(async () => {
    setIsLoadingUnits(true);
    setUnitError(null);

    try {
      const data = await cadastreApi.getDemoUnits();
      setUnitsGeojson(data);
      setUnitsDatasetName("demo_units.geojson (Synthetic Apartment Units)");
      if (data.features.length > 0) {
        setSelectedUnitId(data.features[0].properties.unit_id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setUnitError(err.message);
      } else {
        setUnitError("Unable to load synthetic apartment units.");
      }
    } finally {
      setIsLoadingUnits(false);
    }
  }, []);

  // 2e. Step 20: Load Demo Underground Assets
  const loadDemoUnderground = useCallback(async () => {
    setIsLoadingUnderground(true);
    setUndergroundError(null);
    try {
      const data = await cadastreApi.getUndergroundDemo();
      setUndergroundBundle(data);
      if (data.features.length > 0) {
        setSelectedUndergroundId(data.features[0].underground_feature_id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setUndergroundError(err.message);
      } else {
        setUndergroundError("Unable to load synthetic underground assets.");
      }
    } finally {
      setIsLoadingUnderground(false);
    }
  }, []);

  // 2f. Step 22: Run Full Cadastral Topology Audit
  const runTopologyAudit = useCallback(async () => {
    setIsAuditingTopology(true);
    setTopologyError(null);
    try {
      const payload: TopologyValidationRequest = {
        parcels: geojson ? ((geojson as unknown) as Record<string, unknown>) : null,
        buildings: buildingsGeojson ? ((buildingsGeojson as unknown) as Record<string, unknown>) : null,
        units: unitsGeojson ? (((unitsGeojson.features.map((f) => f.properties)) as unknown) as Record<string, unknown>[]) : null,
        underground_features: undergroundBundle ? (((undergroundBundle.features) as unknown) as Record<string, unknown>[]) : null,
      };
      const res = await cadastreApi.validateTopology(payload);
      setTopologyData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setTopologyError(err.message);
      } else {
        setTopologyError("Unable to execute spatial topology audit.");
      }
    } finally {
      setIsAuditingTopology(false);
    }
  }, [geojson, buildingsGeojson, unitsGeojson, undergroundBundle]);

  // 2g. Step 22: Load Demonstration Scene with Benchmark Topology Checks
  const loadDemoTopology = useCallback(async (scenario: "valid" | "conflict" | string = "valid") => {
    setIsAuditingTopology(true);
    setTopologyError(null);
    try {
      const demoRes = await cadastreApi.getDemoTopology(scenario);
      setTopologyData(demoRes.validation_result);
    } catch (err) {
      if (err instanceof ApiError) {
        setTopologyError(err.message);
      } else {
        setTopologyError("Unable to load demo topology scene.");
      }
    } finally {
      setIsAuditingTopology(false);
    }
  }, []);

  // Fetch unit property record when unit selection changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedUnitId) {
      Promise.resolve().then(() => {
        if (isMounted) setUnitPropertyRecord(null);
      });
      return;
    }
    const fetchRecord = async () => {
      try {
        if (selectedUnitId === "U501" || selectedUnitId === "501") {
          try {
            const canonRec = await cadastreApi.getCanonicalDemoPropertyRecord();
            if (isMounted) {
              setUnitPropertyRecord(canonRec);
              return;
            }
          } catch {}
        }
        const rec = await cadastreApi.getUnitPropertyRecord(selectedUnitId);
        if (isMounted) setUnitPropertyRecord(rec);
      } catch {
        if (isMounted) setUnitPropertyRecord(null);
      }
    };
    fetchRecord();
    return () => {
      isMounted = false;
    };
  }, [selectedUnitId]);

  // 3. Upload User GeoJSON File
  const uploadGeoJson = useCallback(async (file: File) => {
    setIsLoading(true);
    setGeneralError(null);
    setValidationError(null);

    try {
      const normalized = await cadastreApi.uploadDataset(file);
      setNormalizedDataset(normalized);
      setValidationResult(normalized.validation);
      setActiveDatasetName(normalized.source_filename || file.name);

      // Construct client-side FeatureCollection for MapLibre rendering
      const clientFeatures: GeoJSONFeatureCollection = {
        type: "FeatureCollection",
        features: normalized.parcels.map((p) => ({
          type: "Feature",
          id: p.parcel_id,
          properties: {
            ...p.properties,
            survey_no: p.parcel_id,
            __parcel_id: p.parcel_id,
          },
          geometry: p.geometry as GeoJSONFeatureCollection["features"][number]["geometry"],
        })),
      };

      setGeojson(clientFeatures);

      if (normalized.parcels.length > 0) {
        setSelectedParcelId(normalized.parcels[0].parcel_id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setValidationError(err.message);
        if (err.validationData) {
          setValidationResult(err.validationData);
        }
      } else {
        setGeneralError("Unable to connect to the geospatial processing service.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);


  // 3b. OSM/GeoJSON File Selection & Immediate 2D Footprint Ingestion
  const selectOsmFile = useCallback(async (file: File | null) => {
    setOsmUploadFile(file);
    setOsmUploadError(null);
    setOsmUploadResult(null);

    if (file) {
      setOsmUploadPhase("selected");
      // Invalidate stale 3D conversion state immediately so old dataset is never displayed
      setConversionResult(null);
      setConversionStages([]);
      setBuilding3DData(null);
      setBuildingDatasetName(`${file.name} (Loading 2D Map...)`);
      setActiveProjectName(file.name.replace(/\.[^/.]+$/, "") + " Project");

      try {
        // Upload & register dataset with backend to extract 2D GeoJSON immediately
        const dsItem = await cadastreApi.uploadOsmDataset(file);
        setActiveDatasetId(dsItem.dataset_id);
        setActiveDatasetName(dsItem.dataset_name || file.name);
        setActiveDatasetType(dsItem.source_type === "geojson" ? "geojson" : "osm");
        setActiveDatasetHash(dsItem.content_hash || null);
        
        const res = await cadastreApi.getOsmDatasetGeoJSON(dsItem.dataset_id);
        setBuildingsGeojson(res.raw_geojson);
        setBuildingDatasetName(res.dataset_name || file.name);
        if (res.raw_geojson?.features && res.raw_geojson.features.length > 0) {
          const first = res.raw_geojson.features[0];
          const bId = (first.properties?.building_id as string) || (first.id ? String(first.id) : null);
          if (bId) setSelectedBuildingId(bId);
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : "Failed to load imported OSM 2D footprint layer.";
        setOsmUploadError(msg);
      }
    } else {
      setOsmUploadPhase("idle");
    }
  }, []);

  // 3c. OSM/GeoJSON File Import — uploads file, extracts buildings, auto-refreshes map layer
  const importOsmFile = useCallback(async () => {
    if (!osmUploadFile) return;
    setOsmUploadPhase("importing");
    setOsmUploadError(null);
    setOsmUploadResult(null);
    try {
      const dsItem = await cadastreApi.uploadOsmDataset(osmUploadFile);
      setActiveDatasetId(dsItem.dataset_id);
      setActiveDatasetName(dsItem.dataset_name || osmUploadFile.name);
      setActiveDatasetType(dsItem.source_type === "geojson" ? "geojson" : "osm");
      setActiveDatasetHash(dsItem.content_hash || null);

      const res = await cadastreApi.getOsmDatasetGeoJSON(dsItem.dataset_id);
      setBuildingsGeojson(res.raw_geojson);
      setBuildingDatasetName(res.dataset_name || osmUploadFile.name);
      setOsmUploadPhase("done");
      if (res.raw_geojson?.features && res.raw_geojson.features.length > 0) {
        const first = res.raw_geojson.features[0];
        const bId = (first.properties?.building_id as string) || (first.id ? String(first.id) : null);
        if (bId) setSelectedBuildingId(bId);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setOsmUploadError(err.message);
      } else {
        setOsmUploadError("Geospatial dataset import failed. Please try again.");
      }
      setOsmUploadPhase("error");
    }
  }, [osmUploadFile]);

  // 3d. Set Conversion Configuration
  const setConversionConfig = useCallback((cfg: Partial<Osm3DConversionConfig>) => {
    setConversionConfigState((prev) => ({ ...prev, ...cfg }));
  }, []);

  // 3e. Execute Full OSM -> 3D Conversion Pipeline
  const runOsm3DConversion = useCallback(
    async (cfgOverride?: Partial<Osm3DConversionConfig>) => {
      if (!osmUploadFile && spatialSourceStatus) {
        if (
          spatialSourceStatus.active_mode === "DRAWINGS_ONLY" ||
          spatialSourceStatus.osm_building_count === 0
        ) {
          console.warn(
            "[runOsm3DConversion] Aborting conversion: dataset active_mode is DRAWINGS_ONLY or osm_building_count is 0."
          );
          return;
        }
      }

      const activeCfg = {
        ...conversionConfig,
        dataset_id: activeDatasetId,
        ...(cfgOverride || {})
      };
      setIsConverting(true);
      setConversionError(null);

      try {
        let resp: Osm3DConversionResponse;
        if (osmUploadFile) {
          resp = await cadastreApi.uploadAndConvertOsm(osmUploadFile, activeCfg);
        } else {
          resp = await cadastreApi.convertOsmTo3D(activeCfg);
        }

        setConversionResult(resp);
        setConversionStages(resp.stages || []);
        setActiveDatasetId(resp.dataset_id);

        if (resp.mesh_data) {
          setBuilding3DData(resp.mesh_data);
          setViewMode("3d");
          setSubView3D("building");
        }

        if (resp.source_name) {
          setBuildingDatasetName(`${resp.source_name} (3D Converted)`);
          setActiveProjectName(resp.source_name.replace(/\.[^/.]+$/, "") + " 3D City");
        }

        if (resp.buildings_metadata && resp.buildings_metadata.length > 0) {
          setSelectedBuildingId(resp.buildings_metadata[0].building_id);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "OSM -> 3D conversion pipeline failed.";
        setConversionError(msg);
      } finally {
        setIsConverting(false);
      }
    },
    [conversionConfig, osmUploadFile, activeDatasetId, spatialSourceStatus]
  );

  // 3f. Direct Upload and Convert
  const uploadAndConvertOsmFile = useCallback(
    async (file: File, cfgOverride?: Partial<Osm3DConversionConfig>) => {
      const activeCfg = { ...conversionConfig, ...(cfgOverride || {}) };
      setIsConverting(true);
      setConversionError(null);
      setOsmUploadFile(file);
      // Invalidate previous conversion data immediately
      setConversionResult(null);
      setConversionStages([]);
      setBuilding3DData(null);

      try {
        const resp = await cadastreApi.uploadAndConvertOsm(file, activeCfg);
        setConversionResult(resp);
        setConversionStages(resp.stages || []);
        setActiveDatasetId(resp.dataset_id);

        if (resp.mesh_data) {
          setBuilding3DData(resp.mesh_data);
          setViewMode("3d");
          setSubView3D("building");
        }

        setBuildingDatasetName(`${file.name} (3D Converted)`);
        setActiveProjectName(file.name.replace(/\.[^/.]+$/, "") + " 3D City");

        if (resp.buildings_metadata && resp.buildings_metadata.length > 0) {
          setSelectedBuildingId(resp.buildings_metadata[0].building_id);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Direct OSM upload and conversion failed.";
        setConversionError(msg);
      } finally {
        setIsConverting(false);
      }
    },
    [conversionConfig]
  );

  // 4. Trigger Explicit Backend Validation
  const runValidation = useCallback(async () => {
    if (!geojson) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await cadastreApi.validateGeoJSON(geojson);
      setValidationResult(response.validation);
      setNormalizedDataset(response.normalized_dataset);
    } catch (err) {
      if (err instanceof ApiError) {
        setValidationError(err.message);
        if (err.validationData) {
          setValidationResult(err.validationData);
        }
      } else {
        setValidationError("Unable to connect to the geospatial processing service.");
      }
    } finally {
      setIsValidating(false);
    }
  }, [geojson]);

  // 5. Run Building-Parcel Spatial Relationship Analysis
  const runBuildingAssociation = useCallback(async () => {
    if (!geojson || !buildingsGeojson) return;

    setIsAssociating(true);
    setAssociationError(null);

    try {
      const res = await cadastreApi.associateBuildings({
        parcels: geojson,
        buildings: buildingsGeojson,
      });
      setAssociationData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setAssociationError(err.message);
      } else {
        setAssociationError("Unable to connect to the geospatial processing service.");
      }
    } finally {
      setIsAssociating(false);
    }
  }, [geojson, buildingsGeojson]);

  // 6. Sample Ground Elevation from DEM (Step 8)
  const sampleActiveElevation = useCallback(async () => {
    const points: import("@/types/cadastre").ElevationSamplePoint[] = [];

    // Sample all parcels
    if (normalizedDataset?.parcels) {
      normalizedDataset.parcels.forEach((p) => {
        if (p.centroid && p.centroid.length >= 2) {
          points.push({
            feature_id: p.parcel_id,
            longitude: p.centroid[0],
            latitude: p.centroid[1],
            crs: "EPSG:4326",
          });
        }
      });
    }

    // Sample all buildings
    if (associationData?.associations) {
      associationData.associations.forEach((b) => {
        if (b.centroid && b.centroid.length >= 2) {
          points.push({
            feature_id: b.building_id,
            longitude: b.centroid[0],
            latitude: b.centroid[1],
            crs: "EPSG:4326",
          });
        }
      });
    } else if (buildingsGeojson?.features) {
      buildingsGeojson.features.forEach((b, idx) => {
        const bId = (b.properties?.building_id as string) || (b.id ? String(b.id) : `BLD-SYS-${idx + 1}`);
        const centroid = extractCentroid(b.geometry);
        if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
          points.push({
            feature_id: bId,
            longitude: centroid[0],
            latitude: centroid[1],
            crs: "EPSG:4326",
          });
        }
      });
    }

    const validPoints = points.filter(
      (pt) =>
        typeof pt.longitude === "number" &&
        !isNaN(pt.longitude) &&
        typeof pt.latitude === "number" &&
        !isNaN(pt.latitude)
    );

    if (validPoints.length === 0) return;

    setIsSamplingElevation(true);
    setElevationError(null);

    try {
      const resp = await cadastreApi.sampleElevation({ points: validPoints });
      setElevationResults((prev) => {
        const next = { ...prev };
        resp.results.forEach((r) => {
          if (r.feature_id) {
            next[r.feature_id] = r;
          }
        });
        return next;
      });

      // Also ensure DEM metadata is loaded
      if (!demMetadata) {
        try {
          const meta = await cadastreApi.getDEMInfo();
          setDemMetadata(meta);
        } catch {
          // Non-blocking DEM metadata fetch
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setElevationError(err.message);
      } else {
        setElevationError("Elevation sampling unavailable for active dataset coordinates.");
      }
    } finally {
      setIsSamplingElevation(false);
    }
  }, [normalizedDataset, associationData, buildingsGeojson, demMetadata]);

  // 9. Step 9: Calculate building height
  const calculateSelectedBuildingHeight = useCallback(
    async (buildingId?: string) => {
      const targetId = buildingId || selectedBuildingId;
      if (!targetId) return;

      setIsCalculatingHeight(true);
      setHeightError(null);

      try {
        const sampledGround = elevationResults[targetId]?.elevation_m;
        const spec = demoSpecs[targetId];

        let roofElev: number | null = null;
        let groundElev: number | null = sampledGround ?? null;

        if (associationData?.associations) {
          const assoc = associationData.associations.find((b) => b.building_id === targetId);
          if (assoc?.properties?.roof_elevation) {
            roofElev = Number(assoc.properties.roof_elevation);
          }
          if (groundElev === null && assoc?.properties?.ground_elevation) {
            groundElev = Number(assoc.properties.ground_elevation);
          }
        }
        if (roofElev === null && buildingsGeojson?.features) {
          const feat = buildingsGeojson.features.find(
            (f) => (f.properties?.building_id as string) === targetId || (f.id && String(f.id) === targetId)
          );
          if (feat?.properties?.roof_elevation) {
            roofElev = Number(feat.properties.roof_elevation);
          }
          if (groundElev === null && feat?.properties?.ground_elevation) {
            groundElev = Number(feat.properties.ground_elevation);
          }
        }

        if (roofElev === null && spec) {
          roofElev = spec.roof_elevation;
        }

        // Fallback default if not sampled yet but spec has ground assumption
        if (groundElev === null && spec) {
          groundElev = 562.48;
        }

        const res = await cadastreApi.calculateBuildingHeight({
          building_id: targetId,
          ground_elevation: groundElev,
          roof_elevation: roofElev,
          unit: "meters",
          ground_reference: "AMSL",
          roof_reference: "AMSL",
          source: spec?.height_source || "SYNTHETIC_DEMO",
        });

        setBuildingHeights((prev) => ({
          ...prev,
          [targetId]: res,
        }));
      } catch (err) {
        if (err instanceof ApiError) {
          setHeightError(err.message);
        } else {
          setHeightError("Unable to calculate building height.");
        }
      } finally {
        setIsCalculatingHeight(false);
      }
    },
    [selectedBuildingId, elevationResults, demoSpecs, associationData, buildingsGeojson]
  );

  // 10. Step 9: Generate floors
  const generateSelectedBuildingFloors = useCallback(
    async (buildingId?: string, floorCountOverride?: number) => {
      const targetId = buildingId || selectedBuildingId;
      if (!targetId) return;

      setIsGeneratingFloors(true);
      setFloorError(null);

      try {
        const heightData = buildingHeights[targetId];
        const spec = demoSpecs[targetId];

        const groundElev = heightData?.ground_elevation ?? elevationResults[targetId]?.elevation_m ?? 562.48;
        let bldHeight = heightData?.building_height ?? spec?.building_height;
        const roofElev = heightData?.roof_elevation ?? spec?.roof_elevation;

        let count = floorCountOverride || spec?.number_of_floors;

        if (!count && buildingsGeojson?.features) {
          const feat = buildingsGeojson.features.find(
            (f) => (f.properties?.building_id as string) === targetId || (f.id && String(f.id) === targetId)
          );
          if (feat?.properties?.number_of_floors) {
            count = Number(feat.properties.number_of_floors);
          }
          if (!bldHeight && feat?.properties?.building_height) {
            bldHeight = Number(feat.properties.building_height);
          }
        }

        if (!count) count = 3;

        const res = await cadastreApi.generateFloors({
          building_id: targetId,
          ground_elevation: groundElev,
          building_height: bldHeight,
          roof_elevation: roofElev,
          mode: "KNOWN_FLOOR_COUNT",
          floor_count: count,
          ground_floor_name: "Ground Floor",
          tolerance_m: 0.05,
        });

        setBuildingFloors((prev) => ({
          ...prev,
          [targetId]: res,
        }));
      } catch (err) {
        if (err instanceof ApiError) {
          setFloorError(err.message);
        } else {
          setFloorError("Unable to generate building floors.");
        }
      } finally {
        setIsGeneratingFloors(false);
      }
    },
    [selectedBuildingId, buildingHeights, elevationResults, demoSpecs, buildingsGeojson]
  );

  // Step 11: Generate 3D Building Models (Polyhedral Extrusion)
  const generate3DBuildingModels = useCallback(async () => {
    setIsGenerating3D(true);
    setBuilding3DError(null);

    try {
      if (!buildingsGeojson || buildingDatasetName === "demo_buildings") {
        const res = await cadastreApi.extrudeDemoBuildings();
        setBuilding3DData(res);
        setViewMode("3d");
      } else {
        const requests = buildingsGeojson.features.map((f, i) => {
          const props = (f.properties || {}) as Record<string, unknown>;
          const bId = String(props.building_id || f.id || `BLD-AUTO-${i + 1}`);
          const sampledZ = elevationResults[bId]?.elevation_m ?? null;
          const propGroundZ = typeof props.ground_elevation === "number" ? props.ground_elevation : null;
          const propRoofZ = typeof props.roof_elevation === "number" ? props.roof_elevation : null;
          const propHeight = typeof props.building_height === "number" ? props.building_height : 12.0;

          return {
            building_id: bId,
            footprint_geometry: f.geometry as unknown as Record<string, unknown>,
            ground_elevation: sampledZ ?? propGroundZ ?? 562.48,
            roof_elevation: propRoofZ,
            building_height: propHeight,
            source_crs: "EPSG:4326",
            target_crs: "EPSG:32643",
          };
        });

        const res = await cadastreApi.generate3DBuildings({
          buildings: requests,
          target_crs: "EPSG:32643",
          compute_shared_origin: true,
        });
        setBuilding3DData(res);
        setViewMode("3d");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate 3D building models.";
      setBuilding3DError(msg);
    } finally {
      setIsGenerating3D(false);
    }
  }, [buildingsGeojson, buildingDatasetName, elevationResults]);

  // Step 12: Generate 3D Floor Models
  const generate3DFloorModels = useCallback(async () => {
    setIsGeneratingFloors3D(true);
    setFloors3DError(null);
    try {
      if (buildingDatasetName === "demo_buildings" || !buildingsGeojson) {
        const res = await cadastreApi.extrudeDemoFloors();
        setFloors3DData(res);
        setViewMode("3d");
        setSubView3D("floors");
      } else {
        const requests = buildingsGeojson.features.map((feat) => {
          const props = feat.properties || {};
          const bid = (props.building_id as string) || (feat.id ? String(feat.id) : "BLD-UNKNOWN");
          const sampledZ = elevationResults[bid]?.elevation_m;
          const propGroundZ = typeof props.ground_elevation === "number" ? props.ground_elevation : null;
          const propRoofZ = typeof props.roof_elevation === "number" ? props.roof_elevation : null;
          const propHeight = typeof props.building_height === "number" ? props.building_height : null;
          const numFloors = typeof props.number_of_floors === "number" ? props.number_of_floors : null;
          const floorH = typeof props.floor_height === "number" ? props.floor_height : null;

          return {
            building_id: bid,
            parcel_id: (props.parcel_id as string) || null,
            footprint_geometry: feat.geometry as unknown as GeoJSON.Geometry,
            ground_elevation: sampledZ ?? propGroundZ ?? 562.48,
            roof_elevation: propRoofZ,
            building_height: propHeight,
            number_of_floors: numFloors,
            floor_height: floorH,
            source_crs: "EPSG:4326",
            target_crs: "EPSG:32643",
          };
        });

        const res = await cadastreApi.generate3DFloors({
          buildings: requests,
          target_crs: "EPSG:32643",
          compute_shared_origin: true,
        });
        setFloors3DData(res);
        setViewMode("3d");
        setSubView3D("floors");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate 3D floor solids.";
      setFloors3DError(msg);
    } finally {
      setIsGeneratingFloors3D(false);
    }
  }, [buildingsGeojson, buildingDatasetName, elevationResults]);

  // STEP 1: Generate 3D Floor Solids for a Configured Building Footprint
  const generateConfiguredBuilding3D = useCallback(
    async (params: {
      buildingId: string;
      numberOfFloors: number;
      numberOfBasements: number;
      buildingHeight: number;
      footprintGeometry?: GeoJSON.Geometry;
    }) => {
      const { buildingId, numberOfFloors, numberOfBasements, buildingHeight } = params;
      if (!buildingId) throw new Error("Building ID is required.");
      if (numberOfFloors < 1 || !Number.isInteger(numberOfFloors)) {
        throw new Error("Floors must be an integer ≥ 1.");
      }
      if (numberOfBasements < 0 || !Number.isInteger(numberOfBasements)) {
        throw new Error("Basements must be an integer ≥ 0.");
      }
      if (buildingHeight <= 0 || !Number.isFinite(buildingHeight)) {
        throw new Error("Height must be a positive number.");
      }

      setIsGeneratingFloors3D(true);
      setFloors3DError(null);

      try {
        // Resolve footprint geometry from param or active buildingsGeojson
        let footprint = params.footprintGeometry;
        let parcelId: string | null = null;
        if (!footprint && buildingsGeojson?.features) {
          const feat = buildingsGeojson.features.find(
            (f) =>
              (f.properties?.building_id as string) === buildingId ||
              (f.id && String(f.id) === buildingId) ||
              f.properties?.osm_id === buildingId ||
              `OSM-BUILDING-WAY-${f.properties?.osm_id}` === buildingId
          );
          if (feat) {
            footprint = feat.geometry as unknown as GeoJSON.Geometry;
            parcelId = (feat.properties?.parcel_id as string) || null;
          }
        }

        if (!footprint) {
          throw new Error(`Could not find 2D footprint geometry for building '${buildingId}'.`);
        }

        const sampledZ = elevationResults[buildingId]?.elevation_m ?? 0.0;
        const newRoofZ = sampledZ + buildingHeight;
        const origin = conversionResult?.summary?.viewer_origin;

        const request: import("@/types/cadastre").BuildingFloors3DRequest = {
          building_id: buildingId,
          parcel_id: parcelId,
          footprint_geometry: footprint,
          ground_elevation: sampledZ,
          roof_elevation: newRoofZ,
          building_height: buildingHeight,
          number_of_floors: numberOfFloors,
          number_of_basements: numberOfBasements,
          source_crs: "EPSG:4326",
          target_crs: conversionResult?.target_crs || "EPSG:32643",
          scene_origin: origin as [number, number, number] | undefined,
        };

        const res = await cadastreApi.generate3DFloors({
          buildings: [request],
          target_crs: conversionResult?.target_crs || "EPSG:32643",
          compute_shared_origin: false,
        });

        // 1. Regenerate 3D Building Shell Mesh to match updated height
        try {
          const bldReq: import("@/types/geometry3d").Building3DRequest = {
            building_id: buildingId,
            parcel_id: parcelId || undefined,
            footprint_geometry: footprint as unknown as Record<string, unknown>,
            ground_elevation: sampledZ,
            roof_elevation: newRoofZ,
            building_height: buildingHeight,
            source_crs: "EPSG:4326",
            target_crs: conversionResult?.target_crs || "EPSG:32643",
            scene_origin: origin as [number, number, number] | undefined,
          };
          const bldRes = await cadastreApi.generate3DBuildings({
            buildings: [bldReq],
            target_crs: conversionResult?.target_crs || "EPSG:32643",
            compute_shared_origin: false,
          });
          setBuilding3DData((prev) => {
            if (!prev) return bldRes;
            const otherResults = prev.results.filter((b) => b.building_id !== buildingId);
            const newResults = [...otherResults, ...bldRes.results];
            return {
              ...prev,
              results: newResults,
              summary: {
                ...prev.summary,
                requested: newResults.length,
                successful: newResults.length,
              },
            };
          });
        } catch {}

        // 2. Merge into existing floors3DData or initialize
        setFloors3DData((prev) => {
          if (!prev) return res;
          const otherResults = prev.results.filter((b) => b.building_id !== buildingId);
          const newResults = [...otherResults, ...res.results];
          return {
            ...prev,
            results: newResults,
            summary: {
              ...prev.summary,
              requested: newResults.length,
              successful: newResults.length,
            },
          };
        });

        // 3. Update buildingsGeojson feature properties for 2D map & inspector alignment
        setBuildingsGeojson((prev) => {
          if (!prev || !prev.features) return prev;
          const nextFeatures = prev.features.map((feat) => {
            const fid = String(feat.properties?.building_id || feat.id || "");
            if (
              fid === buildingId ||
              feat.properties?.osm_id === buildingId ||
              `OSM-BUILDING-WAY-${feat.properties?.osm_id}` === buildingId
            ) {
              return {
                ...feat,
                properties: {
                  ...feat.properties,
                  building_height: buildingHeight,
                  roof_elevation: newRoofZ,
                  number_of_floors: numberOfFloors,
                  number_of_basements: numberOfBasements,
                  height_m: buildingHeight,
                  levels: numberOfFloors,
                },
              };
            }
            return feat;
          });
          return {
            ...prev,
            features: nextFeatures,
          };
        });

        // 4. Set building heights cache for consistency
        setBuildingHeights((prev) => ({
          ...prev,
          [buildingId]: {
            building_id: buildingId,
            roof_elevation: newRoofZ,
            ground_elevation: sampledZ,
            building_height: buildingHeight,
            unit: "meters",
            status: "AVAILABLE",
            method: "USER_CONFIGURED",
            source: "Configured / Derived",
            confidence_score: 1.0,
            warnings: [],
          } as unknown as import("@/types/cadastre").HeightCalculationResult,
        }));

        // 5. Update buildingFloors cache for floor stack schematics
        if (res.results && res.results.length > 0) {
          const matchingBldFloors = res.results.find((b) => b.building_id === buildingId);
          if (matchingBldFloors) {
            const mappedFloors = matchingBldFloors.floors.map((fl) => ({
              floor_id: fl.floor_id,
              building_id: buildingId,
              floor_index: fl.floor_index,
              floor_name: fl.floor_name,
              base_elevation: fl.base_elevation,
              top_elevation: fl.top_elevation,
              floor_height: fl.height,
              source: fl.source || "Configured / Derived",
              status: "VALID",
            }));
            setBuildingFloors((prev) => ({
              ...prev,
              [buildingId]: {
                building_id: buildingId,
                building_height: buildingHeight,
                ground_elevation: sampledZ,
                roof_elevation: newRoofZ,
                floor_count: numberOfFloors,
                floors: mappedFloors,
                validation_status: "VALID",
                warnings: matchingBldFloors.warnings || [],
              } as unknown as import("@/types/cadastre").FloorGenerationResponse,
            }));
          }
        }

        // 6. Prune stale units and update active units to inherit updated floor intervals
        if (res.results) {
          const matching = res.results.find((b) => b.building_id === buildingId);
          const floorMap = new Map(matching?.floors?.map((f) => [f.floor_id, f]) || []);
          const validFloorIds = new Set(floorMap.keys());

          setConfiguredUnits((prev) => {
            const next: Record<string, Unit> = {};
            for (const [k, u] of Object.entries(prev)) {
              if (u.building_id === buildingId) {
                if (!validFloorIds.has(u.floor_id)) continue;
                const fl = floorMap.get(u.floor_id);
                if (fl) {
                  const newHeight = fl.height;
                  const newVol = (u.footprint_area || 0) * newHeight;
                  next[k] = {
                    ...u,
                    base_elevation: fl.base_elevation,
                    top_elevation: fl.top_elevation,
                    height: newHeight,
                    volume_cubic_m: newVol,
                  };
                  continue;
                }
              }
              next[k] = u;
            }
            return next;
          });

          // Invalidate stale property volume calculations for this building
          setProperty3DData((prev) => {
            if (!prev) return null;
            const remaining = prev.results.filter((p) => p.building_id !== buildingId);
            return {
              ...prev,
              results: remaining,
              summary: {
                ...prev.summary,
                requested: remaining.length,
                successful: remaining.length,
              },
            };
          });
        }

        setSelectedBuildingId(buildingId);
        setSelectedFloorId(null);
        setSubView3D("floors");
        setViewMode("3d");
        return res;
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Failed to generate configured 3D floor solids.";
        setFloors3DError(msg);
        throw err;
      } finally {
        setIsGeneratingFloors3D(false);
      }
    },
    [buildingsGeojson, elevationResults, conversionResult]
  );

  // STEP 3: Floor Plan Document Attachment & Association
  const attachFloorPlan = useCallback(
    async (buildingId: string, floorId: string, file: File) => {
      setIsUploadingFloorPlan(true);
      setFloorPlanError(null);
      try {
        const assoc = await cadastreApi.uploadFloorPlan(activeDatasetId, buildingId, floorId, file);
        const key = `${activeDatasetId}:${buildingId}:${floorId}`;
        setFloorPlans((prev) => ({ ...prev, [key]: assoc }));
        return assoc;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to upload floor plan document.";
        setFloorPlanError(msg);
        throw err;
      } finally {
        setIsUploadingFloorPlan(false);
      }
    },
    [activeDatasetId]
  );

  const removeFloorPlan = useCallback(
    async (buildingId: string, floorId: string) => {
      setFloorPlanError(null);
      try {
        await cadastreApi.deleteFloorPlan(activeDatasetId, buildingId, floorId);
        const key = `${activeDatasetId}:${buildingId}:${floorId}`;
        setFloorPlans((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to remove floor plan association.";
        setFloorPlanError(msg);
        throw err;
      }
    },
    [activeDatasetId]
  );

  const getActiveFloorPlan = useCallback(
    (buildingId?: string | null, floorId?: string | null): FloorPlanAssociation | null => {
      if (!buildingId || !floorId || !activeDatasetId) return null;
      const key = `${activeDatasetId}:${buildingId}:${floorId}`;
      return floorPlans[key] || null;
    },
    [activeDatasetId, floorPlans]
  );

  // STEP 4: 3D Unit Modeling & Management
  const createConfiguredUnit = useCallback(
    async (payload: import("@/types/cadastre").UnitCreateRequest) => {
      setIsCreatingUnit(true);
      setUnitCreationError(null);
      try {
        const fullPayload: import("@/types/cadastre").UnitCreateRequest = {
          ...payload,
          dataset_id: payload.dataset_id || activeDatasetId,
        };
        const unit = await cadastreApi.createUnit(fullPayload);
        const key = `${unit.dataset_id || activeDatasetId}:${unit.building_id}:${unit.floor_id}:${unit.unit_id}`;
        setConfiguredUnits((prev) => ({ ...prev, [key]: unit }));

        // Append / update in units3DData for live 3D viewing
        if (unit.geometry_3d) {
          const resItem: Unit3DResult = {
            unit_id: unit.unit_id,
            dataset_id: unit.dataset_id || activeDatasetId,
            property_id: unit.property_id,
            parcel_id: unit.parcel_id,
            building_id: unit.building_id,
            floor_id: unit.floor_id,
            unit_number: unit.unit_number,
            unit_name: unit.unit_name,
            unit_type: unit.unit_type,
            base_elevation: unit.base_elevation,
            top_elevation: unit.top_elevation,
            height: unit.height,
            footprint_area: unit.footprint_area,
            volume_cubic_m: unit.volume_cubic_m,
            surface_area_sqm: ((unit.provenance?.surface_area_sqm as number) || undefined),
            geometry_status: "VALID" as import("@/types/geometry3d").Geometry3DStatus,
            geometry: unit.geometry_3d as import("@/types/geometry3d").Mesh3DCollection,
            warnings: unit.warnings || [],
            provenance: unit.provenance || {},
          };

          setUnits3DData((prev) => {
            const others = (prev?.results || []).filter((u) => u.unit_id !== unit.unit_id);
            const nextList = [...others, resItem];
            return {
              schema_version: "1.0",
              results: nextList,
              summary: {
                requested: nextList.length,
                successful: nextList.length,
                failed: 0,
              },
            };
          });
        }

        setSelectedUnitId(unit.unit_id);
        return unit;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create unit volume.";
        setUnitCreationError(msg);
        throw err;
      } finally {
        setIsCreatingUnit(false);
      }
    },
    [activeDatasetId]
  );

  const deleteConfiguredUnit = useCallback(
    async (buildingId: string, floorId: string, unitId: string) => {
      setUnitCreationError(null);
      try {
        await cadastreApi.deleteUnit(activeDatasetId, buildingId, floorId, unitId);
        const key = `${activeDatasetId}:${buildingId}:${floorId}:${unitId}`;
        setConfiguredUnits((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setUnits3DData((prev) => {
          if (!prev) return null;
          const nextResults = prev.results.filter((u) => u.unit_id !== unitId);
          return {
            ...prev,
            results: nextResults,
            summary: {
              ...prev.summary,
              requested: nextResults.length,
              successful: nextResults.length,
            },
          };
        });
        if (selectedUnitId === unitId) {
          setSelectedUnitId(null);
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete unit.";
        setUnitCreationError(msg);
        throw err;
      }
    },
    [activeDatasetId, selectedUnitId]
  );

  const getFloorConfiguredUnits = useCallback(
    (buildingId: string, floorId: string): Unit[] => {
      return Object.values(configuredUnits).filter(
        (u) =>
          u.building_id === buildingId &&
          u.floor_id === floorId &&
          (!u.dataset_id || u.dataset_id === activeDatasetId)
      );
    },
    [configuredUnits, activeDatasetId]
  );

  // Step 12 & 13: Generate / Extrude 3D Property Volumes & 3D ULPIN Prototypes
  const fetchDemoULPINs = useCallback(async () => {
    setIsGeneratingULPIN(true);
    setUlpinError(null);
    try {
      const items = await cadastreApi.getDemoULPINs();
      const map: Record<string, ULPINResult> = {};
      items.forEach((u) => {
        map[u.property_id] = u;
      });
      setUlpins3D(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch demo ULPINs";
      setUlpinError(msg);
    } finally {
      setIsGeneratingULPIN(false);
    }
  }, []);

  const generateULPINForProperty = useCallback(async (req: ULPINRequest) => {
    setIsGeneratingULPIN(true);
    setUlpinError(null);
    try {
      const res = await cadastreApi.generateULPIN(req);
      setUlpins3D((prev) => ({
        ...prev,
        [res.property_id]: res,
      }));
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate ULPIN";
      setUlpinError(msg);
      throw err;
    } finally {
      setIsGeneratingULPIN(false);
    }
  }, []);

  const verifyULPIN = useCallback(async (req: ULPINVerificationRequest) => {
    try {
      return await cadastreApi.verifyULPIN(req);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification request failed";
      throw new Error(msg);
    }
  }, []);

  const generate3DPropertyModels = useCallback(async () => {
    setIsGeneratingProperty3D(true);
    setProperty3DError(null);
    try {
      const res = await cadastreApi.extrudeDemoProperties();
      setProperty3DData(res);
      setViewMode("3d");
      setSubView3D("property");
      // Seamlessly fetch deterministic 3D ULPIN prototypes
      try {
        const uItems = await cadastreApi.getDemoULPINs();
        const map: Record<string, ULPINResult> = {};
        uItems.forEach((u) => {
          map[u.property_id] = u;
        });
        setUlpins3D(map);
      } catch {
        // Soft fallback
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate 3D property volumes.";
      setProperty3DError(msg);
    } finally {
      setIsGeneratingProperty3D(false);
    }
  }, []);

  // Step 17: Generate 3D Unit Models
  const generate3DUnitModels = useCallback(async () => {
    setIsGeneratingUnits3D(true);
    setUnits3DError(null);
    try {
      if (unitsDatasetName === "demo_units" || !unitsGeojson) {
        const res = await cadastreApi.getDemoUnits3D();
        setUnits3DData(res);
        setViewMode("3d");
        setSubView3D("units");
      } else {
        const requests = unitsGeojson.features.map((feat) => {
          const props = feat.properties || {};
          return {
            unit_id: props.unit_id || String(feat.id),
            property_id: props.property_id || null,
            parcel_id: props.parcel_id || "PARCEL-DEMO-102",
            building_id: props.building_id || "BLD-DEMO-002",
            floor_id: props.floor_id || "BLD-DEMO-002-FL05",
            unit_number: props.unit_number || "501",
            unit_name: props.unit_name || null,
            unit_type: props.unit_type || "APARTMENT_UNIT",
            geometry_2d: feat.geometry,
            base_elevation: props.base_elevation ?? null,
            top_elevation: props.top_elevation ?? null,
            height: props.height ?? 3.0,
            parent_floor_base: 577.48,
            parent_floor_top: 580.48,
            source_crs: "EPSG:4326",
            target_crs: "EPSG:32643",
          };
        });

        const res = await cadastreApi.generateUnits3D({
          units: requests,
          target_crs: "EPSG:32643",
          compute_shared_origin: true,
        });
        setUnits3DData(res);
        setViewMode("3d");
        setSubView3D("units");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate 3D unit models.";
      setUnits3DError(msg);
    } finally {
      setIsGeneratingUnits3D(false);
    }
  }, [unitsGeojson, unitsDatasetName]);

  // Step 15: Deterministic End-to-End Demo Runner & State Reset
  const resetDemo = useCallback(() => {
    setGeojson(null);
    setBuildingsGeojson(null);
    setNormalizedDataset(null);
    setValidationResult(null);
    setSelectedParcelId(null);
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedPropertyId(null);
    setActiveDatasetName(null);
    setBuildingDatasetName(null);
    setAssociationData(null);
    setElevationResults({});
    setBuildingHeights({});
    setBuildingFloors({});
    setBuilding3DData(null);
    setFloors3DData(null);
    setProperty3DData(null);
    setUnits3DData(null);
    setUnits3DError(null);
    setUlpins3D({});
    setGeneralError(null);
    setValidationError(null);
    setAssociationError(null);
    setElevationError(null);
    setHeightError(null);
    setFloorError(null);
    setBuilding3DError(null);
    setFloors3DError(null);
    setProperty3DError(null);
    setUnitsGeojson(null);
    setUnitsDatasetName(null);
    setSelectedUnitId(null);
    setUnitPropertyRecord(null);
    setUnitError(null);
    setExplodeDistance(0);
    setIsolatedFloorIndex(null);
    setViewMode("2d");
    setSubView3D("property");
  }, []);

  const runEndToEndDemo = useCallback(async () => {
    setIsDemoRunning(true);
    setGeneralError(null);

    try {
      // Step 1: Ingest Demo Datasets
      const parcelData = await cadastreApi.getDataset("demo_parcels");
      const bldData = await cadastreApi.getDemoBuildings();
      setGeojson(parcelData.raw_geojson);
      setBuildingsGeojson(bldData.raw_geojson);
      setActiveDatasetName("demo_parcels.geojson");
      setBuildingDatasetName("demo_buildings.geojson");

      // Step 2: Validate Parcels
      const valResponse = await cadastreApi.validateGeoJSON(parcelData.raw_geojson);
      setValidationResult(valResponse.validation);
      setNormalizedDataset(valResponse.normalized_dataset);

      // Step 3: Spatial Association
      const assocRes = await cadastreApi.associateBuildings({
        parcels: parcelData.raw_geojson,
        buildings: bldData.raw_geojson,
      });
      setAssociationData(assocRes);

      // Step 4: Sample DEM Ground Elevation
      const points: import("@/types/cadastre").ElevationSamplePoint[] = [];
      valResponse.normalized_dataset.parcels.forEach((p) => {
        if (p.centroid && p.centroid.length >= 2) {
          points.push({
            feature_id: p.parcel_id,
            longitude: p.centroid[0],
            latitude: p.centroid[1],
            crs: "EPSG:4326",
          });
        }
      });
      assocRes.associations.forEach((b) => {
        if (b.centroid && b.centroid.length >= 2) {
          points.push({
            feature_id: b.building_id,
            longitude: b.centroid[0],
            latitude: b.centroid[1],
            crs: "EPSG:4326",
          });
        }
      });

      const sampledElevMap: Record<string, import("@/types/cadastre").ElevationSampleResult> = {};
      const validPoints = points.filter(
        (pt) =>
          typeof pt.longitude === "number" &&
          !isNaN(pt.longitude) &&
          typeof pt.latitude === "number" &&
          !isNaN(pt.latitude)
      );
      if (validPoints.length > 0) {
        const elevResp = await cadastreApi.sampleElevation({ points: validPoints });
        elevResp.results.forEach((r) => {
          if (r.feature_id) {
            sampledElevMap[r.feature_id] = r;
          }
        });
        setElevationResults(sampledElevMap);
      }
      try {
        const demMeta = await cadastreApi.getDEMInfo();
        setDemMetadata(demMeta);
      } catch {}

      // Step 5: Building Height & Floor Structure
      const bldHeightMap: Record<string, HeightCalculationResult> = {};
      const bldFloorMap: Record<string, FloorGenerationResponse> = {};
      for (const feat of bldData.raw_geojson.features) {
        const props = (feat.properties || {}) as Record<string, unknown>;
        const bid = String(props.building_id || feat.id);
        const spec = demoSpecs[bid];
        const gZ = sampledElevMap[bid]?.elevation_m ?? (typeof props.ground_elevation === "number" ? props.ground_elevation : 562.48);
        const rZ = typeof props.roof_elevation === "number" ? props.roof_elevation : (spec?.roof_elevation ?? gZ + 12.0);
        const bH = typeof props.building_height === "number" ? props.building_height : (spec?.building_height ?? 12.0);
        const fCount = typeof props.number_of_floors === "number" ? props.number_of_floors : (spec?.number_of_floors ?? 4);

        try {
          const hRes = await cadastreApi.calculateBuildingHeight({
            building_id: bid,
            ground_elevation: gZ,
            roof_elevation: rZ,
          });
          bldHeightMap[bid] = hRes;
        } catch {}

        try {
          const fRes = await cadastreApi.generateFloors({
            building_id: bid,
            ground_elevation: gZ,
            building_height: bH,
            floor_count: fCount,
          });
          bldFloorMap[bid] = fRes;
        } catch {}
      }
      setBuildingHeights(bldHeightMap);
      setBuildingFloors(bldFloorMap);

      // Step 6: 3D Building Extrusion
      const bld3DRes = await cadastreApi.extrudeDemoBuildings();
      setBuilding3DData(bld3DRes);

      // Step 7: 3D Stratified Floors & Property Volumes
      const floors3DRes = await cadastreApi.extrudeDemoFloors();
      setFloors3DData(floors3DRes);

      const prop3DRes = await cadastreApi.extrudeDemoProperties();
      setProperty3DData(prop3DRes);

      // Step 8: Deterministic 3D ULPIN Prototypes
      const ulpinItems = await cadastreApi.getDemoULPINs();
      const ulpinMap: Record<string, ULPINResult> = {};
      ulpinItems.forEach((u) => {
        ulpinMap[u.property_id] = u;
      });
      setUlpins3D(ulpinMap);

      // Step 8b: Load Unit / Apartment Models & 3D Solids
      try {
        const unitsData = await cadastreApi.getDemoUnits();
        setUnitsGeojson(unitsData);
        setUnitsDatasetName("demo_units.geojson");
        const units3DRes = await cadastreApi.getDemoUnits3D();
        setUnits3DData(units3DRes);
      } catch {}

      // Step 8c: Load Underground Assets
      try {
        const undBundle = await cadastreApi.getUndergroundDemo();
        setUndergroundBundle(undBundle);
      } catch {}

      // Step 8d: Load Topology Demonstration Scene (Defaults to Valid Scene)
      try {
        const topoDemo = await cadastreApi.getDemoTopology("valid");
        setTopologyData(topoDemo.validation_result);
      } catch {}

      // Step 8e: Ingest Authoritative Reference Control Points (GNSS / CORS)
      try {
        await cadastreApi.getControlPoints();
      } catch {}

      // Auto-select canonical reference demo property:
      // PARCEL: P001 -> BUILDING: B01 -> FLOOR: FL05 -> UNIT: 501
      setSelectedParcelId("P001");
      setSelectedBuildingId("B01");
      setSelectedFloorId("FL05");
      setSelectedUnitId("U501");
      setSelectedPropertyId("PROP-DEMO-102-U501");

      try {
        const uRec = await cadastreApi.getCanonicalDemoPropertyRecord();
        setUnitPropertyRecord(uRec);
      } catch {
        try {
          const fallbackRec = await cadastreApi.getUnitPropertyRecord("BLD-DEMO-002-FL05-U501");
          setUnitPropertyRecord(fallbackRec);
        } catch {}
      }

      // Switch to 3D Units View
      setViewMode("3d");
      setSubView3D("units");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Error executing demo pipeline.";
      setGeneralError(msg);
    } finally {
      setIsDemoRunning(false);
    }
  }, [demoSpecs]);

  // Compute dynamic PipelineStep list reflecting authoritative real-time state across 8 validation stages
  const pipelineSteps: import("@/components/cadastral/PipelineStatus").PipelineStep[] = useMemo(() => {
    const hasParcels = !!geojson && geojson.features.length > 0;
    const hasBuildings = !!buildingsGeojson && buildingsGeojson.features.length > 0;

    // Stage 01: INGESTION (GIS + Drone/Aerial + LiDAR + DEM + Floor Plans)
    let s1Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s1Detail = "";
    if (isLoading && !hasParcels) s1Status = "PROCESSING";
    else if (hasParcels && hasBuildings) {
      s1Status = "COMPLETE";
      s1Detail = `${geojson.features.length} Parcels / ${buildingsGeojson.features.length} Buildings`;
    } else if (hasParcels || hasBuildings) {
      s1Status = "WARNING";
      s1Detail = hasParcels ? "Parcels only" : "Buildings only";
    }

    // Stage 02: GEO-REF (Common CRS & Metric Reprojection)
    let s2Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s2Detail = "";
    if (isValidating) s2Status = "PROCESSING";
    else if (validationResult) {
      if (validationResult.valid) {
        s2Status = "COMPLETE";
        s2Detail = `${validationResult.feature_count} Valid (EPSG:4326/32643)`;
      } else {
        s2Status = "ERROR";
        s2Detail = `${validationResult.errors.length} Errors`;
      }
    }

    // Stage 03: FUSION (Footprint-to-Parcel Association & DEM Sampling)
    let s3Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s3Detail = "";
    const elevCount = Object.keys(elevationResults).length;
    if (isAssociating || isSamplingElevation) s3Status = "PROCESSING";
    else if (associationData && elevCount > 0) {
      s3Status = "COMPLETE";
      s3Detail = `${associationData.summary.associated_buildings} Mapped · ${elevCount} Sampled`;
    } else if (associationData || elevCount > 0) {
      s3Status = "WARNING";
      s3Detail = associationData ? `${associationData.summary.associated_buildings} Mapped` : `${elevCount} Sampled`;
    }

    // Stage 04: AI/ML (Candidate Extraction, Floor Segmentation & Gating)
    let s4Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s4Detail = "";
    const floorCount = Object.keys(buildingFloors).length;
    const unitCount = unitsGeojson?.features.length || 0;
    if (isCalculatingHeight || isGeneratingFloors || isLoadingUnits) s4Status = "PROCESSING";
    else if (floorCount > 0 || unitCount > 0) {
      s4Status = "COMPLETE";
      s4Detail = `${floorCount} Segmented · ${unitCount} Units`;
    }

    // Stage 05: 3D ENGINE (Watertight Polyhedral Extrusion, Contract v1.0)
    let s5Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s5Detail = "";
    const bld3DCount = building3DData?.summary.successful || 0;
    const fl3DCount = floors3DData?.summary.successful || 0;
    const prop3DCount = property3DData?.summary.successful || 0;
    const units3DCount = units3DData?.summary.successful || 0;
    const total3D = bld3DCount + fl3DCount + prop3DCount + units3DCount;
    if (isGenerating3D || isGeneratingFloors3D || isGeneratingProperty3D || isGeneratingUnits3D) s5Status = "PROCESSING";
    else if (total3D > 0) {
      s5Status = "COMPLETE";
      s5Detail = `${total3D} Solids Extruded`;
    }

    // Stage 06: TOPOLOGY (Unified Conflict Engine, Overlaps, Containment)
    let s6Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s6Detail = "";
    if (isAuditingTopology) s6Status = "PROCESSING";
    else if (topologyData) {
      if (topologyData.summary.overall_status === "VALID") {
        s6Status = "COMPLETE";
        s6Detail = `${topologyData.summary.passed_checks} Valid (0 Conflicts)`;
      } else if (topologyData.summary.overall_status === "WARNING") {
        s6Status = "WARNING";
        s6Detail = `${topologyData.summary.warning_checks} Warnings`;
      } else {
        s6Status = "ERROR";
        s6Detail = `${topologyData.summary.conflict_checks} Conflicts Detected`;
      }
    }

    // Stage 07: 3D ULPIN (Deterministic 3D Spatial Hash Prototype)
    let s7Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s7Detail = "";
    const ulpinCount = Object.keys(ulpins3D).length;
    if (isGeneratingULPIN) s7Status = "PROCESSING";
    else if (ulpinCount > 0) {
      const validCount = Object.values(ulpins3D).filter((u) => u.identifier_status === "VALID").length;
      s7Status = validCount > 0 ? "COMPLETE" : "WARNING";
      s7Detail = `${validCount} Verified (SHA-256)`;
    }

    // Stage 08: VIEWER (Interactive 2D Map + 3D Three.js Volumetric Stage)
    let s8Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s8Detail = "";
    if (viewMode === "3d" && total3D > 0) {
      s8Status = "COMPLETE";
      s8Detail = `3D View Active (${subView3D.toUpperCase()})`;
    } else if (hasParcels || hasBuildings) {
      s8Status = "COMPLETE";
      s8Detail = "2D Cadastral Map Active";
    }

    return [
      {
        id: "01-ingestion",
        stepNumber: "01",
        title: "01 INGESTION",
        description: "Multi-source ingest: 2D GIS parcels, building footprints, DEM raster, underground assets, and floor plans.",
        provenance: "GeoJSON / Ingestion Engine",
        status: s1Status,
        detail: s1Detail,
      },
      {
        id: "02-geo-ref",
        stepNumber: "02",
        title: "02 GEO-REF",
        description: "Coordinate reference system audit and projection alignment to metric grid (EPSG:32643 / WGS 84).",
        provenance: "PROJ / Shapely GEOS",
        status: s2Status,
        detail: s2Detail,
      },
      {
        id: "03-fusion",
        stepNumber: "03",
        title: "03 FUSION",
        description: "Multi-source data fusion: Spatial association of footprints with parcels and DEM orthometric ground elevation sampling.",
        provenance: "Spatial Intersect + Copernicus DEM",
        status: s3Status,
        detail: s3Detail,
      },
      {
        id: "04-ai-extraction",
        stepNumber: "04",
        title: "04 AI/ML",
        description: "AI extraction layer: Candidate building extraction, floor segmentation, vertical delineation & property candidate gating.",
        provenance: "Candidate Gating & Heuristics",
        status: s4Status,
        detail: s4Detail,
      },
      {
        id: "05-3d-engine",
        stepNumber: "05",
        title: "05 3D ENGINE",
        description: "Watertight polyhedral extrusion conforming strictly to Canonical 3D Geometry Contract v1.0.",
        provenance: "Mesh3D v1.0 / Trimesh",
        status: s5Status,
        detail: s5Detail,
      },
      {
        id: "06-topology",
        stepNumber: "06",
        title: "06 TOPOLOGY",
        description: "Unified spatial conflict engine: Overlap check, containment, duplicates, underground clash, and 3D manifold audit.",
        provenance: "STHARA Stage 06 Topology Engine",
        status: s6Status,
        detail: s6Detail,
      },
      {
        id: "07-3d-ulpin",
        stepNumber: "07",
        title: "07 3D ULPIN",
        description: "Deterministic, cryptographically verifiable 3D spatial identifier generated for property units and volumes.",
        provenance: "SHA-256 Spatial Hash Prototype",
        status: s7Status,
        detail: s7Detail,
      },
      {
        id: "08-viewer",
        stepNumber: "08",
        title: "08 VIEWER",
        description: "Interactive dual-canvas visualization: Synchronized 2D cadastral map + 3D Three.js volumetric viewer with vertical cutaways.",
        provenance: "Three.js / MapLibre GL",
        status: s8Status,
        detail: s8Detail,
      },
    ];
  }, [
    geojson,
    buildingsGeojson,
    isLoading,
    isValidating,
    validationResult,
    isAssociating,
    associationData,
    isSamplingElevation,
    elevationResults,
    isCalculatingHeight,
    isGeneratingFloors,
    buildingFloors,
    isLoadingUnits,
    unitsGeojson,
    isGenerating3D,
    building3DData,
    isGeneratingFloors3D,
    floors3DData,
    isGeneratingProperty3D,
    property3DData,
    isGeneratingUnits3D,
    units3DData,
    isGeneratingULPIN,
    ulpins3D,
    isAuditingTopology,
    topologyData,
    viewMode,
    subView3D,
  ]);

    // Find currently selected normalized parcel
  const selectedParcel: NormalizedParcel | null =
    normalizedDataset?.parcels.find((p) => p.parcel_id === selectedParcelId) || null;

  // Find currently selected building
  const selectedBuilding: import("@/types/cadastre").BuildingAssociationResult | import("@/types/cadastre").GeoJSONFeature | null =
    (selectedBuildingId && associationData?.associations.find((b) => b.building_id === selectedBuildingId)) ||
    (selectedBuildingId && buildingsGeojson?.features.find((f) => {
      const bid = (f.properties?.building_id as string) || (f.id ? String(f.id) : null);
      return bid === selectedBuildingId;
    })) ||
    null;

  // Associated buildings for selected parcel
  const selectedParcelAssociatedBuildings: string[] =
    (selectedParcelId && associationData?.parcel_building_map[selectedParcelId]) || [];

  // Elevation for currently selected parcel & building
  const selectedParcelElevation: import("@/types/cadastre").ElevationSampleResult | null =
    (selectedParcelId && elevationResults[selectedParcelId]) || null;

  const selectedBuildingElevation: import("@/types/cadastre").ElevationSampleResult | null =
    (selectedBuildingId && elevationResults[selectedBuildingId]) || null;

  // Building height and floor outputs for active building
  const selectedBuildingHeight: HeightCalculationResult | null =
    (selectedBuildingId && buildingHeights[selectedBuildingId]) || null;

  const selectedBuildingFloors: FloorGenerationResponse | null =
    (selectedBuildingId && buildingFloors[selectedBuildingId]) || null;

  const selectedBuildingSpec: BuildingVerticalSpec | null =
    (selectedBuildingId && demoSpecs[selectedBuildingId]) || null;

  // Step 11: 3D geometry result for active building
  const selectedBuilding3D: Building3DResult | null =
    (selectedBuildingId && building3DData?.results.find((b) => b.building_id === selectedBuildingId)) || null;

  // Step 12: 3D floor solids for active building
  const selectedBuildingFloors3D: BuildingFloors3DResult | null =
    (selectedBuildingId && floors3DData?.results.find((b) => b.building_id === selectedBuildingId)) || null;

  // Step 12: Active property volume
  const selectedProperty3D: PropertyVolumeResult | null =
    (selectedPropertyId && property3DData?.results.find((p) => p.property_id === selectedPropertyId)) || null;

  // Step 16 & Step 4: Selected Unit (checks configuredUnits first, then synthetic units)
  const selectedUnit: Unit | null = useMemo(() => {
    if (!selectedUnitId) return null;
    const conf = Object.values(configuredUnits).find((u) => u.unit_id === selectedUnitId);
    if (conf) return conf;
    if (!unitsGeojson) return null;
    const feat = unitsGeojson.features.find((f) => f.properties.unit_id === selectedUnitId);
    return feat ? feat.properties : null;
  }, [configuredUnits, unitsGeojson, selectedUnitId]);

  // Step 16 & Step 4: Units for the currently selected floor
  const selectedFloorUnits: Unit[] = useMemo(() => {
    if (!selectedFloorId) return [];
    const confList = Object.values(configuredUnits).filter(
      (u) =>
        u.floor_id === selectedFloorId &&
        (!u.dataset_id || u.dataset_id === activeDatasetId)
    );
    if (confList.length > 0) return confList;
    if (!unitsGeojson) return [];
    return unitsGeojson.features
      .filter((f) => f.properties.floor_id === selectedFloorId)
      .map((f) => f.properties);
  }, [configuredUnits, activeDatasetId, unitsGeojson, selectedFloorId]);

  // Step 17 & Step 4: Selected Unit 3D Result
  const selectedUnit3D: Unit3DResult | null = useMemo(() => {
    if (!selectedUnitId) return null;
    if (units3DData) {
      const match = units3DData.results.find((u) => u.unit_id === selectedUnitId);
      if (match) return match;
    }
    const conf = Object.values(configuredUnits).find((u) => u.unit_id === selectedUnitId);
    if (conf && conf.geometry_3d) {
      return {
        unit_id: conf.unit_id,
        dataset_id: conf.dataset_id || activeDatasetId,
        spatial_id: conf.spatial_id || `${conf.dataset_id || activeDatasetId}-${conf.building_id}-${conf.floor_id}-${conf.unit_id}`,
        property_id: conf.property_id,
        parcel_id: conf.parcel_id,
        building_id: conf.building_id,
        floor_id: conf.floor_id,
        unit_number: conf.unit_number,
        unit_name: conf.unit_name,
        unit_type: conf.unit_type,
        base_elevation: conf.base_elevation,
        top_elevation: conf.top_elevation,
        z_min: conf.z_min ?? conf.base_elevation,
        z_max: conf.z_max ?? conf.top_elevation,
        height: conf.height,
        footprint_area: conf.footprint_area,
        volume_cubic_m: conf.volume_cubic_m,
        surface_area_sqm: ((conf.provenance?.surface_area_sqm as number) || undefined),
        geometry_status: "VALID" as import("@/types/geometry3d").Geometry3DStatus,
        geometry: conf.geometry_3d as import("@/types/geometry3d").Mesh3DCollection,
        warnings: conf.warnings || [],
        provenance: conf.provenance || {},
      };

    }
    return null;
  }, [units3DData, configuredUnits, activeDatasetId, selectedUnitId]);

  // Selected Building Metadata from OSM Conversion
  const selectedBuildingMetadata = useMemo<BuildingMetadataItem | null>(() => {
    if (!selectedBuildingId || !conversionResult?.buildings_metadata) return null;
    return (
      conversionResult.buildings_metadata.find(
        (b) => b.building_id === selectedBuildingId || b.osm_id === selectedBuildingId
      ) || null
    );
  }, [selectedBuildingId, conversionResult]);

  // Step 16: Real-World Demonstration System Callbacks
  const runRealWorldDemo = useCallback(async () => {
    setIsDemoRunning(true);
    setGeneralError(null);
    try {
      const res = await cadastreApi.launchDemo();
      setDemoLandingState(res);
      setActiveDatasetId("STHARA-REALWORLD-DEMO");
      setActiveDatasetName("Connaught Tower A - Commercial & Public Complex");
      setSelectedBuildingId("DEMO-BUILDING-001");

      // Seamlessly pre-load 3D extruded building, floor, and unit models
      try {
        const [bld3D, fl3D, unit3D] = await Promise.all([
          cadastreApi.extrudeDemoBuildings(),
          cadastreApi.extrudeDemoFloors(),
          cadastreApi.getDemoUnits3D(),
        ]);
        if (bld3D) setBuilding3DData(bld3D);
        if (fl3D) setFloors3DData(fl3D);
        if (unit3D) setUnits3DData(unit3D);
      } catch (meshErr) {
        console.warn("Could not pre-fetch 3D demo meshes:", meshErr);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to launch real-world demo.";
      setGeneralError(msg);
    } finally {
      setIsDemoRunning(false);
    }
  }, [setSelectedBuildingId]);

  const resetRealWorldDemo = useCallback(async () => {
    setIsDemoRunning(true);
    setGeneralError(null);
    try {
      await cadastreApi.resetDemo();
      setBuilding3DData(null);
      setFloors3DData(null);
      setUnits3DData(null);
      setProperty3DData(null);
      setConfiguredUnits({});
      setSelectedBuildingId(null);
      setSelectedFloorId(null);
      setSelectedUnitId(null);
      setSelectedPropertyId(null);
      await runRealWorldDemo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset demo.";
      setGeneralError(msg);
    } finally {
      setIsDemoRunning(false);
    }
  }, [runRealWorldDemo, setSelectedBuildingId]);

  return {
    backendConnected,
    isLoading,
    isValidating,
    isAssociating,
    isSamplingElevation,
    isCalculatingHeight,
    isGeneratingFloors,
    isGenerating3D,
    isGeneratingFloors3D,
    isGeneratingProperty3D,
    generalError,
    validationError,
    associationError,
    elevationError,
    heightError,
    floorError,
    building3DError,
    floors3DError,
    property3DError,
    geojson,
    buildingsGeojson,
    normalizedDataset,
    validationResult,
    associationData,
    demMetadata,
    elevationResults,
    buildingHeights,
    buildingFloors,
    demoSpecs,
    building3DData,
    floors3DData,
    property3DData,
    viewMode,
    setViewMode,
    subView3D,
    setSubView3D,
    selectedFloorId,
    setSelectedFloorId,
    selectedPropertyId,
    setSelectedPropertyId,
    explodeDistance,
    setExplodeDistance,
    isolatedFloorIndex,
    setIsolatedFloorIndex,
    selectedParcelId,
    selectedParcel,
    selectedBuildingId,
    selectedBuilding,
    selectedParcelAssociatedBuildings,
    selectedParcelElevation,
    selectedBuildingElevation,
    selectedBuildingHeight,
    selectedBuildingFloors,
    selectedBuildingSpec,
    selectedBuilding3D,
    selectedBuildingFloors3D,
    selectedProperty3D,
    buildingDatasetName,
    layerVisibility,
    toggleLayer,
    loadDemoParcels,
    loadDemoBuildings,
    loadRealOSMBuildings,
    uploadGeoJson,
    runValidation,
    runBuildingAssociation,
    sampleActiveElevation,
    calculateSelectedBuildingHeight,
    generateSelectedBuildingFloors,
    generateConfiguredBuilding3D,
    generate3DBuildingModels,
    generate3DFloorModels,
    generate3DPropertyModels,
    ulpins3D,
    isGeneratingULPIN,
    ulpinError,
    fetchDemoULPINs,
    generateULPINForProperty,
    verifyULPIN,
    unitsGeojson,
    unitsDatasetName,
    selectedUnitId,
    selectedUnit,
    selectedFloorUnits,
    unitPropertyRecord,
    isLoadingUnits,
    unitError,
    loadDemoUnits,
    units3DData,
    isGeneratingUnits3D,
    units3DError,
    selectedUnit3D,
    generate3DUnitModels,
    setSelectedUnitId,
    setSelectedParcelId,
    setSelectedBuildingId,
    // Step 16 Demo controls
    isDemoRunning,
    demoLandingState,
    runRealWorldDemo,
    resetRealWorldDemo,
    runEndToEndDemo: runRealWorldDemo,
    resetDemo: resetRealWorldDemo,
    undergroundBundle,
    selectedUndergroundId,
    setSelectedUndergroundId,
    isLoadingUnderground,
    undergroundError,
    cutawayMode,
    setCutawayMode,
    loadDemoUnderground,
    topologyData,
    isAuditingTopology,
    topologyError,
    runTopologyAudit,
    loadDemoTopology,
    pipelineSteps,
    // OSM file upload
    osmUploadPhase,
    osmUploadFile,
    osmUploadResult,
    osmUploadError,
    selectOsmFile,
    importOsmFile,
    // Real OSM -> 3D Pipeline & Export
    conversionConfig,
    setConversionConfig,
    isConverting,
    conversionError,
    conversionResult,
    conversionStages,
    runOsm3DConversion,
    uploadAndConvertOsmFile,
    activeProjectName,
    setActiveProjectName,
    selectedBuildingMetadata,
    activeDatasetId,
    setActiveDatasetId,
    activeDatasetName,
    setActiveDatasetName,
    activeDatasetType,
    setActiveDatasetType,
    activeDatasetHash,
    setActiveDatasetHash,
    // Step 3: Floor Plans & Blueprints
    floorPlans,
    isUploadingFloorPlan,
    floorPlanError,
    attachFloorPlan,
    removeFloorPlan,
    getActiveFloorPlan,
    // Step 4: 3D Unit Modeling & Management
    configuredUnits,
    isCreatingUnit,
    unitCreationError,
    createConfiguredUnit,
    deleteConfiguredUnit,
    getFloorConfiguredUnits,
    // Step 21-36: Drawing Intelligence & Spatial Source Modes
    spatialSourceStatus,
    drawingAnalysis,
    setDrawingAnalysis,
    isDrawingImportOpen,
    setIsDrawingImportOpen,
    isDrawingReviewOpen,
    setIsDrawingReviewOpen,
    refreshSpatialSourceStatus,
    handleModelBuiltFromDrawings,
    // Step 37+: Unified Project Data Entry
    projectDataAnalysis,
    setProjectDataAnalysis,
    isAnalyzingProjectData,
    projectDataError,
    isProjectDataEntryOpen,
    setIsProjectDataEntryOpen,
    uploadAndAnalyzeProjectData,
    loadGoldenDemoProjectData,
    updateBuildingCorrelation,
  };
}



