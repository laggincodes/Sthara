import { getApprovedExtrusionHeight } from "@/lib/footprint3d";
import { trpc } from "@/lib/trpc";
import {
  matchesMapEvidenceFilter,
  type MapEvidenceFilter,
} from "@shared/evidenceMapFilter";
import type {
  Cartesian2 as CesiumCartesian2,
  Entity as CesiumEntity,
  GeoJsonDataSource as CesiumGeoJsonDataSource,
  Viewer as CesiumViewer,
} from "cesium";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MapCommand = {
  kind:
    | "zoom-in"
    | "zoom-out"
    | "north"
    | "fullscreen"
    | "inspect-footprint"
    | "focus-site"
    | "focus-authority-reference"
    | "focus-synthetic-demo";
  nonce: number;
} | null;
export type CesiumLayerFlags = {
  parcels: boolean;
  buildings: boolean;
  utilities: boolean;
  terrain: boolean;
};
export type SyntheticVisualLayers = {
  simulatedDroneImagery: boolean;
  simulatedLidarPointCloud: boolean;
};

function featureLayer(
  properties: Record<string, unknown>
): keyof CesiumLayerFlags {
  const raw =
    typeof properties.layer === "string" ? properties.layer.toLowerCase() : "";
  if (raw.includes("building")) return "buildings";
  if (raw.includes("utility")) return "utilities";
  if (raw.includes("terrain")) return "terrain";
  return "parcels";
}

