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
} from "@/types/cadastre";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

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
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData.error_code || "HTTP_ERROR",
        errorData.data?.validation
      );
    }

    if (response.status === 404) {
      throw new ApiError("Requested cadastral resource was not found.", 404, "NOT_FOUND");
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
   * Loads the real OpenStreetMap building footprints dataset.
   */
  async getRealOSMBuildings(): Promise<{ dataset_id: string; raw_geojson: GeoJSONFeatureCollection; is_cadastral: boolean }> {
    const res = await this.getDataset("real_osm_buildings");
    return { ...res, is_cadastral: false };
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
   * Step 19: Retrieves the reproducible demonstration candidate bundle for SIH presentations.
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
   * Part G: Retrieves canonical SIH demonstration property record (P001 -> B01 -> F05 -> U501).
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
};



