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
} from "@/types/cadastre";
import { cadastreApi, ApiError } from "@/lib/api/client";

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
  const [activeDatasetName, setActiveDatasetName] = useState<string | null>(null);

  // Buildings & Spatial Association State
  const [buildingsGeojson, setBuildingsGeojson] = useState<GeoJSONFeatureCollection | null>(null);
  const [buildingDatasetName, setBuildingDatasetName] = useState<string | null>(null);
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

  const [subView3D, setSubView3D] = useState<"building" | "floors" | "property">("building");
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [explodeDistance, setExplodeDistance] = useState<number>(0);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [isolatedFloorIndex, setIsolatedFloorIndex] = useState<number | null>(null);

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState<{ parcels: boolean; buildings: boolean }>({
    parcels: true,
    buildings: true,
  });

  const toggleLayer = useCallback((layer: "parcels" | "buildings") => {
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

    return () => {
      mounted = false;
    };
  }, []);

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
  const loadRealOSMBuildings = useCallback(async () => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const data = await cadastreApi.getRealOSMBuildings();
      setBuildingsGeojson(data.raw_geojson);
      setBuildingDatasetName("osm_buildings.geojson (Real OSM - Delhi)");
      if (data.raw_geojson.features.length > 0) {
        const firstBld = data.raw_geojson.features[0];
        const bId = (firstBld.properties?.building_id as string) || (firstBld.id ? String(firstBld.id) : null);
        if (bId) setSelectedBuildingId(bId);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("Unable to load real OSM building dataset.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2b. Load Demo Buildings from FastAPI Backend
  const loadDemoBuildings = useCallback(async () => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const data = await cadastreApi.getDemoBuildings();
      setBuildingsGeojson(data.raw_geojson);
      setBuildingDatasetName("demo_buildings.geojson");
      // Auto-select first building if available
      if (data.raw_geojson.features.length > 0) {
        const firstBld = data.raw_geojson.features[0];
        const bId = (firstBld.properties?.building_id as string) || (firstBld.id ? String(firstBld.id) : null);
        if (bId) setSelectedBuildingId(bId);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("Unable to connect to the geospatial processing service.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        // Calculate rough centroid from first coordinate ring
        const coords = b.geometry?.coordinates;
        let cLon = 73.856, cLat = 18.52;
        if (Array.isArray(coords) && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          const ring = coords[0] as [number, number][];
          cLon = ring.reduce((acc, pt) => acc + pt[0], 0) / ring.length;
          cLat = ring.reduce((acc, pt) => acc + pt[1], 0) / ring.length;
        }
        points.push({
          feature_id: bId,
          longitude: cLon,
          latitude: cLat,
          crs: "EPSG:4326",
        });
      });
    }

    if (points.length === 0) return;

    setIsSamplingElevation(true);
    setElevationError(null);

    try {
      const resp = await cadastreApi.sampleElevation({ points });
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
        const meta = await cadastreApi.getDEMInfo();
        setDemMetadata(meta);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setElevationError(err.message);
      } else {
        setElevationError("Unable to connect to the geospatial processing service.");
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
    setUlpinError(null);
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
      if (points.length > 0) {
        const elevResp = await cadastreApi.sampleElevation({ points });
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

      // Auto-select primary demo parcel, building, and property volume
      setSelectedParcelId("PARCEL-DEMO-101");
      setSelectedBuildingId("BLD-DEMO-001");
      setSelectedPropertyId("PROP-DEMO-101-U01");

      // Switch to 3D Property View
      setViewMode("3d");
      setSubView3D("property");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Error executing demo pipeline.";
      setGeneralError(msg);
    } finally {
      setIsDemoRunning(false);
    }
  }, [demoSpecs]);

  // Compute dynamic PipelineStep list reflecting authoritative real-time state
  const pipelineSteps: import("@/components/cadastral/PipelineStatus").PipelineStep[] = useMemo(() => {
    const hasParcels = !!geojson && geojson.features.length > 0;
    const hasBuildings = !!buildingsGeojson && buildingsGeojson.features.length > 0;

    // Step 1: Data Sources
    let s1Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s1Detail = "";
    if (isLoading && !hasParcels) s1Status = "PROCESSING";
    else if (hasParcels && hasBuildings) {
      s1Status = "COMPLETE";
      s1Detail = `${geojson.features.length}P / ${buildingsGeojson.features.length}B`;
    } else if (hasParcels || hasBuildings) {
      s1Status = "WARNING";
      s1Detail = hasParcels ? "Parcels only" : "Buildings only";
    }

    // Step 2: Parcel Validation
    let s2Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s2Detail = "";
    if (isValidating) s2Status = "PROCESSING";
    else if (validationResult) {
      if (validationResult.valid) {
        s2Status = "COMPLETE";
        s2Detail = `${validationResult.feature_count} Valid`;
      } else {
        s2Status = "ERROR";
        s2Detail = `${validationResult.errors.length} Errors`;
      }
    }

    // Step 3: Spatial Mapping
    let s3Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s3Detail = "";
    if (isAssociating) s3Status = "PROCESSING";
    else if (associationData) {
      s3Status = "COMPLETE";
      s3Detail = `${associationData.summary.associated_buildings} Mapped`;
    }

    // Step 4: DEM Elevation
    let s4Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s4Detail = "";
    if (isSamplingElevation) s4Status = "PROCESSING";
    else if (Object.keys(elevationResults).length > 0) {
      s4Status = "COMPLETE";
      s4Detail = `${Object.keys(elevationResults).length} Sampled`;
    }

    // Step 5: 3D Geometry
    let s5Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s5Detail = "";
    if (isGenerating3D) s5Status = "PROCESSING";
    else if (building3DData) {
      s5Status = building3DData.summary.successful > 0 ? "COMPLETE" : "ERROR";
      s5Detail = `${building3DData.summary.successful} Solids`;
    }

    // Step 6: Stratified Floors
    let s6Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s6Detail = "";
    if (isGeneratingFloors3D) s6Status = "PROCESSING";
    else if (floors3DData) {
      s6Status = floors3DData.summary.successful > 0 ? "COMPLETE" : "ERROR";
      s6Detail = `${floors3DData.summary.successful} Buildings`;
    }

    // Step 7: Property Volumes
    let s7Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s7Detail = "";
    if (isGeneratingProperty3D) s7Status = "PROCESSING";
    else if (property3DData) {
      s7Status = property3DData.summary.successful > 0 ? "COMPLETE" : "ERROR";
      s7Detail = `${property3DData.summary.successful} Units`;
    }

    // Step 8: 3D ULPIN
    let s8Status: import("@/components/cadastral/PipelineStatus").PipelineStepStatus = "NOT_STARTED";
    let s8Detail = "";
    if (isGeneratingULPIN) s8Status = "PROCESSING";
    else if (Object.keys(ulpins3D).length > 0) {
      const validCount = Object.values(ulpins3D).filter((u) => u.identifier_status === "VALID").length;
      s8Status = validCount > 0 ? "COMPLETE" : "WARNING";
      s8Detail = `${validCount} Verified`;
    }

    return [
      {
        id: "data-sources",
        stepNumber: "01",
        title: "Data Sources",
        description: "Ingest vector cadastral boundaries and building footprints.",
        provenance: "Cadastral GeoJSON",
        status: s1Status,
        detail: s1Detail,
      },
      {
        id: "validation",
        stepNumber: "02",
        title: "Parcel Validation",
        description: "Verify topological integrity, self-intersections, and CRS.",
        provenance: "GEOS / Shapely",
        status: s2Status,
        detail: s2Detail,
      },
      {
        id: "mapping",
        stepNumber: "03",
        title: "Building Mapping",
        description: "Spatial containment and intersection between parcel and footprint.",
        provenance: "Spatial Intersect",
        status: s3Status,
        detail: s3Detail,
      },
      {
        id: "elevation",
        stepNumber: "04",
        title: "DEM Elevation",
        description: "Sample orthometric ground elevation from high-res DEM raster.",
        provenance: "Copernicus DEM",
        status: s4Status,
        detail: s4Detail,
      },
      {
        id: "building-3d",
        stepNumber: "05",
        title: "3D Geometry",
        description: "Watertight polyhedral extrusion of building envelopes.",
        provenance: "Mesh3D v1.0",
        status: s5Status,
        detail: s5Detail,
      },
      {
        id: "floors-3d",
        stepNumber: "06",
        title: "Stratified Floors",
        description: "Discrete vertical floor solids with metric slab elevations.",
        provenance: "Stratified Solids",
        status: s6Status,
        detail: s6Detail,
      },
      {
        id: "properties-3d",
        stepNumber: "07",
        title: "Property Volume",
        description: "Cadastral property rights envelope bound to verified floor units.",
        provenance: "Property Volume",
        status: s7Status,
        detail: s7Detail,
      },
      {
        id: "ulpin-3d",
        stepNumber: "08",
        title: "3D ULPIN",
        description: "Deterministic, cryptographically verifiable 3D spatial identifier.",
        provenance: "SHA-256 Prototype",
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
    isGenerating3D,
    building3DData,
    isGeneratingFloors3D,
    floors3DData,
    isGeneratingProperty3D,
    property3DData,
    isGeneratingULPIN,
    ulpins3D,
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
    activeDatasetName,
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
    generate3DBuildingModels,
    generate3DFloorModels,
    generate3DPropertyModels,
    ulpins3D,
    isGeneratingULPIN,
    ulpinError,
    fetchDemoULPINs,
    generateULPINForProperty,
    verifyULPIN,
    setSelectedParcelId,
    setSelectedBuildingId,
    isDemoRunning,
    runEndToEndDemo,
    resetDemo,
    pipelineSteps,
  };
}


