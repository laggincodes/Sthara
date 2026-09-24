import {
  ApiResponse,
  ApiErrorResponse,
  DatasetSummary,
  GeoJSONFeatureCollection,
  NormalizedParcelDataset,
  GeoJSONValidationResult,
  SpatialAssociationResponse,
  SpatialAssociationRequest,
  DEMMetadata,
  ElevationBatchSampleRequest,
  ElevationBatchSampleResponse,
  HeightCalculationRequest,
  HeightCalculationResult,
  FloorGenerationRequest,
  FloorGenerationResponse,
  BuildingVerticalSpec,
  BatchBuilding3DRequest,
  Generate3DResponse,
  BatchBuildingFloors3DRequest,
  GenerateFloors3DResponse,
  BatchPropertyVolumeRequest,
  PropertyVolumeRequest,
  GeneratePropertyVolumeResponse,
  ULPINRequest,
  ULPINResult,
  ULPINVerificationRequest,
  ULPINVerificationResult,
  Unit,
  UnitValidationResult,
  UnitBatchValidationResponse,
  UnitPropertyRecord,
  UnitFeatureCollection,
  BatchUnit3DRequest,
  GenerateUnits3DResponse,
  FusionValidateRequest,
  FusionValidateResponse,
  FusionNormalizeRequest,
  FusionNormalizeResponse,
  PropertyContextRequest,
  PropertyContextResponse,
  ModelRegistryResponse,
  ExtractionResult,
  CandidateValidationRequest,
  CandidateValidationResponse,
  CandidateComparisonRequest,
  CandidateComparisonResponse,
  DemoAiExtractionResponse,
  UndergroundFeature,
  UndergroundValidationRequest,
  UndergroundValidationResponse,
  Underground3DRequest,
  Underground3DResult,
  GenerateUnderground3DResponse,
  UndergroundConflictRequest,
  UndergroundConflictResponse,
  DemoUndergroundResponse,
  TopologyValidationRequest,
  TopologyValidationResponse,
  DemoTopologyResponse,
  ControlPointValidationRequest,
  ControlPointValidationResponse,
  OsmUploadResult,
  Osm3DConversionConfig,
  Osm3DConversionResponse,
  OsmDatasetItem,
  DataMeetLayerInfo,
  DataMeetAlignmentResponse,
  DataMeetMetadataResponse,
  ContainmentRequest,
  ContainmentResponse,
  IntersectionRequest,
  IntersectionResponse,
  ProximityRequest,
  ProximityResponse,
  VerticalRelationshipRequest,
  VerticalRelationshipResponse,
  DimensionsRequest,
  DimensionsResponse,
  DistanceRequest,
  DistanceResponse,
  QualityEvaluationRequest,
  QualityEvaluationResponse,
  SpatialSource,
  SourceRegisterRequest,
  SourceFeaturesRequest,
  SourceListResponse,
  SourceDeleteResponse,
  SpatialSourceStatus,
  DrawingAnalysis,
  DrawingCandidate,
  BuildModelRequest,
  BuildModelResponse,
  UnifiedProjectDataAnalysis,
  BuildingCorrelationMatch,
  BuildingCorrelationUpdateRequest,
} from "@/types/cadastre";
import {
  CombinedSpatialQueryRequest,
  CombinedSpatialQueryResponse,
} from "@/types/spatial_analysis";
import {
  FloorPlanAssociation,
  FloorPlanListResponse,
  FloorPlanDeleteResponse,
} from "@/types/floor_plan";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  errorCode: string;
  statusCode: number;
  validationData?: GeoJSONValidationResult;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = "API_ERROR",
    validationData?: GeoJSONValidationResult
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.validationData = validationData;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }

    if (errorData) {
      const errRecord = errorData as unknown as Record<string, unknown>;
      const detailMsg =
        typeof errRecord.detail === "string"
          ? errRecord.detail
          : errRecord.detail
          ? JSON.stringify(errRecord.detail)
          : undefined;
      const msg =
        detailMsg ||
        errorData.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(
        msg,
        response.status,
        errorData.error_code || "HTTP_ERROR",
        errorData.data?.validation
      );
    }

    if (response.status === 404) {
      throw new ApiError("Requested cadastral resource was not found (HTTP 404).", 404, "NOT_FOUND");
    }

    throw new ApiError(
      `Server returned HTTP ${response.status}: ${response.statusText}`,
      response.status,
      "SERVER_ERROR"
    );
  }

  const json: ApiResponse<T> = await response.json();
  return json.data !== undefined ? json.data : (json as unknown as T);
}

