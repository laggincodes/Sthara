import { trpc } from "@/lib/trpc";
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
  Ion,
  LabelGraphics,
  PointGraphics,
  ScreenSpaceEventType,
  Viewer,
} from "cesium";
import { useEffect, useRef, useState } from "react";

export type MapCommand = { kind: "zoom-in" | "zoom-out" | "north" | "fullscreen"; nonce: number } | null;
export type CesiumLayerFlags = { parcels: boolean; buildings: boolean; utilities: boolean; terrain: boolean };

function featureLayer(properties: Record<string, unknown>): keyof CesiumLayerFlags {
  const raw = typeof properties.layer === "string" ? properties.layer.toLowerCase() : "";
  if (raw.includes("building")) return "buildings";
  if (raw.includes("utility")) return "utilities";
  if (raw.includes("terrain")) return "terrain";
  return "parcels";
}

export function CesiumSpatialViewer({
  command,
  layers,
  onFeatureSelect,
}: {
  command: MapCommand;
  layers: CesiumLayerFlags;
  onFeatureSelect?: (feature: { ulpin: string; properties: Record<string, unknown> }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const dataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const geometryQuery = trpc.postgis.geojson.useQuery(undefined, { refetchInterval: 20_000, retry: 1 });

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    Ion.defaultAccessToken = "";
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
    viewer.scene.globe.baseColor = Color.fromCssColorString("#101c22");
    viewer.scene.globe.depthTestAgainstTerrain = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
    viewer.scene.skyBox = undefined;
    viewer.camera.setView({ destination: Cartesian3.fromDegrees(77.6245, 12.9352, 2300) });
    viewer.screenSpaceEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      const entity = defined(picked) && picked.id && typeof picked.id === "object" ? picked.id as Entity : undefined;
      const ulpin = entity?.properties?.ulpin?.getValue?.();
      if (typeof ulpin !== "string") return;
      const properties = (entity?.properties?.getValue?.() ?? {}) as Record<string, unknown>;
      viewer.selectedEntity = entity;
      onFeatureSelect?.({ ulpin, properties });
    }, ScreenSpaceEventType.LEFT_CLICK);
    viewerRef.current = viewer;
    setViewerReady(true);
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [onFeatureSelect]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const collection = geometryQuery.data;
    if (!viewer || !collection || !viewerReady) return;
    const filteredCollection = {
      ...collection,
      features: collection.features.filter(feature => layers[featureLayer(feature.properties)]),
    };
    let cancelled = false;
    const renderGeometry = async () => {
      if (dataSourceRef.current) viewer.dataSources.remove(dataSourceRef.current, true);
      const dataSource = await GeoJsonDataSource.load(filteredCollection, {
        clampToGround: false,
        fill: Color.fromCssColorString("#2ad4d9").withAlpha(0.24),
        stroke: Color.fromCssColorString("#7de1aa"),
        strokeWidth: 2,
        markerColor: Color.fromCssColorString("#2ad4d9"),
      });
      if (cancelled) return;
      dataSource.entities.values.forEach(entity => {
        const properties = (entity.properties?.getValue?.() ?? {}) as Record<string, unknown>;
        entity.name = typeof properties.name === "string" ? properties.name : entity.properties?.ulpin?.getValue?.() ?? "PostGIS property geometry";
        if (entity.position) {
          entity.point = new PointGraphics({ pixelSize: 14, color: Color.fromCssColorString("#2ad4d9"), outlineColor: Color.WHITE, outlineWidth: 2 });
          entity.label = new LabelGraphics({ text: typeof properties.name === "string" ? properties.name : "Live PostGIS reference", font: "600 13px sans-serif", fillColor: Color.fromCssColorString("#eaffff"), outlineColor: Color.fromCssColorString("#082126"), outlineWidth: 3, pixelOffset: new Cartesian2(0, -22) });
        }
        if (entity.polygon) {
          entity.polygon.material = new ColorMaterialProperty(Color.fromCssColorString("#2ad4d9").withAlpha(0.34));
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(Color.fromCssColorString("#e9ffff"));
          entity.polygon.height = new ConstantProperty(1);
        }
      });
      dataSourceRef.current = dataSource;
      await viewer.dataSources.add(dataSource);
      if (filteredCollection.features.length > 0) {
        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(85.054779, 25.6124294, 650),
          orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
        });
      }
    };
    void renderGeometry().catch(error => console.error("[Cesium] Failed to render the PostGIS GeoJSON collection", error));
    return () => { cancelled = true; };
  }, [geometryQuery.data, layers, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !command) return;
    if (command.kind === "zoom-in") viewer.camera.zoomIn(180);
    if (command.kind === "zoom-out") viewer.camera.zoomOut(180);
    if (command.kind === "north") viewer.camera.setView({ destination: Cartesian3.fromDegrees(77.6245, 12.9352, 2300), orientation: { heading: 0, pitch: -0.75, roll: 0 } });
    if (command.kind === "fullscreen") void containerRef.current?.requestFullscreen?.();
  }, [command]);

  return (
    <div className="cesium-spatial-viewer" ref={containerRef} aria-label="Live PostGIS Cesium map">
      <div className="cesium-status"><i className={geometryQuery.isFetching ? "loading" : ""} />{geometryQuery.isFetching ? "Refreshing PostGIS" : geometryQuery.data ? `${geometryQuery.data.features.filter(feature => layers[featureLayer(feature.properties)]).length} visible / ${geometryQuery.data.features.length} live` : "Connecting to PostGIS"}</div>
      {geometryQuery.error && <div className="cesium-error">Live geometry unavailable. The connection will retry automatically.</div>}
    </div>
  );
}