export function CesiumSpatialViewer({
  command,
  layers,
  evidenceFilter = "all",
  authorityReference,
  syntheticDemoFeature,
  syntheticDemoView = "3d",
  syntheticVisualLayers = {
    simulatedDroneImagery: false,
    simulatedLidarPointCloud: false,
  },
  onSyntheticDemoSelect,
  focusUlpins,
  onFeatureSelect,
}: {
  command: MapCommand;
  layers: CesiumLayerFlags;
  evidenceFilter?: MapEvidenceFilter;
  authorityReference?: {
    latitude: number;
    longitude: number;
    label: string;
    detail: string;
  };
  syntheticDemoFeature?: {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Polygon"; coordinates: number[][][] };
  };
  syntheticDemoView?: "2d" | "3d";
  syntheticVisualLayers?: SyntheticVisualLayers;
  onSyntheticDemoSelect?: () => void;
  focusUlpins?: string[];
  onFeatureSelect?: (feature: {
    ulpin: string;
    properties: Record<string, unknown>;
  }) => void;
}) {
  const cesiumRuntime = (
    window as Window & { Cesium?: typeof import("cesium") }
  ).Cesium;
  if (!cesiumRuntime) {
    return (
      <div
        className="cesium-spatial-viewer cesium-runtime-fallback"
        role="alert"
      >
        <AlertTriangle size={20} />
        <b>3D map runtime is unavailable</b>
        <span>
          The Cesium runtime did not load. Check your connection, then reload
          the page.
        </span>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Reload 3D map
        </button>
      </div>
    );
  }
  const {
    Cartesian2,
    Cartesian3,
    Color,
    ColorMaterialProperty,
    ConstantProperty,
    defined,
    EllipsoidTerrainProvider,
    Entity,
    GeoJsonDataSource,
    HeadingPitchRange,
    Ion,
    LabelGraphics,
    PointGraphics,
    PolygonGraphics,
    PolygonHierarchy,
    ScreenSpaceEventType,
    Viewer,
  } = cesiumRuntime;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const dataSourceRef = useRef<CesiumGeoJsonDataSource | null>(null);
  const osmBuildingsRef = useRef<{
    show: boolean;
    destroy?: () => void;
  } | null>(null);
  const imageryLayerRef = useRef<{ show: boolean } | null>(null);
  const authorityMarkerRef = useRef<CesiumEntity | null>(null);
  const syntheticDemoDataSourceRef = useRef<CesiumGeoJsonDataSource | null>(
    null
  );
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerState, setViewerState] = useState<
    "initializing" | "ready" | "error"
  >("initializing");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerRetryKey, setViewerRetryKey] = useState(0);
  const [syntheticHover, setSyntheticHover] = useState(false);
  const [imageryState, setImageryState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const osmBuildingsEnabled = Boolean(
    import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN
  );
  const geometryQuery = trpc.postgis.geojson.useQuery(undefined, {
    refetchInterval: 20_000,
    retry: 1,
  });
  const retryViewer = () => {
    viewerRef.current?.destroy();
    viewerRef.current = null;
    setViewerReady(false);
    setViewerError(null);
    setViewerState("initializing");
    setViewerRetryKey(current => current + 1);
  };

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    let viewer: CesiumViewer | null = null;
    try {
      Ion.defaultAccessToken =
        import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || "";
      viewer = new Viewer(containerRef.current, {
        animation: false,
        baseLayer: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        terrainProvider: new EllipsoidTerrainProvider(),
        shouldAnimate: false,
      });
    } catch (error) {
      console.error("[Cesium] Failed to initialize the 3D viewer", error);
      setViewerError("The 3D scene could not start on this device.");
      setViewerState("error");
      return;
    }
    if (!viewer) return;
    viewer.scene.backgroundColor = Color.fromCssColorString("#081217");
    viewer.scene.globe.baseColor = Color.fromCssColorString("#162a2c");
    viewer.scene.globe.depthTestAgainstTerrain = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
    viewer.scene.skyBox = undefined;
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(77.6245, 12.9352, 2300),
    });
    let highlightedEntity: CesiumEntity | null = null;
    const restoreFootprintStyle = (entity: CesiumEntity | null) => {
      if (!entity?.polygon) return;
      const properties = (entity.properties?.getValue?.() ?? {}) as Record<
        string,
        unknown
      >;
      const extrusionHeight = getApprovedExtrusionHeight(properties);
      entity.polygon.material = new ColorMaterialProperty(
        (extrusionHeight
          ? Color.fromCssColorString("#55dcb4")
          : Color.fromCssColorString("#2ad4d9")
        ).withAlpha(extrusionHeight ? 0.62 : 0.34)
      );
      entity.polygon.outlineColor = new ConstantProperty(
        Color.fromCssColorString("#e9ffff")
      );
    };
    viewer.screenSpaceEventHandler.setInputAction(
      (movement: { position: CesiumCartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        const entity =
          defined(picked) && picked.id && typeof picked.id === "object"
            ? (picked.id as CesiumEntity)
            : undefined;
        const syntheticProperties = (entity?.properties?.getValue?.() ??
          {}) as Record<string, unknown>;
        if (entity && syntheticProperties.demoNonAuthoritative === true) {
          viewer.selectedEntity = entity;
          onSyntheticDemoSelect?.();
          void viewer.flyTo(entity, {
            duration: 0.35,
            offset: new HeadingPitchRange(0.52, -0.42, 96),
          });
          return;
        }
        const ulpin = entity?.properties?.ulpin?.getValue?.();
        if (!entity || typeof ulpin !== "string") return;
        const selectedEntity = entity;
        const properties = (selectedEntity.properties?.getValue?.() ??
          {}) as Record<string, unknown>;
        restoreFootprintStyle(highlightedEntity);
        if (selectedEntity.polygon) {
          selectedEntity.polygon.material = new ColorMaterialProperty(
            Color.fromCssColorString("#73fff1").withAlpha(0.78)
          );
          selectedEntity.polygon.outlineColor = new ConstantProperty(
            Color.fromCssColorString("#fff3b0")
          );
        }
        highlightedEntity = selectedEntity;
        viewer.selectedEntity = selectedEntity;
        void viewer.flyTo(selectedEntity, {
          duration: 0.45,
          offset: new HeadingPitchRange(0.32, -0.86, 180),
        });
        onFeatureSelect?.({ ulpin, properties });
      },
      ScreenSpaceEventType.LEFT_CLICK
    );
    viewer.screenSpaceEventHandler.setInputAction(
      (movement: { endPosition: CesiumCartesian2 }) => {
        const picked = viewer.scene.pick(movement.endPosition);
        const entity =
          defined(picked) && picked.id && typeof picked.id === "object"
            ? (picked.id as CesiumEntity)
            : undefined;
        const properties = (entity?.properties?.getValue?.() ?? {}) as Record<
          string,
          unknown
        >;
        setSyntheticHover(properties.demoNonAuthoritative === true);
      },
      ScreenSpaceEventType.MOUSE_MOVE
    );
    viewerRef.current = viewer;
    setViewerReady(true);
    setViewerState("ready");
    let cancelled = false;
    if (osmBuildingsEnabled) {
      void Promise.resolve(cesiumRuntime).then(
        async ({ createWorldImageryAsync }) => {
          if (cancelled || !viewerRef.current) return;
          try {
            const imageryProvider = await createWorldImageryAsync();
            if (cancelled || !viewerRef.current) return;
            const imageryLayer =
              viewer.imageryLayers.addImageryProvider(imageryProvider);
            imageryLayer.alpha = 0.9;
            imageryLayerRef.current = imageryLayer;
            setImageryState("ready");
            viewer.scene.requestRender();
          } catch (error) {
            setImageryState("unavailable");
            console.warn(
              "[Cesium] Optional World Imagery layer unavailable",
              error
            );
          }
        }
      );
    } else {
      setImageryState("unavailable");
    }
    if (osmBuildingsEnabled) {
      void Promise.resolve(cesiumRuntime).then(
        async ({ createOsmBuildingsAsync }) => {
          if (cancelled || !viewerRef.current) return;
          try {
            const osmBuildings = await createOsmBuildingsAsync();
            if (cancelled || !viewerRef.current) {
              osmBuildings.destroy?.();
              return;
            }
            osmBuildings.show = true;
            viewer.scene.primitives.add(osmBuildings);
            osmBuildingsRef.current = osmBuildings;
            viewer.scene.requestRender();
          } catch (error) {
            console.warn(
              "[Cesium] Optional OSM Buildings layer unavailable",
              error
            );
          }
        }
      );
    }
    return () => {
      cancelled = true;
      osmBuildingsRef.current = null;
      imageryLayerRef.current = null;
      viewer.destroy();
      viewerRef.current = null;
      setViewerReady(false);
    };
  }, [onFeatureSelect, osmBuildingsEnabled, viewerRetryKey]);

  useEffect(() => {
    const osmBuildings = osmBuildingsRef.current;
    if (!osmBuildings) return;
    osmBuildings.show = layers.buildings;
    viewerRef.current?.scene.requestRender();
  }, [layers.buildings]);

  useEffect(() => {
    const imageryLayer = imageryLayerRef.current;
    if (!imageryLayer) return;
    imageryLayer.show = layers.terrain;
    viewerRef.current?.scene.requestRender();
  }, [layers.terrain]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (authorityMarkerRef.current) {
      viewer.entities.remove(authorityMarkerRef.current);
      authorityMarkerRef.current = null;
    }
    if (!authorityReference) return;
    const entity = viewer.entities.add(
      new Entity({
        name: authorityReference.label,
        position: Cartesian3.fromDegrees(
          authorityReference.longitude,
          authorityReference.latitude,
          10
        ),
        point: new PointGraphics({
          pixelSize: 12,
          color: Color.fromCssColorString("#eba760"),
          outlineColor: Color.fromCssColorString("#fff2cf"),
          outlineWidth: 2,
        }),
        label: new LabelGraphics({
          text: authorityReference.label,
          font: "600 12px sans-serif",
          fillColor: Color.fromCssColorString("#fff2cf"),
          outlineColor: Color.fromCssColorString("#321f0d"),
          outlineWidth: 3,
          pixelOffset: new Cartesian2(0, -22),
        }),
        description: authorityReference.detail,
      })
    );
    authorityMarkerRef.current = entity;
    viewer.scene.requestRender();
  }, [authorityReference, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const collection = geometryQuery.data;
    if (!viewer || !collection || !viewerReady) return;
    const filteredCollection = {
      ...collection,
      features: collection.features.filter(
        feature =>
          layers[featureLayer(feature.properties)] &&
          matchesMapEvidenceFilter(feature.properties, evidenceFilter) &&
          (!focusUlpins || focusUlpins.includes(feature.properties.ulpin))
      ),
    };
    let cancelled = false;
    const renderGeometry = async () => {
      if (dataSourceRef.current)
        viewer.dataSources.remove(dataSourceRef.current, true);
      const dataSource = await GeoJsonDataSource.load(filteredCollection, {
        clampToGround: false,
        fill: Color.fromCssColorString("#2ad4d9").withAlpha(0.24),
        stroke: Color.fromCssColorString("#7de1aa"),
        strokeWidth: 2,
        markerColor: Color.fromCssColorString("#2ad4d9"),
      });
      if (cancelled) return;
      dataSource.entities.values.forEach(entity => {
        const properties = (entity.properties?.getValue?.() ?? {}) as Record<
          string,
          unknown
        >;
        entity.name =
          typeof properties.name === "string"
            ? properties.name
            : (entity.properties?.ulpin?.getValue?.() ??
              "PostGIS property geometry");
        if (entity.position) {
          entity.point = new PointGraphics({
            pixelSize: 14,
            color: Color.fromCssColorString("#2ad4d9"),
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          });
          entity.label = new LabelGraphics({
            text:
              typeof properties.name === "string"
                ? properties.name
                : "Live PostGIS reference",
            font: "600 13px sans-serif",
            fillColor: Color.fromCssColorString("#eaffff"),
            outlineColor: Color.fromCssColorString("#082126"),
            outlineWidth: 3,
            pixelOffset: new Cartesian2(0, -22),
          });
        }
        if (entity.polygon) {
          const extrusionHeight = getApprovedExtrusionHeight(properties);
          entity.polygon.material = new ColorMaterialProperty(
            Color.fromCssColorString("#2ad4d9").withAlpha(0.34)
          );
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(
            Color.fromCssColorString("#e9ffff")
          );
          entity.polygon.height = new ConstantProperty(1);
          if (extrusionHeight) {
            entity.polygon.extrudedHeight = new ConstantProperty(
              extrusionHeight
            );
            entity.polygon.material = new ColorMaterialProperty(
              Color.fromCssColorString("#55dcb4").withAlpha(0.62)
            );
          }
        }
      });
      dataSourceRef.current = dataSource;
      await viewer.dataSources.add(dataSource);
      if (filteredCollection.features.length > 0 && !syntheticDemoFeature) {
        if (focusUlpins?.length) {
          await viewer.flyTo(dataSource, {
            duration: 0.7,
            offset: new HeadingPitchRange(0.22, -0.92, 260),
          });
        } else {
          viewer.camera.lookAt(
            Cartesian3.fromDegrees(85.054779, 25.6124294),
            new HeadingPitchRange(0.22, -1.12, 980)
          );
        }
      }
    };
    void renderGeometry().catch(error =>
      console.error(
        "[Cesium] Failed to render the PostGIS GeoJSON collection",
        error
      )
    );
    return () => {
      cancelled = true;
    };
  }, [
    geometryQuery.data,
    layers,
    viewerReady,
    focusUlpins,
    evidenceFilter,
    syntheticDemoFeature,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) return;
    if (syntheticDemoDataSourceRef.current) {
      viewer.dataSources.remove(syntheticDemoDataSourceRef.current, true);
      syntheticDemoDataSourceRef.current = null;
    }
    if (!syntheticDemoFeature) return;
    let cancelled = false;
    const renderSyntheticDemo = async () => {
      const dataSource = await GeoJsonDataSource.load(syntheticDemoFeature, {
        clampToGround: false,
        fill: Color.fromCssColorString("#ff9f43").withAlpha(0.28),
        stroke: Color.fromCssColorString("#fff0b3"),
        strokeWidth: 3,
      });
      if (cancelled) return;
      dataSource.entities.values.forEach(entity => {
        const properties = (entity.properties?.getValue?.() ?? {}) as Record<
          string,
          unknown
        >;
        entity.name = "DEMO · NON-AUTHORITATIVE geometry";
        if (entity.polygon && properties.demoNonAuthoritative === true) {
          const visualHeight =
            typeof properties.syntheticDemoExtrusionMetres === "number"
              ? properties.syntheticDemoExtrusionMetres
              : 0;
          entity.polygon.material = new ColorMaterialProperty(
            Color.fromCssColorString("#f29c52").withAlpha(
              syntheticDemoView === "3d" ? 0.64 : 0.82
            )
          );
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(
            Color.fromCssColorString("#fff5ca")
          );
          entity.polygon.height = new ConstantProperty(0);
          if (visualHeight > 0 && syntheticDemoView === "3d") {
            entity.polygon.extrudedHeight = new ConstantProperty(visualHeight);
          }
        }
      });
      const ring = syntheticDemoFeature.geometry.coordinates[0];
      const centre = ring.slice(0, -1).reduce(
        (totals, coordinate) => ({
          longitude: totals.longitude + coordinate[0],
          latitude: totals.latitude + coordinate[1],
        }),
        { longitude: 0, latitude: 0 }
      );
      const pointCount = Math.max(ring.length - 1, 1);
      const ringPositions = Cartesian3.fromDegreesArray(
        ring.slice(0, -1).flat()
      );
      if (syntheticVisualLayers.simulatedDroneImagery) {
        dataSource.entities.add(
          new Entity({
            name: "SIMULATED DRONE IMAGERY · visual context only",
            polygon: new PolygonGraphics({
              hierarchy: new PolygonHierarchy(ringPositions),
              material: new ColorMaterialProperty(
                Color.fromCssColorString("#7ce3e0").withAlpha(0.16)
              ),
              outline: new ConstantProperty(true),
              outlineColor: new ConstantProperty(
                Color.fromCssColorString("#7ce3e0")
              ),
              height: new ConstantProperty(0.22),
            }),
          })
        );
      }
      if (syntheticVisualLayers.simulatedLidarPointCloud) {
        ringPositions.forEach((position, index) => {
          dataSource.entities.add(
            new Entity({
              name: "SIMULATED LiDAR POINT · visual context only",
              position,
              point: new PointGraphics({
                pixelSize: 7 + (index % 3),
                color: new ConstantProperty(
                  Color.fromCssColorString("#c48bff").withAlpha(0.92)
                ),
                outlineColor: new ConstantProperty(
                  Color.fromCssColorString("#fff2ff")
                ),
                outlineWidth: new ConstantProperty(1),
              }),
            })
          );
        });
      }
      dataSource.entities.add(
        new Entity({
          name: "DEMO / NON-AUTHORITATIVE label",
          position: Cartesian3.fromDegrees(
            centre.longitude / pointCount,
            centre.latitude / pointCount,
            18
          ),
          label: new LabelGraphics({
            text:
              syntheticDemoView === "3d"
                ? "DEMO VOLUME\nNOT A BUILDING"
                : "DEMO PLAN\nNOT A CADASTRAL BOUNDARY",
            font: "600 12px sans-serif",
            fillColor: Color.fromCssColorString("#fff5ca"),
            outlineColor: Color.fromCssColorString("#3f210d"),
            outlineWidth: 4,
            showBackground: true,
            backgroundColor:
              Color.fromCssColorString("#4a260d").withAlpha(0.86),
            pixelOffset: new Cartesian2(0, -25),
          }),
        })
      );
      syntheticDemoDataSourceRef.current = dataSource;
      await viewer.dataSources.add(dataSource);
      void viewer.flyTo(dataSource, {
        duration: 0.65,
        offset: new HeadingPitchRange(0.52, -0.42, 96),
      });
    };
    void renderSyntheticDemo().catch(error =>
      console.error("[Cesium] Failed to render synthetic demo geometry", error)
    );
    return () => {
      cancelled = true;
    };
  }, [
    syntheticDemoFeature,
    syntheticDemoView,
    syntheticVisualLayers,
    viewerReady,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !command) return;
    if (command.kind === "zoom-in") viewer.camera.zoomIn(180);
    if (command.kind === "zoom-out") viewer.camera.zoomOut(180);
    if (command.kind === "north")
      viewer.camera.lookAt(
        Cartesian3.fromDegrees(85.054779, 25.6124294),
        new HeadingPitchRange(0, -1.22, 980)
      );
    if (command.kind === "focus-site") {
      if (focusUlpins?.length && dataSourceRef.current) {
        void viewer.flyTo(dataSourceRef.current, {
          duration: 0.7,
          offset: new HeadingPitchRange(0.22, -0.92, 260),
        });
      } else {
        viewer.camera.lookAt(
          Cartesian3.fromDegrees(85.054779, 25.6124294),
          new HeadingPitchRange(0.22, -1.12, 980)
        );
      }
    }
    if (
      command.kind === "focus-authority-reference" &&
      authorityMarkerRef.current
    ) {
      void viewer.flyTo(authorityMarkerRef.current, {
        duration: 0.7,
        offset: new HeadingPitchRange(0.2, -0.9, 540),
      });
    }
    if (
      command.kind === "focus-synthetic-demo" &&
      syntheticDemoDataSourceRef.current
    ) {
      void viewer.flyTo(syntheticDemoDataSourceRef.current, {
        duration: 0.65,
        offset: new HeadingPitchRange(0.52, -0.42, 96),
      });
    }
    if (command.kind === "fullscreen")
      void containerRef.current?.requestFullscreen?.();
    if (command.kind === "inspect-footprint") {
      const entity = dataSourceRef.current?.entities.values.find(candidate => {
        const properties = (candidate.properties?.getValue?.() ?? {}) as Record<
          string,
          unknown
        >;
        return Boolean(
          candidate.polygon && typeof properties.ulpin === "string"
        );
      });
      const ulpin = entity?.properties?.ulpin?.getValue?.();
      if (entity && typeof ulpin === "string") {
        const properties = (entity.properties?.getValue?.() ?? {}) as Record<
          string,
          unknown
        >;
        viewer.selectedEntity = entity;
        onFeatureSelect?.({ ulpin, properties });
      }
    }
  }, [command, focusUlpins, onFeatureSelect]);

  return (
    <div
      className="cesium-spatial-viewer"
      ref={containerRef}
      aria-label="Live PostGIS Cesium map"
    >
      {viewerState === "initializing" && (
        <div className="cesium-loader" role="status" aria-live="polite">
          <LoaderCircle size={18} />
          <span>
            <b>Preparing 3D map</b>
            <small>Loading the Cesium scene and live spatial context…</small>
          </span>
        </div>
      )}
      {viewerState === "error" && (
        <div className="cesium-recovery" role="alert">
          <AlertTriangle size={18} />
          <span>
            <b>3D map could not start</b>
            <small>{viewerError ?? "Try initializing the scene again."}</small>
          </span>
          <button type="button" onClick={retryViewer}>
            <RefreshCw size={13} /> Retry 3D map
          </button>
        </div>
      )}
      <div className="cesium-status">
        <i
          className={
            geometryQuery.isFetching || viewerState === "initializing"
              ? "loading"
              : ""
          }
        />
        {viewerState === "initializing"
          ? "Preparing Cesium"
          : geometryQuery.isFetching
            ? "Refreshing PostGIS"
            : geometryQuery.data
              ? `${geometryQuery.data.features.filter(feature => layers[featureLayer(feature.properties)] && matchesMapEvidenceFilter(feature.properties, evidenceFilter) && (!focusUlpins || focusUlpins.includes(feature.properties.ulpin))).length} visible / ${geometryQuery.data.features.length} live${osmBuildingsEnabled ? (imageryState === "ready" ? " · imagery + OSM 3D context" : imageryState === "loading" ? " · loading visual context" : " · OSM 3D context") : ""}`
              : "Connecting to PostGIS"}
      </div>
      {osmBuildingsEnabled && (
        <div className="cesium-osm-attribution">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors
          </a>{" "}
          ·{" "}
          {imageryState === "ready"
            ? "Cesium World Imagery + OSM buildings"
            : "OSM buildings"}{" "}
          · visual context only
        </div>
      )}
      {geometryQuery.error && (
        <div className="cesium-error">
          <span>
            Live geometry unavailable. The connection will retry automatically.
          </span>
          <button type="button" onClick={() => void geometryQuery.refetch()}>
            <RefreshCw size={12} /> Retry data
          </button>
        </div>
      )}
      {syntheticDemoFeature && (
        <div className="cesium-synthetic-warning">
          <b>DEMO / NON-AUTHORITATIVE</b>
          <span>Synthetic GCP geometry · not cadastral · no PostGIS write</span>
        </div>
      )}
      {syntheticDemoFeature && syntheticHover && (
        <div className="cesium-synthetic-hover-summary" role="status">
          <b>DEMO PROTOTYPE</b>
          <span>Synthetic geometry · click for separate RERA attributes</span>
        </div>
      )}
    </div>
  );
}