export const cadastreApi = {
  /**
   * Diagnostic health check for FastAPI backend.
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await response.json();
    } catch {
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Lists available demo & uploaded datasets.
   */
  async listDatasets(): Promise<DatasetSummary[]> {
    try {
      const response = await fetch(`${BASE_URL}/datasets`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DatasetSummary[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Fetches raw GeoJSON for a dataset by ID.
   */
  async getDataset(datasetId: string): Promise<{ dataset_id: string; raw_geojson: GeoJSONFeatureCollection }> {
    try {
      const response = await fetch(`${BASE_URL}/datasets/${datasetId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<{ dataset_id: string; raw_geojson: GeoJSONFeatureCollection }>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Submits a raw GeoJSON FeatureCollection for deterministic validation and normalization.
   */
  async validateGeoJSON(
    payload: GeoJSONFeatureCollection
  ): Promise<{ validation: GeoJSONValidationResult; normalized_dataset: NormalizedParcelDataset }> {
    try {
      const response = await fetch(`${BASE_URL}/datasets/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<{
        validation: GeoJSONValidationResult;
        normalized_dataset: NormalizedParcelDataset;
      }>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Uploads an untrusted GeoJSON file to the backend validation endpoint.
   */
  async uploadDataset(file: File): Promise<NormalizedParcelDataset> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BASE_URL}/datasets/upload`, {
        method: "POST",
        body: formData,
      });
      return await handleResponse<NormalizedParcelDataset>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Loads the preloaded synthetic demo building footprints dataset.
   */
  async getDemoBuildings(): Promise<{ dataset_id: string; raw_geojson: GeoJSONFeatureCollection }> {
    return this.getDataset("demo_buildings");
  },

  /**
   * Loads real/active OpenStreetMap or GeoJSON building footprints for activeDatasetId.
   */
  async getRealOSMBuildings(datasetId: string = "ds_tagore_garden_map_osm"): Promise<{
    dataset_id: string;
    dataset_name: string;
    raw_geojson: GeoJSONFeatureCollection;
    is_cadastral: boolean;
  }> {
    const res = await this.getOsmDatasetGeoJSON(datasetId);
    return {
      dataset_id: res.dataset_id,
      dataset_name: res.dataset_name,
      raw_geojson: res.raw_geojson,
      is_cadastral: false,
    };
  },

  /**
   * Fetches the 2D GeoJSON building footprints for any registered dataset.
   */
  async getOsmDatasetGeoJSON(datasetId: string): Promise<{
    dataset_id: string;
    dataset_name: string;
    feature_count: number;
    raw_geojson: GeoJSONFeatureCollection;
  }> {
    if (!datasetId || typeof datasetId !== "string" || !datasetId.trim()) {
      throw new ApiError("A valid dataset ID is required to fetch 2D building footprints.", 400, "INVALID_DATASET_ID");
    }

    const trimmedId = datasetId.trim();
    const response = await fetch(`${BASE_URL}/osm/buildings?dataset_id=${encodeURIComponent(trimmedId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {}
      throw new ApiError(
        errorData?.message || `Unable to load dataset '${trimmedId}': HTTP ${response.status}`,
        response.status,
        errorData?.error_code || "NOT_FOUND"
      );
    }

    const json = await response.json();
    const payload = json.data !== undefined ? json.data : json;
    const rawGeojson: GeoJSONFeatureCollection =
      payload && payload.type === "FeatureCollection"
        ? payload
        : (payload?.raw_geojson || payload);

    if (!rawGeojson || !Array.isArray(rawGeojson.features)) {
      throw new ApiError(
        `Dataset '${trimmedId}' did not return a valid GeoJSON FeatureCollection.`,
        500,
        "INVALID_GEOJSON_PAYLOAD"
      );
    }

    const respDatasetId = json.dataset_id || trimmedId;
    if (respDatasetId !== trimmedId && !["real_osm_buildings", "osm_buildings"].includes(trimmedId)) {
      throw new ApiError(
        `Dataset mismatch: requested '${trimmedId}', but backend returned '${respDatasetId}'.`,
        409,
        "DATASET_MISMATCH"
      );
    }

    return {
      dataset_id: respDatasetId,
      dataset_name: json.dataset_name || trimmedId,
      feature_count: json.feature_count ?? rawGeojson.features.length,
      raw_geojson: rawGeojson,
    };
  },

  /**
   * Triggers re-extraction and conversion of raw map.osm into processed GeoJSON.
   */
  async importOSMBuildings(): Promise<{ status: string; message: string; data: Record<string, unknown> }> {
    const response = await fetch(`${BASE_URL}/buildings/import-osm`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<{ status: string; message: string; data: Record<string, unknown> }>(response);
  },

  /**
   * Uploads a user-provided .osm file to the backend for validation, storage, and
   * building extraction via the existing OSMBuildingExtractor.
   * Returns the full extraction summary and non-cadastral metadata.
   */
  async uploadOSMFile(file: File): Promise<OsmUploadResult> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/buildings/upload-osm`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
    } catch {
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
    return await handleResponse<OsmUploadResult>(response);
  },

  /**
   * Uploads an OSM/GeoJSON file to register it in the dataset store without immediate conversion.
   */
  async uploadOsmDataset(file: File): Promise<OsmDatasetItem> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${BASE_URL}/osm/upload`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    return await handleResponse<OsmDatasetItem>(response);
  },

  /**
   * Lists all registered OSM/GeoJSON datasets.
   */
  async listOsmDatasets(): Promise<OsmDatasetItem[]> {
    const response = await fetch(`${BASE_URL}/osm/datasets`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<OsmDatasetItem[]>(response);
  },

  /**
   * Executes the full end-to-end OSM -> 3D conversion pipeline with configurable parameters.
   */
  async convertOsmTo3D(config: Osm3DConversionConfig): Promise<Osm3DConversionResponse> {
    const response = await fetch(`${BASE_URL}/osm/convert-3d`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(config),
    });
    return await handleResponse<Osm3DConversionResponse>(response);
  },

  /**
   * Uploads an OSM/GeoJSON file and executes immediate 3D conversion.
   */
  async uploadAndConvertOsm(
    file: File,
    config: Osm3DConversionConfig
  ): Promise<Osm3DConversionResponse> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("height_source", config.height_source);
    formData.append("default_floor_height_m", String(config.default_floor_height_m));
    formData.append("default_building_height_m", String(config.default_building_height_m));
    formData.append("target_crs", config.target_crs);
    formData.append("export_format", config.export_format);

    const response = await fetch(`${BASE_URL}/osm/upload-and-convert`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    return await handleResponse<Osm3DConversionResponse>(response);
  },

  /**
   * Retrieves the diagnostics and stage performance report from the last or specific 3D conversion.
   */
  async getConversionStatus(datasetId?: string): Promise<{ status: string; data: Osm3DConversionResponse }> {
    const query = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    const response = await fetch(`${BASE_URL}/osm/conversion-status${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<{ status: string; data: Osm3DConversionResponse }>(response);
  },

  getGlbUrl(datasetId: string = "latest"): string {
    return `${BASE_URL}/export/glb/${datasetId}`;
  },

  getGltfUrl(datasetId: string = "latest"): string {
    return `${BASE_URL}/export/gltf/${datasetId}`;
  },

  getMetadataUrl(datasetId: string = "latest"): string {
    return `${BASE_URL}/export/metadata/${datasetId}`;
  },

  getLatestGlbUrl(): string {
    return `${BASE_URL}/export/glb/latest`;
  },

  getLatestGltfUrl(): string {
    return `${BASE_URL}/export/gltf/latest`;
  },

  getLatestMetadataUrl(): string {
    return `${BASE_URL}/export/metadata/latest`;
  },

  /**
   * Deterministically analyzes spatial overlap and associates building footprints
   * with parent cadastral land parcels.
   */
  async associateBuildings(
    payload: SpatialAssociationRequest
  ): Promise<SpatialAssociationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial/associate-buildings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<SpatialAssociationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Inspects active GeoTIFF DEM metadata and elevation statistics.
   */
  async getDEMInfo(demName?: string): Promise<DEMMetadata> {
    const url = demName
      ? `${BASE_URL}/elevation/info?dem_name=${encodeURIComponent(demName)}`
      : `${BASE_URL}/elevation/info`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DEMMetadata>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Deterministically samples ground elevation values at queried coordinates.
   */
  async sampleElevation(
    payload: ElevationBatchSampleRequest
  ): Promise<ElevationBatchSampleResponse> {
    try {
      const response = await fetch(`${BASE_URL}/elevation/sample`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ElevationBatchSampleResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the geospatial processing service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 9: Calculates structural building height = roof_elevation - ground_elevation.
   */
  async calculateBuildingHeight(
    payload: HeightCalculationRequest
  ): Promise<HeightCalculationResult> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/calculate-height`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<HeightCalculationResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the building height calculation service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 9: Generates deterministic floor levels from building height.
   */
  async generateFloors(
    payload: FloorGenerationRequest
  ): Promise<FloorGenerationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/generate-floors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<FloorGenerationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the floor generation service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 9: Fetches pre-configured synthetic vertical specs for demo buildings.
   */
  async getDemoBuildingSpecs(): Promise<BuildingVerticalSpec[]> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/demo-specs`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<BuildingVerticalSpec[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the building specification service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 11: Extrudes building footprints into closed 3D polyhedral meshes.
   */
  async generate3DBuildings(
    payload: BatchBuilding3DRequest
  ): Promise<Generate3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/generate-3d`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<Generate3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the 3D building generation service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 11: Extrudes all preloaded demo buildings into 3D meshes using sampled DEM elevations.
   */
  async extrudeDemoBuildings(): Promise<Generate3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/extrude-demo`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      return await handleResponse<Generate3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the demo 3D extrusion service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 12: Generates 3D floor solids for a batch of building footprints.
   */
  async generate3DFloors(
    payload: BatchBuildingFloors3DRequest
  ): Promise<GenerateFloors3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/generate-floors-3d`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<GenerateFloors3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the 3D floor generation service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 12: Extrudes 3D floor solids for all preloaded demo buildings.
   */
  async extrudeDemoFloors(): Promise<GenerateFloors3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/buildings/extrude-demo-floors`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      return await handleResponse<GenerateFloors3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the demo 3D floor extrusion service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 12: Retrieves pre-configured synthetic demo property volume specifications.
   */
  async getDemoProperties(): Promise<PropertyVolumeRequest[]> {
    try {
      const response = await fetch(`${BASE_URL}/properties/demo-properties`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<PropertyVolumeRequest[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to retrieve demo property specifications.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 12: Generates 3D property volumes from parcel, building, and floor references.
   */
  async generate3DPropertyVolumes(
    payload: BatchPropertyVolumeRequest
  ): Promise<GeneratePropertyVolumeResponse> {
    try {
      const response = await fetch(`${BASE_URL}/properties/generate-volume-3d`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<GeneratePropertyVolumeResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the 3D property volume generation service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 12: Extrudes all preloaded demo property volumes.
   */
  async extrudeDemoProperties(): Promise<GeneratePropertyVolumeResponse> {
    try {
      const response = await fetch(`${BASE_URL}/properties/extrude-demo-properties`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      return await handleResponse<GeneratePropertyVolumeResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to connect to the demo 3D property extrusion service.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 13: Retrieves deterministic 3D ULPIN prototypes for all pre-defined demo properties.
   */
  async getDemoULPINs(): Promise<ULPINResult[]> {
    try {
      const response = await fetch(`${BASE_URL}/properties/demo-ulpins`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<ULPINResult[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to retrieve demo 3D ULPIN prototypes.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 13: Generates a deterministic 3D ULPIN prototype for a single property entity.
   */
  async generateULPIN(payload: ULPINRequest): Promise<ULPINResult> {
    try {
      const response = await fetch(`${BASE_URL}/properties/generate-ulpin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ULPINResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to generate 3D ULPIN prototype.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 13: Verifies a 3D ULPIN string against canonical property identity.
   */
  async verifyULPIN(payload: ULPINVerificationRequest): Promise<ULPINVerificationResult> {
    try {
      const response = await fetch(`${BASE_URL}/properties/verify-ulpin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ULPINVerificationResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "Unable to verify 3D ULPIN prototype.",
        0,
        "NETWORK_UNAVAILABLE"
      );
    }
  },

  /**
   * Step 16: Retrieves synthetic demo units (GeoJSON FeatureCollection).
   */
  async getDemoUnits(): Promise<UnitFeatureCollection> {
    try {
      const response = await fetch(`${BASE_URL}/units/demo`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<UnitFeatureCollection>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to fetch demo units.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 16: Validates a single unit entity against spatial rules.
   */
  async validateUnit(payload: {
    unit: Unit;
    parent_floor?: unknown;
    parent_building?: unknown;
    parent_parcel?: unknown;
    sibling_units?: Unit[];
  }): Promise<UnitValidationResult> {
    try {
      const response = await fetch(`${BASE_URL}/units/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<UnitValidationResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to validate unit.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 16: Validates a batch of units.
   */
  async validateUnitsBatch(payload: {
    units: Unit[];
    floors?: unknown[];
    buildings?: unknown[];
    parcels?: unknown[];
  }): Promise<UnitBatchValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/units/validate-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<UnitBatchValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to validate units batch.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 16: Retrieves units for a building.
   */
  async getUnitsByBuilding(buildingId: string): Promise<Unit[]> {
    try {
      const response = await fetch(`${BASE_URL}/units/building/${encodeURIComponent(buildingId)}`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<Unit[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to fetch units for building.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 16: Retrieves units for a floor.
   */
  async getUnitsByFloor(floorId: string): Promise<Unit[]> {
    try {
      const response = await fetch(`${BASE_URL}/units/floor/${encodeURIComponent(floorId)}`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<Unit[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to fetch units for floor.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 16: Retrieves a conceptual 3D property record for a unit.
   */
  async getUnitPropertyRecord(unitId: string): Promise<UnitPropertyRecord> {
    try {
      const response = await fetch(`${BASE_URL}/units/property-record/${encodeURIComponent(unitId)}`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<UnitPropertyRecord>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to fetch unit property record.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 17: Generates 3D solid meshes for a batch of units.
   */
  async generateUnits3D(payload: BatchUnit3DRequest): Promise<GenerateUnits3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/units/generate-3d`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<GenerateUnits3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to connect to the 3D unit generation service.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 17: Fetches pre-computed 3D solids for demo apartment units.
   */
  async getDemoUnits3D(): Promise<GenerateUnits3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/units/demo-3d`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<GenerateUnits3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch demo 3D units.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 18: Retrieves the unified multi-source fused spatial property context for the demo dataset.
   */
  async getDemoFusion(targetCrs: string = "EPSG:32643", parcelId?: string): Promise<PropertyContextResponse> {
    try {
      const url = new URL(`${BASE_URL}/fusion/demo`);
      url.searchParams.set("target_crs", targetCrs);
      if (parcelId) url.searchParams.set("parcel_id", parcelId);
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<PropertyContextResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to load demo spatial fusion context.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 18: Normalizes real OSM building footprints into target project CRS and reports fusion status.
   */
  async getRealOsmFusion(targetCrs: string = "EPSG:32643", maxBuildings: number = 15): Promise<PropertyContextResponse> {
    try {
      const url = new URL(`${BASE_URL}/fusion/real-osm`);
      url.searchParams.set("target_crs", targetCrs);
      url.searchParams.set("max_buildings", String(maxBuildings));
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<PropertyContextResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to normalize real OSM building data.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 18: Validates multi-source dataset metadata and CRS compatibility.
   */
  async validateFusion(payload: FusionValidateRequest): Promise<FusionValidateResponse> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<FusionValidateResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to validate spatial fusion datasets.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 18: Normalizes GeoJSON features to target project CRS while preserving source geometry.
   */
  async normalizeFeatures(payload: FusionNormalizeRequest): Promise<FusionNormalizeResponse> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/normalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<FusionNormalizeResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to normalize spatial features.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 18: Generates a unified multi-source fused property context.
   */
  async getPropertyContext(payload: PropertyContextRequest): Promise<PropertyContextResponse> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/property-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await handleResponse<PropertyContextResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to assemble spatial property context.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  // =========================================================================
  // Step 19: AI/ML Extraction Subsystem API Methods
  // =========================================================================

  /**
   * Step 19: Retrieves the registered extraction models, tasks, and availability.
   */
  async listAiModels(): Promise<ModelRegistryResponse> {
    try {
      const response = await fetch(`${BASE_URL}/ai/models`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<ModelRegistryResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch AI model registry.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Extracts candidate building footprints from aerial/drone or DSM raster.
   */
  async extractBuildings(payload: {
    source_id?: string;
    model_id?: string;
    min_area_m2?: number;
    target_crs?: string;
    demo_mode?: boolean;
  }): Promise<ExtractionResult> {
    try {
      const response = await fetch(`${BASE_URL}/ai/extract/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ExtractionResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to extract building footprints.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Segments floor elevation strata intervals from observed height evidence.
   */
  async extractFloors(payload: {
    building_id: string;
    total_height_m: number;
    ground_elevation_m: number;
    standard_floor_height_m?: number;
    demo_mode?: boolean;
  }): Promise<ExtractionResult> {
    try {
      const response = await fetch(`${BASE_URL}/ai/extract/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ExtractionResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to segment floor strata.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Delineates candidate apartment units from floor boundaries.
   */
  async extractUnits(payload: {
    building_id: string;
    floor_number: number;
    floor_polygon?: Record<string, unknown> | null;
    corridor_width_m?: number;
    demo_mode?: boolean;
  }): Promise<ExtractionResult> {
    try {
      const response = await fetch(`${BASE_URL}/ai/extract/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ExtractionResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to delineate apartment units.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Extracts coordinated vertical elevation strata intervals.
   */
  async extractVertical(payload: {
    building_id: string;
    base_elevation_m: number;
    top_elevation_m: number;
    floor_count: number;
    demo_mode?: boolean;
  }): Promise<ExtractionResult> {
    try {
      const response = await fetch(`${BASE_URL}/ai/extract/vertical`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ExtractionResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to delineate vertical bounds.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Deterministic candidate validation gate before 3D extrusion.
   */
  async validateAiCandidates(payload: CandidateValidationRequest): Promise<CandidateValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/ai/validate-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<CandidateValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to validate candidate features.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Compares an AI candidate against authoritative reference or OSM building.
   */
  async compareAiCandidate(payload: CandidateComparisonRequest): Promise<CandidateComparisonResponse> {
    try {
      const response = await fetch(`${BASE_URL}/ai/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<CandidateComparisonResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to compare spatial candidate with reference.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 19: Retrieves the reproducible demonstration candidate bundle for platform demonstration.
   */
  async getDemoAiExtraction(): Promise<DemoAiExtractionResponse> {
    try {
      const response = await fetch(`${BASE_URL}/ai/demo`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DemoAiExtractionResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch demo AI extraction bundle.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Retrieves the synthetic demo underground bundle.
   */
  async getUndergroundDemo(): Promise<DemoUndergroundResponse> {
    try {
      const response = await fetch(`${BASE_URL}/underground/demo`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DemoUndergroundResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch demo underground bundle.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Retrieves a specific underground feature by ID.
   */
  async getUndergroundFeature(featureId: string): Promise<UndergroundFeature> {
    try {
      const response = await fetch(`${BASE_URL}/underground/${encodeURIComponent(featureId)}`, {
        headers: { Accept: "application/json" },
      });
      return await handleResponse<UndergroundFeature>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(`Unable to fetch underground feature ${featureId}.`, 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Validates underground feature geometry and depth sanity.
   */
  async validateUndergroundFeature(
    payload: UndergroundValidationRequest
  ): Promise<UndergroundValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/underground/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<UndergroundValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to validate underground feature.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Generates a 3D solid Mesh3D for an underground feature.
   */
  async generateUnderground3D(
    payload: Underground3DRequest
  ): Promise<Underground3DResult> {
    try {
      const response = await fetch(`${BASE_URL}/underground/generate-3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<Underground3DResult>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to extrude underground 3D solid.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Batch generates 3D solids for multiple underground features.
   */
  async generateUnderground3DBatch(
    requests: Underground3DRequest[]
  ): Promise<GenerateUnderground3DResponse> {
    try {
      const response = await fetch(`${BASE_URL}/underground/generate-3d/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(requests),
      });
      return await handleResponse<GenerateUnderground3DResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to extrude underground 3D batch.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 20: Evaluates clashes and proximity conflicts between subsurface features.
   */
  async evaluateUndergroundConflicts(
    payload: UndergroundConflictRequest
  ): Promise<UndergroundConflictResponse> {
    try {
      const response = await fetch(`${BASE_URL}/underground/conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<UndergroundConflictResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to evaluate underground conflicts.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 22: Retrieves multi-tier demonstration scene with benchmark topology checks.
   */
  async getDemoTopology(scenario: string = "conflict"): Promise<DemoTopologyResponse> {
    try {
      const url = `${BASE_URL}/topology/demo?scenario=${encodeURIComponent(scenario)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DemoTopologyResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to retrieve demo topology scene.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 22: Executes comprehensive topological and spatial conflict audit across cadastral tiers.
   */
  async validateTopology(
    payload: TopologyValidationRequest
  ): Promise<TopologyValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/topology/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<TopologyValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to validate spatial topology.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 23: Retrieves real multi-source end-to-end integration pipeline validation report.
   */
  /**
   * Part B: Retrieves validated reference control network (GNSS & CORS stations).
   */
  async getControlPoints(targetCrs: string = "EPSG:32643"): Promise<ControlPointValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/control-points?target_crs=${encodeURIComponent(targetCrs)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<ControlPointValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to retrieve reference control points.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Part B: Validates and reprojects uploaded field survey control points.
   */
  async validateControlPoints(payload: ControlPointValidationRequest): Promise<ControlPointValidationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/control-points/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<ControlPointValidationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to validate survey control points.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Part G: Retrieves canonical demonstration property record (P001 -> B01 -> F05 -> U501).
   */
  async getCanonicalDemoPropertyRecord(): Promise<UnitPropertyRecord> {
    try {
      const response = await fetch(`${BASE_URL}/units/canonical-demo`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<UnitPropertyRecord>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to retrieve canonical demo property record.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getRealDataPipelineResult(runFresh: boolean = false): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${BASE_URL}/fusion/real-pipeline?run_fresh=${runFresh}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<Record<string, unknown>>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to retrieve real data pipeline result.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * DataMeet Maps Integration Methods
   */
  async getDatameetMetadata(): Promise<DataMeetMetadataResponse> {
    try {
      const response = await fetch(`${BASE_URL}/datameet/metadata`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DataMeetMetadataResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch DataMeet metadata.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getDatameetLayers(): Promise<DataMeetLayerInfo[]> {
    try {
      const response = await fetch(`${BASE_URL}/datameet/layers`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<DataMeetLayerInfo[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to fetch DataMeet administrative layers.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getDatameetLayerGeoJSON(layerId: string): Promise<GeoJSONFeatureCollection> {
    try {
      const response = await fetch(`${BASE_URL}/datameet/layers/${encodeURIComponent(layerId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<GeoJSONFeatureCollection>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(`Unable to fetch DataMeet GeoJSON for layer '${layerId}'.`, 0, "NETWORK_UNAVAILABLE");
    }
  },

  async alignDatameetWithOsm(layerId: string, aoiName?: string, workingCrs: string = "EPSG:32643"): Promise<DataMeetAlignmentResponse> {
    try {
      const response = await fetch(`${BASE_URL}/datameet/align-osm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          layer_id: layerId,
          aoi_name: aoiName,
          working_crs: workingCrs,
        }),
      });
      return await handleResponse<DataMeetAlignmentResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Unable to align DataMeet boundary with OSM building dataset.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Floor Plan / Blueprint Association Methods
   */
  async uploadFloorPlan(
    datasetId: string,
    buildingId: string,
    floorId: string,
    file: File
  ): Promise<FloorPlanAssociation> {
    try {
      const formData = new FormData();
      formData.append("dataset_id", datasetId);
      formData.append("building_id", buildingId);
      formData.append("floor_id", floorId);
      formData.append("file", file);

      const response = await fetch(`${BASE_URL}/floor-plans/upload`, {
        method: "POST",
        body: formData,
      });
      return await handleResponse<FloorPlanAssociation>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to upload and attach floor plan document.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getFloorPlan(
    datasetId: string,
    buildingId: string,
    floorId: string
  ): Promise<FloorPlanAssociation | null> {
    try {
      const response = await fetch(
        `${BASE_URL}/floor-plans/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(floorId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (response.status === 404) return null;
      return await handleResponse<FloorPlanAssociation>(response);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) return null;
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to retrieve floor plan association.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getDatasetFloorPlans(datasetId: string): Promise<FloorPlanListResponse> {
    try {
      const response = await fetch(
        `${BASE_URL}/floor-plans/${encodeURIComponent(datasetId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<FloorPlanListResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(`Failed to fetch floor plans for dataset '${datasetId}'.`, 0, "NETWORK_UNAVAILABLE");
    }
  },

  async deleteFloorPlan(
    datasetId: string,
    buildingId: string,
    floorId: string
  ): Promise<FloorPlanDeleteResponse> {
    try {
      const response = await fetch(
        `${BASE_URL}/floor-plans/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(floorId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<FloorPlanDeleteResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to remove floor plan association.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  getFloorPlanViewUrl(datasetId: string, buildingId: string, floorId: string): string {
    return `${BASE_URL}/floor-plans/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(floorId)}/view`;
  },

  // =========================================================================
  // STEP 4: 3D Unit Management
  // =========================================================================
  async createUnit(payload: import("@/types/cadastre").UnitCreateRequest): Promise<import("@/types/cadastre").Unit> {
    try {
      const response = await fetch(`${BASE_URL}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return await handleResponse<import("@/types/cadastre").Unit>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to create unit.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getFloorUnits(
    datasetId: string,
    buildingId: string,
    floorId: string
  ): Promise<import("@/types/cadastre").Unit[]> {
    try {
      const response = await fetch(
        `${BASE_URL}/units/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(floorId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<import("@/types/cadastre").Unit[]>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(`Failed to fetch units for floor '${floorId}'.`, 0, "NETWORK_UNAVAILABLE");
    }
  },

  async getDatasetUnits(
    datasetId: string,
    buildingId?: string,
    floorId?: string
  ): Promise<import("@/types/cadastre").UnitListResponse> {
    try {
      const query = new URLSearchParams();
      if (buildingId) query.set("building_id", buildingId);
      if (floorId) query.set("floor_id", floorId);
      const qs = query.toString() ? `?${query.toString()}` : "";

      const response = await fetch(
        `${BASE_URL}/units/${encodeURIComponent(datasetId)}${qs}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<import("@/types/cadastre").UnitListResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(`Failed to fetch units for dataset '${datasetId}'.`, 0, "NETWORK_UNAVAILABLE");
    }
  },

  async deleteUnit(
    datasetId: string,
    buildingId: string,
    floorId: string,
    unitId: string
  ): Promise<import("@/types/cadastre").UnitDeleteResponse> {
    try {
      const response = await fetch(
        `${BASE_URL}/units/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(floorId)}/${encodeURIComponent(unitId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<import("@/types/cadastre").UnitDeleteResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to delete unit.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Evaluates spatial and elevation containment (e.g. Building contains Floor, Floor contains Unit).
   */
  async analyzeContainment(req: ContainmentRequest): Promise<ContainmentResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial-analysis/containment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<ContainmentResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to execute containment analysis.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Evaluates 3D spatial intersection and positive-area overlap in square meters.
   */
  async analyzeIntersection(req: IntersectionRequest): Promise<IntersectionResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial-analysis/intersection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<IntersectionResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to execute intersection analysis.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Calculates metric 3D Euclidean, 2D planar, and Z vertical proximity distances in meters.
   */
  async analyzeProximity(req: ProximityRequest): Promise<ProximityResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial-analysis/proximity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<ProximityResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to execute proximity analysis.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Classifies vertical relationship (SAME_LEVEL, ABOVE, BELOW, OVERLAPPING_Z_RANGE, DISJOINT_Z_RANGE).
   */
  async analyzeVerticalRelationship(req: VerticalRelationshipRequest): Promise<VerticalRelationshipResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial-analysis/vertical`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<VerticalRelationshipResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to execute vertical relationship analysis.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Measures 3D dimensions, footprint area, and volume for a selected object.
   */
  async getDimensions(req: DimensionsRequest): Promise<DimensionsResponse> {
    try {
      const response = await fetch(`${BASE_URL}/measurements/dimensions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<DimensionsResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to measure dimensions.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Measures metric horizontal, vertical, and 3D Euclidean distance between two spatial objects.
   */
  async getDistance(req: DistanceRequest): Promise<DistanceResponse> {
    try {
      const response = await fetch(`${BASE_URL}/measurements/distance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<DistanceResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to measure distance.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Evaluates Data Quality Status and Cadastral Provenance for a building, floor, or unit.
   */
  async evaluateQuality(req: QualityEvaluationRequest): Promise<QualityEvaluationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/quality/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<QualityEvaluationResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to evaluate data quality.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Lists all registered spatial and reference sources for a dataset.
   */
  async listSources(datasetId: string): Promise<SourceListResponse> {
    try {
      const response = await fetch(`${BASE_URL}/sources/${encodeURIComponent(datasetId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return await handleResponse<SourceListResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to list spatial sources.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Gets detailed metadata and provenance for a single spatial source.
   */
  async getSource(datasetId: string, sourceId: string): Promise<SpatialSource> {
    try {
      const response = await fetch(
        `${BASE_URL}/sources/${encodeURIComponent(datasetId)}/${encodeURIComponent(sourceId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<SpatialSource>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to get spatial source details.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Registers a new spatial reference source or layer associated with a dataset.
   */
  async registerSource(data: SourceRegisterRequest): Promise<SpatialSource> {
    try {
      const response = await fetch(`${BASE_URL}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      return await handleResponse<SpatialSource>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to register spatial source.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Deletes a registered spatial source and its associated reference features.
   */
  async deleteSource(datasetId: string, sourceId: string): Promise<SourceDeleteResponse> {
    try {
      const response = await fetch(
        `${BASE_URL}/sources/${encodeURIComponent(datasetId)}/${encodeURIComponent(sourceId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<SourceDeleteResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to delete spatial source.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Retrieves the GeoJSON FeatureCollection for a registered reference source.
   */
  async getSourceFeatures(datasetId: string, sourceId: string): Promise<GeoJSONFeatureCollection> {
    try {
      const response = await fetch(
        `${BASE_URL}/sources/${encodeURIComponent(datasetId)}/${encodeURIComponent(sourceId)}/features`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      return await handleResponse<GeoJSONFeatureCollection>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to retrieve source features.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 9: Attaches or updates reference GeoJSON features for an existing registered spatial source.
   */
  async attachSourceFeatures(
    datasetId: string,
    sourceId: string,
    data: SourceFeaturesRequest
  ): Promise<SpatialSource> {
    try {
      const response = await fetch(
        `${BASE_URL}/sources/${encodeURIComponent(datasetId)}/${encodeURIComponent(sourceId)}/features`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        }
      );
      return await handleResponse<SpatialSource>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Failed to attach source features.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 10: Executes a combined multi-relationship 3D spatial query between two objects.
   */
  async querySpatial(req: CombinedSpatialQueryRequest): Promise<CombinedSpatialQueryResponse> {
    try {
      const response = await fetch(`${BASE_URL}/spatial-analysis/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<CombinedSpatialQueryResponse>(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Combined spatial query failed.", 0, "NETWORK_UNAVAILABLE");
    }
  },

  /**
   * Step 12: Generates a comprehensive building property report.
   */
  async getBuildingReport(datasetId: string, buildingId: string): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${BASE_URL}/reports/${encodeURIComponent(datasetId)}/building/${encodeURIComponent(buildingId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Step 12: Generates a comprehensive floor property report.
   */
  async getFloorReport(datasetId: string, floorId: string): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${BASE_URL}/reports/${encodeURIComponent(datasetId)}/floor/${encodeURIComponent(floorId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Step 12: Generates a comprehensive unit property report.
   */
  async getUnitReport(datasetId: string, unitId: string): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${BASE_URL}/reports/${encodeURIComponent(datasetId)}/unit/${encodeURIComponent(unitId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Step 16: Launches the STHARA Real-World Demonstration System.
   */
  async launchDemo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${BASE_URL}/demo/launch`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Step 16: Gets the Hero Demo Property landing state.
   */
  async getDemoLandingState(): Promise<Record<string, unknown>> {
    const response = await fetch(`${BASE_URL}/demo/landing-state`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Step 16: Resets demo dataset to baseline state.
   */
  async resetDemo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${BASE_URL}/demo/reset`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<Record<string, unknown>>(response);
  },

  /**
   * Building Blueprint API methods (Building-level blueprint attachments)
   */
  getBuildingBlueprintViewUrl(datasetId: string, buildingId: string): string {
    return `${BASE_URL}/building-blueprints/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}/view`;
  },

  async uploadBuildingBlueprint(
    datasetId: string,
    buildingId: string,
    file: File
  ): Promise<BuildingBlueprintResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dataset_id", datasetId);
    formData.append("building_id", buildingId);

    const response = await fetch(`${BASE_URL}/building-blueprints/upload`, {
      method: "POST",
      body: formData,
    });
    return await handleResponse<BuildingBlueprintResponse>(response);
  },

  async getBuildingBlueprint(
    datasetId: string,
    buildingId: string
  ): Promise<BuildingBlueprintResponse> {
    const response = await fetch(
      `${BASE_URL}/building-blueprints/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}`,
      { headers: { Accept: "application/json" } }
    );
    if (response.status === 404) {
      return {
        success: true,
        attached: false,
        blueprint: null,
        message: `No building blueprint attached for building '${buildingId}'.`
      };
    }
    return await handleResponse<BuildingBlueprintResponse>(response);
  },

  async deleteBuildingBlueprint(
    datasetId: string,
    buildingId: string
  ): Promise<BuildingBlueprintResponse> {
    const response = await fetch(
      `${BASE_URL}/building-blueprints/${encodeURIComponent(datasetId)}/${encodeURIComponent(buildingId)}`,
      { method: "DELETE", headers: { Accept: "application/json" } }
    );
    return await handleResponse<BuildingBlueprintResponse>(response);
  },

  // --- DRAWING INTELLIGENCE V1 API ---

  async uploadDrawingSet(
    files: File[],
    datasetId: string
  ): Promise<DrawingAnalysis> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("dataset_id", datasetId);

    const response = await fetch(`${BASE_URL}/drawing-intelligence/upload`, {
      method: "POST",
      body: formData,
    });
    return await handleResponse<DrawingAnalysis>(response);
  },

  async loadGoldenDemoDrawings(datasetId: string): Promise<DrawingAnalysis> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/load-demo?dataset_id=${encodeURIComponent(datasetId)}`,
      { method: "POST", headers: { Accept: "application/json" } }
    );
    return await handleResponse<DrawingAnalysis>(response);
  },

  async getLatestDrawingAnalysis(datasetId: string): Promise<DrawingAnalysis | null> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/latest?dataset_id=${encodeURIComponent(datasetId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<DrawingAnalysis | null>(response);
  },

  async getDrawingAnalysis(analysisId: string): Promise<DrawingAnalysis> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<DrawingAnalysis>(response);
  },

  getDrawingPageImageUrl(analysisId: string, pageId: string, type: "original" | "processed" = "original"): string {
    return `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}/pages/${encodeURIComponent(pageId)}/image?type=${type}`;
  },

  async confirmDrawingCandidate(analysisId: string, candidateId: string): Promise<DrawingCandidate> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}/candidates/${encodeURIComponent(candidateId)}/confirm`,
      { method: "POST", headers: { Accept: "application/json" } }
    );
    return await handleResponse<DrawingCandidate>(response);
  },

  async rejectDrawingCandidate(analysisId: string, candidateId: string): Promise<DrawingCandidate> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}/candidates/${encodeURIComponent(candidateId)}/reject`,
      { method: "POST", headers: { Accept: "application/json" } }
    );
    return await handleResponse<DrawingCandidate>(response);
  },

  async patchDrawingCandidate(
    analysisId: string,
    candidateId: string,
    update: Partial<DrawingCandidate>
  ): Promise<DrawingCandidate> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}/candidates/${encodeURIComponent(candidateId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(update),
      }
    );
    return await handleResponse<DrawingCandidate>(response);
  },

  async getSpatialSourceStatus(datasetId: string): Promise<SpatialSourceStatus> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/source-status?dataset_id=${encodeURIComponent(datasetId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<SpatialSourceStatus>(response);
  },

  async buildStharaModelFromDrawing(
    analysisId: string,
    payload: BuildModelRequest
  ): Promise<BuildModelResponse> {
    const response = await fetch(
      `${BASE_URL}/drawing-intelligence/${encodeURIComponent(analysisId)}/build-model`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return await handleResponse<BuildModelResponse>(response);
  },

  async uploadAndAnalyzeProjectData(
    datasetId: string,
    files: File[],
    datasetName?: string
  ): Promise<UnifiedProjectDataAnalysis> {
    const formData = new FormData();
    formData.append("dataset_id", datasetId);
    if (datasetName) formData.append("dataset_name", datasetName);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${BASE_URL}/project-data/analyze`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    return await handleResponse<UnifiedProjectDataAnalysis>(response);
  },

  async loadGoldenDemoProjectData(
    datasetId: string = "ds_tagore_garden_map_osm",
    datasetName: string = "Tagore Garden Unified Project"
  ): Promise<UnifiedProjectDataAnalysis> {
    const response = await fetch(
      `${BASE_URL}/project-data/load-golden-demo?dataset_id=${encodeURIComponent(datasetId)}&dataset_name=${encodeURIComponent(datasetName)}`,
      { method: "POST", headers: { Accept: "application/json" } }
    );
    return await handleResponse<UnifiedProjectDataAnalysis>(response);
  },

  async getLatestProjectDataAnalysis(
    datasetId: string
  ): Promise<UnifiedProjectDataAnalysis | null> {
    const response = await fetch(
      `${BASE_URL}/project-data/latest?dataset_id=${encodeURIComponent(datasetId)}`,
      { headers: { Accept: "application/json" } }
    );
    return await handleResponse<UnifiedProjectDataAnalysis | null>(response);
  },

  async updateBuildingCorrelation(
    analysisId: string,
    correlationId: string,
    update: BuildingCorrelationUpdateRequest
  ): Promise<BuildingCorrelationMatch> {
    const response = await fetch(
      `${BASE_URL}/project-data/${encodeURIComponent(analysisId)}/correlations/${encodeURIComponent(correlationId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(update),
      }
    );
    return await handleResponse<BuildingCorrelationMatch>(response);
  },
};

export interface BuildingBlueprintRecord {
  building_blueprint_id: string;
  dataset_id: string;
  building_id: string;
  filename: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  view_url: string;
  uploaded_at: string;
  source: string;
  status: string;
}

export interface BuildingBlueprintResponse {
  success: boolean;
  attached?: boolean;
  blueprint?: BuildingBlueprintRecord | null;
  message: string;
}

// --- DRAWING INTELLIGENCE V1 EXPORTS ---

export type {
  DrawingType,
  CandidateType,
  CandidateStatus,
  ConfidenceLevel,
  DocumentRole,
  SpatialSourceMode,
  SpatialSourceStatus,
  GeographicPositioning,
  NormalizedBBox,
  DrawingEvidence,
  DrawingRegion,
  DrawingCandidate,
  DrawingPage,
  DrawingDocument,
  DrawingAnalysisSummary,
  DrawingAnalysis,
  DrawingCandidateUpdate,
  BuildModelRequest,
  BuildModelResponse,
  BuildModelResult,
} from "@/types/drawing_intelligence";

export type {
  ProjectSourceCategory,
  ProjectFileManifestItem,
  BuildingCorrelationMatch,
  SpatialEvidenceSummary,
  ProcessingStage,
  UnifiedProjectDataAnalysis,
  BuildingCorrelationUpdateRequest,
} from "@/types/project_data";





