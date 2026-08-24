import { getApprovedExtrusionHeight } from "@/lib/footprint3d";
import { trpc } from "@/lib/trpc";
import {
  matchesMapEvidenceFilter,
  type MapEvidenceFilter,
} from "@shared/evidenceMapFilter";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {
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
  ScreenSpaceEventType,
  Viewer,
} from "cesium";
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
  focusUlpins?: string[];
  onFeatureSelect?: (feature: {
    ulpin: string;
    properties: Record<string, unknown>;
  }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const dataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const osmBuildingsRef = useRef<{
    show: boolean;
    destroy?: () => void;
  } | null>(null);
  const imageryLayerRef = useRef<{ show: boolean } | null>(null);
  const authorityMarkerRef = useRef<Entity | null>(null);
  const syntheticDemoDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
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

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || "";
    const viewer = new Viewer(containerRef.current, {
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
    viewer.scene.backgroundColor = Color.fromCssColorString("#081217");
    viewer.scene.globe.baseColor = Color.fromCssColorString("#162a2c");
    viewer.scene.globe.depthTestAgainstTerrain = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
    viewer.scene.skyBox = undefined;
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(77.6245, 12.9352, 2300),
    });
    let highlightedEntity: Entity | null = null;
    const restoreFootprintStyle = (entity: Entity | null) => {
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
      (movement: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        const entity =
          defined(picked) && picked.id && typeof picked.id === "object"
            ? (picked.id as Entity)
            : undefined;
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
    viewerRef.current = viewer;
    setViewerReady(true);
    let cancelled = false;
    if (osmBuildingsEnabled) {
      void import("cesium").then(async ({ createWorldImageryAsync }) => {
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
      });
    } else {
      setImageryState("unavailable");
    }
    if (osmBuildingsEnabled) {
      void import("cesium").then(async ({ createOsmBuildingsAsync }) => {
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
      });
    }
    return () => {
      cancelled = true;
      osmBuildingsRef.current = null;
      imageryLayerRef.current = null;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [onFeatureSelect, osmBuildingsEnabled]);

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
            Color.fromCssColorString("#ff9f43").withAlpha(0.46)
          );
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(
            Color.fromCssColorString("#fff0b3")
          );
          entity.polygon.height = new ConstantProperty(1);
          if (visualHeight > 0) {
            entity.polygon.extrudedHeight = new ConstantProperty(visualHeight);
          }
        }
      });
      syntheticDemoDataSourceRef.current = dataSource;
      await viewer.dataSources.add(dataSource);
      void viewer.flyTo(dataSource, {
        duration: 0.65,
        offset: new HeadingPitchRange(0.22, -0.92, 240),
      });
    };
    void renderSyntheticDemo().catch(error =>
      console.error("[Cesium] Failed to render synthetic demo geometry", error)
    );
    return () => {
      cancelled = true;
    };
  }, [syntheticDemoFeature, viewerReady]);

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
        offset: new HeadingPitchRange(0.22, -0.92, 240),
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
      <div className="cesium-status">
        <i className={geometryQuery.isFetching ? "loading" : ""} />
        {geometryQuery.isFetching
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
          Live geometry unavailable. The connection will retry automatically.
        </div>
      )}
      {syntheticDemoFeature && (
        <div className="cesium-synthetic-warning">
          DEMO / NON-AUTHORITATIVE · synthetic geometry · no PostGIS write
        </div>
      )}
    </div>
  );
}
