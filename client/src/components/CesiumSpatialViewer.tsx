import { getApprovedExtrusionHeight } from "@/lib/footprint3d";
import { trpc } from "@/lib/trpc";
import {
  matchesMapEvidenceFilter,
  type MapEvidenceFilter,
} from "@shared/evidenceMapFilter";
import type {
  Cartesian2 as CesiumCartesian2,
  Cartesian3 as CesiumCartesian3,
  Entity as CesiumEntity,
  GeoJsonDataSource as CesiumGeoJsonDataSource,
  Viewer as CesiumViewer,
} from "cesium";
import {
  AlertTriangle,
  Building2,
  Compass,
  Eye,
  FileDown,
  Info,
  Layers3,
  LoaderCircle,
  Maximize2,
  Navigation2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

export type VisualMode = "standard" | "height" | "footprint" | "inspection";

export type HoverTooltipInfo = {
  x: number;
  y: number;
  name: string;
  id: string;
  height: string;
  floors: string;
  source: string;
};

export type SampleMapAsset = {
  kind: "floor-plan" | "model";
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

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

export type DetailedMapSelection = {
  kind: "source-record" | "osm-3d-tile";
  ulpin?: string;
  properties: Record<string, unknown>;
  sourceReference: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    basis: "source-geometry" | "map-pick";
  };
};

type FocusSummary = {
  name: string;
  ulpin: string;
  areaLabel: string;
  comparisonCount?: number;
};

type OsmBuildingSelection = {
  name: string;
  buildingType: string;
  osmIdentifier: string;
};

type OsmTileFeature = {
  primitive?: unknown;
  color?: unknown;
  getProperty?: (name: string) => unknown;
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

import type {
  BuildingFloorStackRecord,
  FloorStackLevel,
} from "@shared/floorCadastre";

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
  measurementControlsOnly = false,
  onSyntheticDemoSelect,
  focusUlpins,
  onFeatureSelect,
  onDetailedFeatureSelect,
  sampleAsset,
  sourceMapView = "3d",
  mockFloorLevels = 0,
  floorExplosionFactor = 0,
  activeFloorIndex = null,
  floorStackData = null,
  onFloorSelect,
  onMockFloorSelect,
  onMockFloorHover,
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
  measurementControlsOnly?: boolean;
  onSyntheticDemoSelect?: () => void;
  focusUlpins?: string[];
  onFeatureSelect?: (feature: {
    ulpin: string;
    properties: Record<string, unknown>;
  }) => void;
  onDetailedFeatureSelect?: (feature: DetailedMapSelection) => void;
  sampleAsset?: SampleMapAsset | null;
  sourceMapView?: "2d" | "3d";
  mockFloorLevels?: number;
  floorExplosionFactor?: number;
  activeFloorIndex?: number | null;
  floorStackData?: BuildingFloorStackRecord | null;
  onFloorSelect?: (floorIndex: number | null) => void;
  onMockFloorSelect?: (floorLevel: number) => void;
  onMockFloorHover?: (floorLevel: number | null) => void;
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
    BoundingSphere,
    Cartographic,
    Cartesian2,
    Cartesian3,
    Cesium3DTileStyle,
    Color,
    ColorMaterialProperty,
    ConstantProperty,
    defined,
    EllipsoidTerrainProvider,
    EllipsoidGeodesic,
    Entity,
    GeoJsonDataSource,
    HeadingPitchRange,
    Ion,
    LabelGraphics,
    Matrix4,
    ModelGraphics,
    OpenStreetMapImageryProvider,
    PointGraphics,
    PolygonGraphics,
    PolygonHierarchy,
    PolylineGraphics,
    ScreenSpaceEventType,
    Viewer,
  } = cesiumRuntime;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const dataSourceRef = useRef<CesiumGeoJsonDataSource | null>(null);
  const osmBuildingsRef = useRef<{
    show: boolean;
    style?: unknown;
    destroy?: () => void;
  } | null>(null);
  const selectedOsmFeatureRef = useRef<{
    feature: OsmTileFeature;
    originalColor: unknown;
  } | null>(null);
  const hoveredOsmFeatureRef = useRef<{
    feature: OsmTileFeature;
    originalColor: unknown;
  } | null>(null);
  const selectedBuildingLabelEntityRef = useRef<CesiumEntity | null>(null);
  const selectedBuildingIdRef = useRef<string | null>(null);
  const imageryLayerRef = useRef<{ show: boolean } | null>(null);
  const streetImageryLayerRef = useRef<{ show: boolean } | null>(null);
  const authorityMarkerRef = useRef<CesiumEntity | null>(null);
  const syntheticDemoDataSourceRef = useRef<CesiumGeoJsonDataSource | null>(
    null
  );
  const measurementEntitiesRef = useRef<CesiumEntity[]>([]);
  const sampleAssetEntityRef = useRef<CesiumEntity | null>(null);
  const mockFloorEntitiesRef = useRef<CesiumEntity[]>([]);
  const measurementPointsRef = useRef<CesiumCartesian3[]>([]);
  const measurementModeRef = useRef<"off" | "distance" | "area">("off");
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerState, setViewerState] = useState<
    "initializing" | "ready" | "error"
  >("initializing");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerRetryKey, setViewerRetryKey] = useState(0);
  const [syntheticHover, setSyntheticHover] = useState(false);
  const [mockFloorHover, setMockFloorHover] = useState<number | null>(null);
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);
  const [imageryState, setImageryState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [streetState, setStreetState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [osmBuildingsState, setOsmBuildingsState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [osmBuildingsVisible, setOsmBuildingsVisible] = useState(true);
  const [visualMode, setVisualMode] = useState<VisualMode>("standard");
  const visualModeRef = useRef<VisualMode>("standard");
  const [cutawayMode, setCutawayMode] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipInfo | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<{
    id: string;
    name: string;
    height?: number;
    floors?: number;
    source: string;
    ulpin?: string;
    areaSqM?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
      basis: "source-geometry" | "map-pick";
    };
    positionCartesian?: CesiumCartesian3;
  } | null>(null);
  const [osmBuildingSelection, setOsmBuildingSelection] =
    useState<OsmBuildingSelection | null>(null);
  const [sourceBuildingSelection, setSourceBuildingSelection] = useState<{
    name: string;
    ulpin: string;
  } | null>(null);
  const [basemap, setBasemap] = useState<"satellite" | "street">("satellite");
  const [cameraView, setCameraView] = useState<"perspective" | "plan">(
    "perspective"
  );
  const [isOrbiting360, setIsOrbiting360] = useState(false);
  const [currentHeadingDeg, setCurrentHeadingDeg] = useState(0);
  const [currentPitchDeg, setCurrentPitchDeg] = useState(-45);
  const [measurementMode, setMeasurementMode] = useState<
    "off" | "distance" | "area"
  >("off");
  const [measurementSummary, setMeasurementSummary] = useState<string | null>(
    null
  );
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

  const clearMeasurement = () => {
    const viewer = viewerRef.current;
    if (viewer) {
      measurementEntitiesRef.current.forEach(entity =>
        viewer.entities.remove(entity)
      );
      viewer.scene.requestRender();
    }
    measurementEntitiesRef.current = [];
    measurementPointsRef.current = [];
    setMeasurementSummary(null);
  };

  const toggleMeasurementMode = (nextMode: "distance" | "area") => {
    clearMeasurement();
    setMeasurementMode(current => (current === nextMode ? "off" : nextMode));
  };

  const exportMeasurementPdf = async () => {
    if (!measurementSummary) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const left = 52;
    let cursorY = 58;
    const addWrapped = (text: string, size = 10, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, 490) as string[];
      pdf.text(lines, left, cursorY);
      cursorY += lines.length * (size + 5) + 8;
    };

    addWrapped("3D ULPIN-VPM · Visual measurement report", 16, true);
    addWrapped(
      `Measurement mode: ${measurementMode === "distance" ? "Distance" : "Area"}`,
      10,
      true
    );
    addWrapped(`Calculated result: ${measurementSummary}`, 12, true);
    addWrapped(`Map points captured: ${measurementPointsRef.current.length}`);
    addWrapped(`Exported: ${new Date().toLocaleString()}`);

    const mapCanvas = viewerRef.current?.scene.canvas;
    if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
      try {
        const snapshot = mapCanvas.toDataURL("image/png");
        cursorY += 8;
        addWrapped("Map snapshot · measured geometry visible", 10, true);
        const imageWidth = 490;
        const imageHeight = Math.min(
          300,
          (imageWidth * mapCanvas.height) / mapCanvas.width
        );
        pdf.addImage(snapshot, "PNG", left, cursorY, imageWidth, imageHeight);
        pdf.setDrawColor(180, 180, 180);
        pdf.rect(left, cursorY, imageWidth, imageHeight);
        cursorY += imageHeight + 16;
      } catch (error) {
        console.warn("[Cesium] Measurement map snapshot unavailable", error);
      }
    }
    cursorY += 12;
    addWrapped(
      "Important limitation: this is an approximate visual calculation from the Cesium map. It is not GNSS, survey, cadastral, legal, engineering, or authoritative measurement evidence.",
      10,
      true
    );
    addWrapped(
      "The report contains only the measurement currently displayed in the browser. It does not create or imply a parcel boundary, ownership right, issued ULPIN, surveyed coordinate, or official area record."
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text("3D ULPIN-VPM · source-aware spatial review", left, 790);
    pdf.save("ulpin-vpm-visual-measurement-report.pdf");
  };

  const getOrbitCenter = (): CesiumCartesian3 => {
    const viewer = viewerRef.current;
    if (!viewer) return Cartesian3.fromDegrees(85.054779, 25.6124294, 0);

    if (floorStackData?.coordinates) {
      return Cartesian3.fromDegrees(
        floorStackData.coordinates.longitude,
        floorStackData.coordinates.latitude,
        (floorStackData.actualHeightM || 20) / 2
      );
    }
    const canvas = viewer.scene.canvas;
    if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      const centerPos =
        viewer.scene.pickPosition(
          new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
        ) ??
        viewer.camera.pickEllipsoid(
          new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
          viewer.scene.globe.ellipsoid
        );
      if (centerPos) return centerPos;
    }
    return Cartesian3.fromDegrees(85.054779, 25.6124294, 0);
  };

  const rotateHeading = (deltaDegrees: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isOrbiting360) setIsOrbiting360(false);
    const target = getOrbitCenter();
    const currentHeading = viewer.camera.heading;
    const currentPitch = viewer.camera.pitch;
    const currentRange = Math.max(
      Cartesian3.distance(viewer.camera.position, target),
      65
    );

    const newHeading =
      (currentHeading + (deltaDegrees * Math.PI) / 180) % (2 * Math.PI);
    viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 0), {
      offset: new HeadingPitchRange(newHeading, currentPitch, currentRange),
      duration: 0.35,
    });
    const deg = Math.round((newHeading * 180) / Math.PI) % 360;
    setCurrentHeadingDeg(deg >= 0 ? deg : deg + 360);
  };

  const setCameraPitchAngle = (pitchDegrees: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isOrbiting360) setIsOrbiting360(false);
    const target = getOrbitCenter();
    const currentHeading = viewer.camera.heading;
    const currentRange = Math.max(
      Cartesian3.distance(viewer.camera.position, target),
      65
    );
    const pitchRad = (pitchDegrees * Math.PI) / 180;
    viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 0), {
      offset: new HeadingPitchRange(currentHeading, pitchRad, currentRange),
      duration: 0.45,
    });
    setCurrentPitchDeg(pitchDegrees);
  };

  const resetToNorth = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isOrbiting360) setIsOrbiting360(false);
    const target = getOrbitCenter();
    const currentRange = Math.max(
      Cartesian3.distance(viewer.camera.position, target),
      85
    );
    viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 0), {
      offset: new HeadingPitchRange(0, -0.78, currentRange),
      duration: 0.5,
    });
    setCurrentHeadingDeg(0);
    setCurrentPitchDeg(-45);
  };

  const toggle360Orbit = () => {
    setIsOrbiting360(current => !current);
  };

  const applyOsmBuildingsStyle = useCallback(
    (mode: VisualMode, selectedId: string | null) => {
      const osmBuildings = osmBuildingsRef.current as any;
      if (!osmBuildings || !cesiumRuntime?.Cesium3DTileStyle) return;

      try {
        const isSelectedExpr = selectedId
          ? `(defined(\${feature['osm_id']}) && \${feature['osm_id']} === '${selectedId}') || (defined(\${feature['id']}) && \${feature['id']} === '${selectedId}')`
          : "false";

        if (mode === "height") {
          const isHighRise =
            "(defined(${feature['cesium#estimatedHeight']}) && ${feature['cesium#estimatedHeight']} >= 35) || (defined(${feature['height']}) && ${feature['height']} >= 35) || (defined(${feature['building:height']}) && ${feature['building:height']} >= 35) || (defined(${feature['render_height']}) && ${feature['render_height']} >= 35)";
          const isMidRise =
            "(defined(${feature['cesium#estimatedHeight']}) && ${feature['cesium#estimatedHeight']} >= 18) || (defined(${feature['height']}) && ${feature['height']} >= 18) || (defined(${feature['building:height']}) && ${feature['building:height']} >= 18) || (defined(${feature['render_height']}) && ${feature['render_height']} >= 18)";
          const isLowRise =
            "(defined(${feature['cesium#estimatedHeight']}) && ${feature['cesium#estimatedHeight']} > 0) || (defined(${feature['height']}) && ${feature['height']} > 0) || (defined(${feature['building:height']}) && ${feature['building:height']} > 0) || (defined(${feature['render_height']}) && ${feature['render_height']} > 0)";

          osmBuildings.style = new cesiumRuntime.Cesium3DTileStyle({
            color: {
              conditions: [
                [isSelectedExpr, "color('#00f3ff', 0.98)"],
                [isHighRise, "color('#f59e0b', 0.88)"],
                [isMidRise, "color('#0ea5e9', 0.82)"],
                [isLowRise, "color('#14b8a6', 0.76)"],
                [selectedId ? "true" : "false", "color('#0d282d', 0.25)"],
                ["true", "color('#14b8a6', 0.65)"],
              ],
            },
          });
        } else if (mode === "footprint") {
          osmBuildings.style = new cesiumRuntime.Cesium3DTileStyle({
            color: {
              conditions: [
                [isSelectedExpr, "color('#00f3ff', 0.98)"],
                [selectedId ? "true" : "false", "color('#071a1e', 0.18)"],
                ["true", "color('#0284c7', 0.35)"],
              ],
            },
          });
        } else if (mode === "inspection") {
          osmBuildings.style = new cesiumRuntime.Cesium3DTileStyle({
            color: {
              conditions: [
                [isSelectedExpr, "color('#00f3ff', 0.98)"],
                ["true", "color('#0b242a', 0.20)"],
              ],
            },
          });
        } else {
          // Standard Mode: Semi-transparent cyan/teal with outline distinction and non-selected dimming
          osmBuildings.style = new cesiumRuntime.Cesium3DTileStyle({
            color: {
              conditions: [
                [isSelectedExpr, "color('#00f3ff', 0.98)"],
                [selectedId ? "true" : "false", "color('#0c292f', 0.28)"],
                ["true", "color('#188f9a', 0.65)"],
              ],
            },
          });
        }
        viewerRef.current?.scene.requestRender();
      } catch (err) {
        console.warn("[Cesium] Failed to apply 3D tile style", err);
      }
    },
    [cesiumRuntime]
  );

  const updateSelectedBuildingLabel = useCallback(
    (
      position: CesiumCartesian3,
      name: string,
      id: string,
      height = 15
    ) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      if (selectedBuildingLabelEntityRef.current) {
        viewer.entities.remove(selectedBuildingLabelEntityRef.current);
        selectedBuildingLabelEntityRef.current = null;
      }

      const carto = Cartographic.fromCartesian(position);
      const labelPos = Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        carto.height + Math.max(4, height + 4)
      );

      const entity = viewer.entities.add(
        new Entity({
          name: `Selected building label · ${name}`,
          position: labelPos,
          label: new LabelGraphics({
            text: `${name.toUpperCase()}\n[${id}]`,
            font: "bold 11px system-ui, -apple-system, sans-serif",
            fillColor: Color.fromCssColorString("#e0f7fa"),
            outlineColor: Color.fromCssColorString("#031b22"),
            outlineWidth: 3,
            showBackground: true,
            backgroundColor: Color.fromCssColorString("rgba(5, 23, 29, 0.88)"),
            backgroundPadding: new Cartesian2(8, 5),
            pixelOffset: new Cartesian2(0, -22),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 1.0,
          }),
          point: new PointGraphics({
            pixelSize: 6,
            color: Color.fromCssColorString("#00f3ff"),
            outlineColor: Color.WHITE,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }),
        })
      );
      selectedBuildingLabelEntityRef.current = entity;
      viewer.scene.requestRender();
    },
    [Cartesian2, Cartesian3, Cartographic, Color, Entity, LabelGraphics, PointGraphics]
  );

  const clearSelectedBuilding = useCallback(() => {
    const viewer = viewerRef.current;
    if (selectedBuildingLabelEntityRef.current && viewer) {
      viewer.entities.remove(selectedBuildingLabelEntityRef.current);
      selectedBuildingLabelEntityRef.current = null;
    }
    const selection = selectedOsmFeatureRef.current;
    if (selection) {
      selection.feature.color = selection.originalColor;
      selectedOsmFeatureRef.current = null;
    }
    selectedBuildingIdRef.current = null;
    setOsmBuildingSelection(null);
    setSourceBuildingSelection(null);
    setSelectedBuildingData(null);
    applyOsmBuildingsStyle(visualModeRef.current, null);
    if (viewer) viewer.scene.requestRender();
  }, [applyOsmBuildingsStyle]);

  const focusBuilding = (targetPos?: CesiumCartesian3, height = 25) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isOrbiting360) setIsOrbiting360(false);
    const target = targetPos ?? selectedBuildingData?.positionCartesian ?? getOrbitCenter();
    const range = Math.max(75, height * 2.8);
    viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 0), {
      offset: new HeadingPitchRange(viewer.camera.heading, -0.62, range),
      duration: 0.75,
    });
  };

  useEffect(() => {
    visualModeRef.current = visualMode;
    const selectedId = selectedBuildingData?.id ?? null;
    applyOsmBuildingsStyle(visualMode, selectedId);
  }, [visualMode, selectedBuildingData?.id, applyOsmBuildingsStyle]);

  useEffect(() => {
    if (!isOrbiting360) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    let animFrameId: number;
    const target = selectedBuildingData?.positionCartesian ?? getOrbitCenter();
    let heading = viewer.camera.heading;
    const pitch = viewer.camera.pitch;
    const range = Math.max(
      Cartesian3.distance(viewer.camera.position, target),
      65
    );

    const orbitLoop = () => {
      const v = viewerRef.current;
      if (!v) return;
      heading = (heading + 0.0075) % (Math.PI * 2);
      v.camera.lookAt(target, new HeadingPitchRange(heading, pitch, range));
      v.camera.lookAtTransform(Matrix4.IDENTITY);
      const deg = Math.round((heading * 180) / Math.PI) % 360;
      setCurrentHeadingDeg(deg >= 0 ? deg : deg + 360);
      v.scene.requestRender();
      animFrameId = requestAnimationFrame(orbitLoop);
    };

    animFrameId = requestAnimationFrame(orbitLoop);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      const v = viewerRef.current;
      if (v) {
        v.camera.lookAtTransform(Matrix4.IDENTITY);
      }
    };
  }, [isOrbiting360, selectedBuildingData?.positionCartesian, Cartesian3, HeadingPitchRange, Matrix4]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    let viewer: CesiumViewer;
    try {
      Ion.defaultAccessToken =
        import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || "";
      viewer = new Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        shouldAnimate: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.baseColor = Color.fromCssColorString("#0d1b22");
      viewer.scene.globe.enableLighting = false;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    } catch (error) {
      setViewerState("error");
      setViewerError(
        error instanceof Error
          ? error.message
          : "Unable to initialize Cesium WebGL context"
      );
      return;
    }

    const restoreOsmBuildingHighlight = (clearSelection = true) => {
      const selection = selectedOsmFeatureRef.current;
      if (selection) {
        selection.feature.color = selection.originalColor;
        selectedOsmFeatureRef.current = null;
      }
      if (clearSelection) {
        setOsmBuildingSelection(null);
        setSelectedBuildingData(null);
        selectedBuildingIdRef.current = null;
        if (selectedBuildingLabelEntityRef.current) {
          viewer.entities.remove(selectedBuildingLabelEntityRef.current);
          selectedBuildingLabelEntityRef.current = null;
        }
        applyOsmBuildingsStyle(visualModeRef.current, null);
      }
    };
    const isOsmBuildingFeature = (
      picked: unknown
    ): picked is OsmTileFeature => {
      if (!picked || typeof picked !== "object") return false;
      const feature = picked as OsmTileFeature;
      return (
        feature.primitive === osmBuildingsRef.current &&
        typeof feature.getProperty === "function"
      );
    };
    const osmProperty = (feature: OsmTileFeature, keys: string[]) => {
      for (const key of keys) {
        const value = feature.getProperty?.(key);
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
      }
      return "Not exposed by OSM tile";
    };
    const selectOsmBuilding = (
      feature: OsmTileFeature,
      coordinates?: DetailedMapSelection["coordinates"],
      pickedPosition?: CesiumCartesian3
    ) => {
      restoreOsmBuildingHighlight(false);
      const originalColor = feature.color;
      feature.color = Color.fromCssColorString("#00f3ff").withAlpha(0.98);
      selectedOsmFeatureRef.current = { feature, originalColor };

      const rawHeight =
        feature.getProperty?.("cesium#estimatedHeight") ??
        feature.getProperty?.("height") ??
        feature.getProperty?.("building:height") ??
        feature.getProperty?.("render_height");
      const numericHeight =
        typeof rawHeight === "number"
          ? rawHeight
          : typeof rawHeight === "string" && !isNaN(parseFloat(rawHeight))
            ? parseFloat(rawHeight)
            : undefined;

      const rawLevels =
        feature.getProperty?.("building:levels") ??
        feature.getProperty?.("levels");
      const numericLevels =
        typeof rawLevels === "number"
          ? rawLevels
          : typeof rawLevels === "string" && !isNaN(parseInt(rawLevels, 10))
            ? parseInt(rawLevels, 10)
            : undefined;

      const buildingName = osmProperty(feature, ["name", "addr:housename"]);
      const buildingType = osmProperty(feature, ["building", "building:use"]);
      const osmIdentifier = osmProperty(feature, ["osm_id", "id"]);
      const street = osmProperty(feature, ["addr:street", "addr:city"]);

      const displayName =
        buildingName !== "Not exposed by OSM tile"
          ? buildingName
          : "Unnamed Building";
      const displayId =
        osmIdentifier !== "Not exposed by OSM tile"
          ? osmIdentifier
          : "Not available";

      selectedBuildingIdRef.current = osmIdentifier;
      setSelectedBuildingData({
        id: displayId,
        name: displayName,
        height: numericHeight,
        floors: numericLevels,
        source: "OpenStreetMap 3D Photogrammetry Tiles",
        coordinates,
        positionCartesian: pickedPosition,
      });

      setOsmBuildingSelection({
        name: displayName,
        buildingType: buildingType,
        osmIdentifier: displayId,
      });

      applyOsmBuildingsStyle(visualModeRef.current, osmIdentifier);

      if (pickedPosition) {
        updateSelectedBuildingLabel(
          pickedPosition,
          displayName,
          displayId,
          numericHeight || 16
        );

        const targetRange = Math.max(85, (numericHeight || 25) * 2.8);
        viewer.camera.flyToBoundingSphere(
          new BoundingSphere(pickedPosition, 0),
          {
            offset: new HeadingPitchRange(
              viewer.camera.heading,
              -0.62,
              targetRange
            ),
            duration: 0.75,
          }
        );
      }

      onDetailedFeatureSelect?.({
        kind: "osm-3d-tile",
        properties: {
          name: displayName,
          buildingType: buildingType,
          osmIdentifier: displayId,
          approvedHeightMetres: numericHeight,
          heightMetres: numericHeight,
          levels: numericLevels,
          approvedFloorCount: numericLevels,
          address: street !== "Not exposed by OSM tile" ? street : undefined,
          source: "OpenStreetMap / Cesium Ion 3D Photogrammetry Tile",
          heightSource: "Real-World Cesium Ion 3D Mesh / OSM Attributes",
        },
        sourceReference: displayId,
        coordinates,
      });
      viewer.selectedEntity = undefined;
      viewer.scene.requestRender();
    };
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
    const removeMeasurementEntities = () => {
      measurementEntitiesRef.current.forEach(entity =>
        viewer.entities.remove(entity)
      );
      measurementEntitiesRef.current = [];
    };
    const metresBetween = (left: CesiumCartesian3, right: CesiumCartesian3) => {
      const start = Cartographic.fromCartesian(left);
      const end = Cartographic.fromCartesian(right);
      return new EllipsoidGeodesic(start, end).surfaceDistance;
    };
    const approximateArea = (points: CesiumCartesian3[]) => {
      if (points.length < 3) return 0;
      const coordinates = points.map(point =>
        Cartographic.fromCartesian(point)
      );
      const averageLatitude =
        coordinates.reduce((sum, point) => sum + point.latitude, 0) /
        coordinates.length;
      const radius = 6_371_008.8;
      const projected = coordinates.map(point => ({
        x: point.longitude * Math.cos(averageLatitude) * radius,
        y: point.latitude * radius,
      }));
      let doubledArea = 0;
      projected.forEach((point, index) => {
        const next = projected[(index + 1) % projected.length];
        doubledArea += point.x * next.y - next.x * point.y;
      });
      return Math.abs(doubledArea) / 2;
    };
    const renderMeasurement = (
      points: CesiumCartesian3[],
      mode: "distance" | "area"
    ) => {
      removeMeasurementEntities();
      points.forEach((point, index) => {
        measurementEntitiesRef.current.push(
          viewer.entities.add(
            new Entity({
              name: `Visual measurement point ${index + 1}`,
              position: point,
              point: new PointGraphics({
                pixelSize: 10,
                color: Color.fromCssColorString("#ffdc77"),
                outlineColor: Color.fromCssColorString("#261b06"),
                outlineWidth: 2,
              }),
              label: new LabelGraphics({
                text: `M${index + 1}`,
                font: "600 11px sans-serif",
                fillColor: Color.fromCssColorString("#fff4cb"),
                outlineColor: Color.fromCssColorString("#261b06"),
                outlineWidth: 3,
                pixelOffset: new Cartesian2(0, -18),
              }),
            })
          )
        );
      });
      if (points.length > 1) {
        measurementEntitiesRef.current.push(
          viewer.entities.add(
            new Entity({
              name: "Visual measurement path",
              polyline: new PolylineGraphics({
                positions: points,
                width: 3,
                material: new ColorMaterialProperty(
                  Color.fromCssColorString("#ffdc77").withAlpha(0.92)
                ),
              }),
            })
          )
        );
      }
      if (mode === "area" && points.length > 2) {
        measurementEntitiesRef.current.push(
          viewer.entities.add(
            new Entity({
              name: "Approximate visual area",
              polygon: new PolygonGraphics({
                hierarchy: new PolygonHierarchy(points),
                material: new ColorMaterialProperty(
                  Color.fromCssColorString("#ffdc77").withAlpha(0.18)
                ),
                outline: new ConstantProperty(true),
                outlineColor: new ConstantProperty(
                  Color.fromCssColorString("#fff4cb")
                ),
              }),
            })
          )
        );
      }
      const totalDistance = points
        .slice(1)
        .reduce(
          (sum, point, index) => sum + metresBetween(points[index], point),
          0
        );
      if (mode === "distance" && points.length === 2) {
        setMeasurementSummary(
          `Approx. distance · ${totalDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`
        );
      } else if (mode === "area" && points.length > 2) {
        setMeasurementSummary(
          `Approx. area · ${approximateArea(points).toLocaleString(undefined, { maximumFractionDigits: 1 })} m² · perimeter ${totalDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`
        );
      } else {
        setMeasurementSummary(
          `${points.length} point${points.length === 1 ? "" : "s"} selected · ${mode === "area" ? "choose 3+ points" : "choose 2 points"}`
        );
      }
      viewer.scene.requestRender();
    };
    let highlightedEntity: CesiumEntity | null = null;
    viewer.screenSpaceEventHandler.setInputAction(
      (movement: { position: CesiumCartesian2 }) => {
        const activeMeasurementMode = measurementModeRef.current;
        if (activeMeasurementMode !== "off") {
          const position =
            viewer.scene.pickPosition(movement.position) ??
            viewer.camera.pickEllipsoid(
              movement.position,
              viewer.scene.globe.ellipsoid
            );
          if (!position) return;
          const currentPoints = measurementPointsRef.current;
          const nextPoints =
            activeMeasurementMode === "distance" && currentPoints.length >= 2
              ? [position]
              : [...currentPoints, position];
          measurementPointsRef.current = nextPoints;
          renderMeasurement(nextPoints, activeMeasurementMode);
          return;
        }
        const picked = viewer.scene.pick(movement.position);
        if (isOsmBuildingFeature(picked)) {
          const pickedPosition =
            viewer.scene.pickPosition(movement.position) ??
            viewer.camera.pickEllipsoid(
              movement.position,
              viewer.scene.globe.ellipsoid
            );
          const pickedCoordinates = pickedPosition
            ? (() => {
                const cartographic = Cartographic.fromCartesian(pickedPosition);
                return {
                  latitude: (cartographic.latitude * 180) / Math.PI,
                  longitude: (cartographic.longitude * 180) / Math.PI,
                  basis: "map-pick" as const,
                };
              })()
            : undefined;
          selectOsmBuilding(picked, pickedCoordinates);
          return;
        }
        restoreOsmBuildingHighlight();
        const entity =
          defined(picked) && picked.id && typeof picked.id === "object"
            ? (picked.id as CesiumEntity)
            : undefined;
        const syntheticProperties = (entity?.properties?.getValue?.() ??
          {}) as Record<string, unknown>;
        const floorIdxProp = entity?.properties?.floorIndex?.getValue?.();
        const floorMatch = entity?.name?.match(/^(?:DEMO floor level|3D Cadastre Level)\s*(-?\d+|[A-Z0-9]+)/i);
        if (floorIdxProp !== undefined || floorMatch) {
          const floorLevel = floorIdxProp !== undefined ? Number(floorIdxProp) : Number(floorMatch?.[1]);
          if (Number.isFinite(floorLevel)) {
            viewer.selectedEntity = entity;
            onFloorSelect?.(floorLevel);
            onMockFloorSelect?.(floorLevel);
            return;
          }
        }
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
            Color.fromCssColorString("#00f3ff").withAlpha(0.88)
          );
          selectedEntity.polygon.outlineColor = new ConstantProperty(
            Color.fromCssColorString("#ffffff")
          );
        }
        highlightedEntity = selectedEntity;
        viewer.selectedEntity = selectedEntity;
        const buildingName =
          typeof properties.name === "string"
            ? properties.name
            : "Source-backed PostGIS footprint";
        const h =
          typeof properties.approvedHeightMetres === "number"
            ? properties.approvedHeightMetres
            : undefined;
        const l =
          typeof properties.approvedFloorCount === "number"
            ? properties.approvedFloorCount
            : undefined;

        selectedBuildingIdRef.current = ulpin;
        setSelectedBuildingData({
          id: ulpin,
          name: buildingName,
          height: h,
          floors: l,
          source: "PostGIS Municipal Survey",
          ulpin,
          areaSqM:
            typeof properties.areaSqM === "number"
              ? properties.areaSqM
              : undefined,
        });

        setSourceBuildingSelection({
          name: buildingName,
          ulpin,
        });

        applyOsmBuildingsStyle(visualModeRef.current, ulpin);

        const centerPos = entity.position?.getValue(viewer.clock.currentTime);
        if (centerPos) {
          updateSelectedBuildingLabel(centerPos, buildingName, ulpin, h || 15);
        }

        void viewer.flyTo(selectedEntity, {
          duration: 0.55,
          offset: new HeadingPitchRange(
            viewer.camera.heading,
            -0.65,
            Math.max(80, (h || 20) * 3)
          ),
        });
        onFeatureSelect?.({ ulpin, properties });
        onDetailedFeatureSelect?.({
          kind: "source-record",
          ulpin,
          properties,
          sourceReference: ulpin,
          coordinates: undefined,
        });
      },
      ScreenSpaceEventType.LEFT_CLICK
    );
    viewer.screenSpaceEventHandler.setInputAction(
      (movement: { endPosition: CesiumCartesian2 }) => {
        const picked = viewer.scene.pick(movement.endPosition);
        if (isOsmBuildingFeature(picked)) {
          const rawH =
            picked.getProperty?.("cesium#estimatedHeight") ??
            picked.getProperty?.("height") ??
            picked.getProperty?.("building:height") ??
            picked.getProperty?.("render_height");
          const numericHeight =
            typeof rawH === "number"
              ? rawH
              : typeof rawH === "string" && !isNaN(parseFloat(rawH))
                ? parseFloat(rawH)
                : undefined;

          const rawL =
            picked.getProperty?.("building:levels") ??
            picked.getProperty?.("levels");
          const numericLevels =
            typeof rawL === "number"
              ? rawL
              : typeof rawL === "string" && !isNaN(parseInt(rawL, 10))
                ? parseInt(rawL, 10)
                : undefined;

          const bName = osmProperty(picked, ["name", "addr:housename"]);
          const bId = osmProperty(picked, ["osm_id", "id"]);

          setHoverTooltip({
            x: movement.endPosition.x + 14,
            y: movement.endPosition.y + 14,
            name:
              bName !== "Not exposed by OSM tile"
                ? bName
                : "Unnamed Building",
            id: bId !== "Not exposed by OSM tile" ? bId : "Not available",
            height: numericHeight
              ? `${numericHeight.toFixed(1)} m`
              : "Not available",
            floors: numericLevels
              ? `${numericLevels} Levels`
              : "Not available",
            source: "OpenStreetMap 3D Tiles",
          });

          if (hoveredOsmFeatureRef.current?.feature !== picked) {
            if (
              hoveredOsmFeatureRef.current &&
              hoveredOsmFeatureRef.current.feature !==
                selectedOsmFeatureRef.current?.feature
            ) {
              hoveredOsmFeatureRef.current.feature.color =
                hoveredOsmFeatureRef.current.originalColor;
            }
            if (picked !== selectedOsmFeatureRef.current?.feature) {
              hoveredOsmFeatureRef.current = {
                feature: picked,
                originalColor: picked.color,
              };
              picked.color = Color.fromCssColorString("#67e8f9").withAlpha(
                0.88
              );
            }
          }
          return;
        }

        const entity =
          defined(picked) && picked.id && typeof picked.id === "object"
            ? (picked.id as CesiumEntity)
            : undefined;

        if (entity && entity.polygon) {
          const properties = (entity.properties?.getValue?.() ?? {}) as Record<
            string,
            unknown
          >;
          const ulpin =
            typeof properties.ulpin === "string" ? properties.ulpin : null;
          const h =
            typeof properties.approvedHeightMetres === "number"
              ? properties.approvedHeightMetres
              : undefined;
          const l =
            typeof properties.approvedFloorCount === "number"
              ? properties.approvedFloorCount
              : undefined;
          const name =
            typeof properties.name === "string"
              ? properties.name
              : "Source-backed PostGIS footprint";

          setHoverTooltip({
            x: movement.endPosition.x + 14,
            y: movement.endPosition.y + 14,
            name,
            id: ulpin ?? "Not available",
            height: h ? `${h.toFixed(1)} m` : "Not available",
            floors: l ? `${l} Levels` : "Not available",
            source: "PostGIS Municipal Survey",
          });
        } else {
          setHoverTooltip(null);
        }

        if (
          hoveredOsmFeatureRef.current &&
          hoveredOsmFeatureRef.current.feature !==
            selectedOsmFeatureRef.current?.feature
        ) {
          hoveredOsmFeatureRef.current.feature.color =
            hoveredOsmFeatureRef.current.originalColor;
          hoveredOsmFeatureRef.current = null;
        }

        const floorIdxProp = entity?.properties?.floorIndex?.getValue?.();
        const floorMatch = entity?.name?.match(
          /^(?:DEMO floor level|3D Cadastre Level)\s*(-?\d+|[A-Z0-9]+)/i
        );
        const floorLevel =
          floorIdxProp !== undefined
            ? Number(floorIdxProp)
            : floorMatch
              ? Number(floorMatch[1])
              : null;
        onMockFloorHover?.(
          floorLevel !== null && Number.isFinite(floorLevel)
            ? floorLevel
            : null
        );
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

    // High-reliability Satellite World Imagery with fallback
    const loadSatelliteImagery = async () => {
      if (cancelled || !viewerRef.current) return;
      try {
        let provider: unknown = null;
        if (osmBuildingsEnabled && typeof (cesiumRuntime as Record<string, unknown>).createWorldImageryAsync === "function") {
          try {
            provider = await (cesiumRuntime as { createWorldImageryAsync: () => Promise<unknown> }).createWorldImageryAsync();
          } catch (ionErr) {
            console.warn("[Cesium] Ion World Imagery asset rate-limited or unavailable, switching to ArcGIS World Imagery fallback", ionErr);
          }
        }
        if (!provider) {
          const runtimeAny = cesiumRuntime as Record<string, unknown>;
          if (runtimeAny.ArcGisMapServerImageryProvider && typeof (runtimeAny.ArcGisMapServerImageryProvider as { fromUrl?: (url: string) => Promise<unknown> }).fromUrl === "function") {
            try {
              provider = await (runtimeAny.ArcGisMapServerImageryProvider as { fromUrl: (url: string) => Promise<unknown> }).fromUrl(
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
              );
            } catch (arcErr) {
              console.warn("[Cesium] ArcGisMapServerImageryProvider.fromUrl fallback attempt", arcErr);
            }
          }
          if (!provider && typeof runtimeAny.ArcGisMapServerImageryProvider === "function") {
            try {
              provider = new (runtimeAny.ArcGisMapServerImageryProvider as new (opts: { url: string }) => unknown)({
                url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
              });
            } catch {
              // fallback below
            }
          }
          if (!provider && typeof runtimeAny.UrlTemplateImageryProvider === "function") {
            try {
              provider = new (runtimeAny.UrlTemplateImageryProvider as new (opts: { url: string }) => unknown)({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              });
            } catch {
              // fallback below
            }
          }
        }

        if (cancelled || !viewerRef.current) return;
        if (provider) {
          const imageryLayer = viewer.imageryLayers.addImageryProvider(provider as Parameters<typeof viewer.imageryLayers.addImageryProvider>[0]);
          imageryLayer.alpha = 0.95;
          imageryLayer.show = layers.terrain && basemap === "satellite";
          imageryLayerRef.current = imageryLayer;
          setImageryState("ready");
          viewer.scene.requestRender();
        } else {
          setImageryState("unavailable");
        }
      } catch (error) {
        setImageryState("unavailable");
        console.warn("[Cesium] World Imagery layer setup error", error);
      }
    };
    void loadSatelliteImagery();

    try {
      const streetProvider = new OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      });
      const streetLayer =
        viewer.imageryLayers.addImageryProvider(streetProvider);
      streetLayer.alpha = 0.94;
      streetLayer.show = layers.terrain && basemap === "street";
      streetImageryLayerRef.current = streetLayer;
      setStreetState("ready");
      viewer.scene.requestRender();
    } catch (error) {
      setStreetState("unavailable");
      console.warn("[Cesium] Optional street-map layer unavailable", error);
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
            setOsmBuildingsState("ready");
            // Immediately apply the styled semi-transparent cyan/teal theme
            applyOsmBuildingsStyle(visualModeRef.current, selectedBuildingIdRef.current);
            viewer.scene.requestRender();
          } catch (error) {
            setOsmBuildingsState("unavailable");
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
      selectedOsmFeatureRef.current = null;
      imageryLayerRef.current = null;
      streetImageryLayerRef.current = null;
      viewer.destroy();
      viewerRef.current = null;
      setViewerReady(false);
    };
  }, [
    onDetailedFeatureSelect,
    onFeatureSelect,
    osmBuildingsEnabled,
    viewerRetryKey,
  ]);

  useEffect(() => {
    const osmBuildings = osmBuildingsRef.current;
    if (!osmBuildings) return;
    osmBuildings.show = layers.buildings && osmBuildingsVisible;
    viewerRef.current?.scene.requestRender();
  }, [layers.buildings, osmBuildingsVisible, osmBuildingsState]);

  useEffect(() => {
    const satelliteLayer = imageryLayerRef.current;
    const streetLayer = streetImageryLayerRef.current;
    if (satelliteLayer)
      satelliteLayer.show = layers.terrain && basemap === "satellite";
    if (streetLayer) streetLayer.show = layers.terrain && basemap === "street";
    viewerRef.current?.scene.requestRender();
  }, [basemap, layers.terrain, imageryState, streetState]);

  const setMapView = (nextView: "perspective" | "plan") => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const target = dataSourceRef.current;
    setCameraView(nextView);
    if (target) {
      void viewer.flyTo(target, {
        duration: 0.55,
        offset:
          nextView === "perspective"
            ? new HeadingPitchRange(0.34, -0.72, 210)
            : new HeadingPitchRange(0, -1.5, 420),
      });
      return;
    }
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(85.054779, 25.6124294, 900),
      orientation: {
        heading: nextView === "perspective" ? 0.34 : 0,
        pitch: nextView === "perspective" ? -0.72 : -1.5,
        roll: 0,
      },
      duration: 0.55,
    });
  };

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
      mockFloorEntitiesRef.current.forEach(entity =>
        viewer.entities.remove(entity)
      );
      mockFloorEntitiesRef.current = [];
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
          if (extrusionHeight && sourceMapView === "3d") {
            entity.polygon.extrudedHeight = new ConstantProperty(
              extrusionHeight
            );
            entity.polygon.material = new ColorMaterialProperty(
              Color.fromCssColorString("#55dcb4").withAlpha(0.62)
            );
          } else {
            entity.polygon.extrudedHeight = undefined;
            entity.polygon.material = new ColorMaterialProperty(
              Color.fromCssColorString("#2ad4d9").withAlpha(0.28)
            );
          }
        }
      });
      dataSourceRef.current = dataSource;
      await viewer.dataSources.add(dataSource);
      if (filteredCollection.features.length > 0 && !syntheticDemoFeature) {
        if (focusUlpins?.length) {
          const focusedEntities = dataSource.entities.values.filter(entity => {
            const properties = (entity.properties?.getValue?.() ??
              {}) as Record<string, unknown>;
            return focusUlpins.includes(String(properties.ulpin ?? ""));
          });
          const focusedEntity = focusedEntities[0];
          if (
            focusedEntities.length > 0 &&
            sourceMapView === "3d" &&
            (floorStackData?.floors?.length || mockFloorLevels > 0)
          ) {
            focusedEntities.forEach(focusedLayerTarget => {
              if (focusedLayerTarget.polygon?.hierarchy) {
              if (floorStackData?.floors?.length) {
                const floors = floorStackData.floors;
                floors.forEach(floor => {
                  const explosionOffset =
                    (floorExplosionFactor || 0) *
                    (floor.floorIndex >= 0 ? floor.floorIndex + 1 : floor.floorIndex) *
                    5.5;
                  const baseHeight = Math.max(0.2, (floor.elevationBaseM || 0) + explosionOffset);
                  const extrudedHeight = baseHeight + Math.max(1.2, floor.floorHeightM || 3.0);

                  const isSelected =
                    activeFloorIndex !== null &&
                    activeFloorIndex !== undefined &&
                    floor.floorIndex === activeFloorIndex;
                  const isAllFloors = activeFloorIndex === null || activeFloorIndex === undefined;

                  let floorColorHex = "#38bdf8";
                  if (floor.floorType === "UNDERGROUND_BASEMENT") floorColorHex = "#0284c7";
                  else if (floor.floorType === "GROUND_RETAIL") floorColorHex = "#10b981";
                  else if (floor.floorType === "RESIDENTIAL_LEVEL") floorColorHex = "#06b6d4";
                  else if (floor.floorType === "COMMERCIAL_OFFICES") floorColorHex = "#6366f1";
                  else if (floor.floorType === "ROOFTOP_TERRACE") floorColorHex = "#f59e0b";

                  const materialColor = isSelected
                    ? Color.fromCssColorString(floorColorHex).withAlpha(0.92)
                    : isAllFloors
                      ? Color.fromCssColorString(floorColorHex).withAlpha(0.52)
                      : Color.fromCssColorString("#64748b").withAlpha(0.12);

                  const outlineColor = isSelected
                    ? Color.fromCssColorString("#ffffff")
                    : isAllFloors
                      ? Color.fromCssColorString("#f8fafc").withAlpha(0.85)
                      : Color.fromCssColorString("#475569").withAlpha(0.25);

                  const floorEntity = viewer.entities.add(
                    new Entity({
                      name: `3D Cadastre Level ${floor.floorCode} · ${floor.floorName}`,
                      properties: {
                        floorIndex: floor.floorIndex,
                        floorCode: floor.floorCode,
                        floorName: floor.floorName,
                        elevationMsl: floor.elevationMsl,
                        ulpin: floorStackData.ulpin,
                      },
                      polygon: new PolygonGraphics({
                        hierarchy: focusedLayerTarget.polygon?.hierarchy,
                        height: baseHeight,
                        extrudedHeight: extrudedHeight,
                        material: new ColorMaterialProperty(materialColor),
                        outline: new ConstantProperty(true),
                        outlineColor: new ConstantProperty(outlineColor),
                        outlineWidth: isSelected ? 4 : 2,
                      }),
                      label: new LabelGraphics({
                        text: isSelected
                          ? `▶ LEVEL ${floor.floorCode}: ${floor.floorName}`
                          : `LEVEL ${floor.floorCode} [${floor.elevationMsl}]`,
                        font: isSelected ? "bold 13px sans-serif" : "600 11px sans-serif",
                        fillColor: isSelected
                          ? Color.fromCssColorString("#ffffff")
                          : Color.fromCssColorString("#f1f5f9"),
                        outlineColor: Color.fromCssColorString("#0f172a"),
                        outlineWidth: 3,
                        pixelOffset: new Cartesian2(0, -18),
                        show:
                          isSelected ||
                          (floorExplosionFactor || 0) > 0.05 ||
                          floor.floorIndex === floors[floors.length - 1].floorIndex,
                      }),
                    })
                  );
                  mockFloorEntitiesRef.current.push(floorEntity);
                });

                // Add 3D Vertical Cadastre Benchmark Axis / Height Pillar
                const totalHeight = floorStackData.actualHeightM || (floors.length * 3.2);
                const maxExplosionZ = (floorExplosionFactor || 0) * (floors.length + 1) * 5.5;
                const pillarTop = totalHeight + maxExplosionZ + 4;
                const coord = floorStackData.coordinates;
                
                const pillarEntity = viewer.entities.add(
                  new Entity({
                    name: `3D Vertical Cadastre Benchmark Axis · ${floorStackData.buildingName}`,
                    polyline: new PolylineGraphics({
                      positions: [
                        Cartesian3.fromDegrees(coord.longitude, coord.latitude, 0),
                        Cartesian3.fromDegrees(coord.longitude, coord.latitude, pillarTop),
                      ],
                      width: 3,
                      material: new ColorMaterialProperty(
                        Color.fromCssColorString("#2ad4d9").withAlpha(0.75)
                      ),
                    }),
                    label: new LabelGraphics({
                      text: `3D CADASTRE ENVELOPE: ${totalHeight.toFixed(1)}m [${floorStackData.actualFloors}]`,
                      font: "bold 11px sans-serif",
                      fillColor: Color.fromCssColorString("#73fff1"),
                      outlineColor: Color.fromCssColorString("#082126"),
                      outlineWidth: 3,
                      pixelOffset: new Cartesian2(0, -18),
                      show: (floorExplosionFactor || 0) > 0.05 || isOrbiting360,
                    }),
                  })
                );
                mockFloorEntitiesRef.current.push(pillarEntity);
              } else {
                const floorCount = Math.min(
                  Math.max(Math.round(mockFloorLevels), 1),
                  12
                );
                for (
                  let floorIndex = 0;
                  floorIndex < floorCount;
                  floorIndex += 1
                ) {
                  const explosionOffset = (floorExplosionFactor || 0) * (floorIndex + 1) * 5.5;
                  const floorHeight = 2 + floorIndex * 3.2 + explosionOffset;
                  const isSelected = activeFloorIndex === floorIndex;
                  const isAll = activeFloorIndex === null || activeFloorIndex === undefined;
                  const floorEntity = viewer.entities.add(
                    new Entity({
                      name: `DEMO floor level ${floorIndex + 1}`,
                      properties: {
                        floorIndex,
                      },
                      polygon: new PolygonGraphics({
                        hierarchy: focusedLayerTarget.polygon.hierarchy,
                        height: floorHeight,
                        extrudedHeight: floorHeight + 2.6,
                        material: new ColorMaterialProperty(
                          Color.fromCssColorString(
                            isSelected ? "#00f5d4" : floorIndex % 2 === 0 ? "#72e3df" : "#b48cff"
                          ).withAlpha(isSelected ? 0.9 : isAll ? 0.45 : 0.12)
                        ),
                        outline: new ConstantProperty(true),
                        outlineColor: new ConstantProperty(
                          Color.fromCssColorString(isSelected ? "#ffffff" : "#fff0b3").withAlpha(0.85)
                        ),
                        outlineWidth: isSelected ? 3 : 2,
                      }),
                      label: new LabelGraphics({
                        text: `LEVEL F${floorIndex + 1}`,
                        font: "600 10px sans-serif",
                        fillColor: Color.fromCssColorString("#fff5ca"),
                        outlineColor: Color.fromCssColorString("#132326"),
                        outlineWidth: 3,
                        pixelOffset: new Cartesian2(0, -14),
                        show: isSelected || (floorExplosionFactor || 0) > 0.05 || floorIndex === floorCount - 1,
                      }),
                    })
                  );
                  mockFloorEntitiesRef.current.push(floorEntity);
                }
              }
              }
            });
          }
          if (focusedEntity) {
            const properties = (focusedEntity.properties?.getValue?.() ??
              {}) as Record<string, unknown>;
            const name =
              typeof properties.name === "string"
                ? properties.name
                : String(properties.ulpin ?? "Source record");
            const area =
              typeof properties.footprintAreaSquareMetres === "number"
                ? `${properties.footprintAreaSquareMetres.toLocaleString()} m²`
                : "Area unavailable";
            focusedEntities.forEach((entity, index) => {
              const comparisonColor = index === 0 ? "#73fff1" : "#b48cff";
              const outlineColor = index === 0 ? "#fff3b0" : "#f2dcff";
              if (entity.polygon) {
                entity.polygon.material = new ColorMaterialProperty(
                  Color.fromCssColorString(comparisonColor).withAlpha(0.78)
                );
                entity.polygon.outlineColor = new ConstantProperty(
                  Color.fromCssColorString(outlineColor)
                );
                entity.polygon.outlineWidth = new ConstantProperty(3);
              }
              if (entity.point) {
                entity.point.pixelSize = new ConstantProperty(18);
                entity.point.color = new ConstantProperty(
                  Color.fromCssColorString(outlineColor)
                );
              }
            });
            viewer.selectedEntity = focusedEntity;
            setSourceBuildingSelection({
              name,
              ulpin: String(properties.ulpin ?? "Source record"),
            });
            setFocusSummary({
              name,
              ulpin: String(properties.ulpin ?? "Source record"),
              areaLabel: area,
              comparisonCount: focusedEntities.length,
            });
          } else {
            setFocusSummary(null);
            setSourceBuildingSelection(null);
          }
          await viewer.flyTo(dataSource, {
            duration: 0.7,
            offset: new HeadingPitchRange(0.22, -0.92, 260),
          });
        } else {
          setFocusSummary(null);
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
    sourceMapView,
    mockFloorLevels,
    floorExplosionFactor,
    activeFloorIndex,
    floorStackData,
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
      {viewerState === "ready" && (
        <div
          className="cesium-3d-building-control-bar"
          aria-label="3D Building GIS Controls"
        >
          {/* Visual Modes Group */}
          <div className="mode-pill-group">
            <span className="mode-label">Mode:</span>
            <button
              type="button"
              className={`mode-btn ${visualMode === "standard" ? "active" : ""}`}
              onClick={() => setVisualMode("standard")}
              title="Standard 3D Buildings with satellite context"
            >
              Standard
            </button>
            <button
              type="button"
              className={`mode-btn ${visualMode === "height" ? "active" : ""}`}
              onClick={() => setVisualMode("height")}
              title="Height-aware color analysis"
            >
              Height
            </button>
            <button
              type="button"
              className={`mode-btn ${visualMode === "footprint" ? "active" : ""}`}
              onClick={() => setVisualMode("footprint")}
              title="Emphasize building footprints and parcel boundaries"
            >
              Footprint
            </button>
            <button
              type="button"
              className={`mode-btn ${visualMode === "inspection" ? "active" : ""}`}
              onClick={() => setVisualMode("inspection")}
              title="Inspection Mode: Isolate selected building and subdue background"
            >
              Inspection
            </button>
          </div>

          <div className="control-divider" />

          {/* Camera Angles Group */}
          <div className="camera-pill-group">
            <button
              type="button"
              onClick={toggle360Orbit}
              className={`cam-btn ${isOrbiting360 ? "active-orbit" : ""}`}
              title={
                isOrbiting360
                  ? "Pause 360° Turntable Orbit"
                  : "Start 360° Continuous Turntable Orbit"
              }
            >
              {isOrbiting360 ? (
                <Pause size={12} className="text-cyan-300 animate-pulse" />
              ) : (
                <RotateCw size={12} className="text-emerald-400" />
              )}
              <span>360° Orbit</span>
            </button>

            <button
              type="button"
              className="cam-btn px-1.5"
              onClick={() => rotateHeading(-45)}
              title="Step Rotate 45° Counter-Clockwise"
            >
              <RotateCcw size={11} className="text-slate-400" />
            </button>
            <button
              type="button"
              className="cam-btn px-1.5"
              onClick={() => rotateHeading(45)}
              title="Step Rotate 45° Clockwise"
            >
              <RotateCw size={11} className="text-slate-400" />
            </button>

            <button
              type="button"
              className={`cam-btn ${currentPitchDeg < -60 ? "active" : ""}`}
              onClick={() => setCameraPitchAngle(-89)}
              title="2D Top-Down Nadir/Plan View (90°)"
            >
              Top
            </button>
            <button
              type="button"
              className={`cam-btn ${
                currentPitchDeg <= -35 && currentPitchDeg >= -60 ? "active" : ""
              }`}
              onClick={() => setCameraPitchAngle(-45)}
              title="Perspective View (45°)"
            >
              45°
            </button>
            <button
              type="button"
              className={`cam-btn ${currentPitchDeg > -35 ? "active" : ""}`}
              onClick={() => setCameraPitchAngle(-25)}
              title="Isometric 3D View"
            >
              Isometric
            </button>
          </div>

          <div className="control-divider" />

          {/* Inspection & Tools Group */}
          <div className="tools-pill-group">
            <button
              type="button"
              className="tool-btn"
              onClick={() => focusBuilding()}
              title="Focus and frame selected building in 3D"
            >
              <ScanSearch size={12} className="text-cyan-400" />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${cutawayMode ? "active" : ""}`}
              onClick={() => setCutawayMode(c => !c)}
              title="Toggle Vertical Cutaway & Height Elevation Ruler"
            >
              <Layers3 size={12} className="text-cyan-400" />
              <span>Cutaway</span>
            </button>
            <button
              type="button"
              onClick={resetToNorth}
              className="tool-btn compass-reset"
              title="Reset View and Compass to Due North (0°)"
            >
              <Compass size={12} className="text-cyan-400" />
              <span className="font-mono text-[10px] text-cyan-200">
                {String(currentHeadingDeg).padStart(3, "0")}°
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cursor-Attached Hover Inspection Tooltip */}
      {hoverTooltip && (
        <div
          className="cesium-hover-inspector-tooltip"
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
          role="tooltip"
        >
          <div className="tooltip-header">
            <Building2 size={13} className="text-cyan-400 shrink-0" />
            <span className="font-bold text-slate-100 truncate">
              {hoverTooltip.name}
            </span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="label">Building ID:</span>
              <span className="val font-mono">{hoverTooltip.id}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Height:</span>
              <span className="val">{hoverTooltip.height}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Floors:</span>
              <span className="val">{hoverTooltip.floors}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Source:</span>
              <span className="val text-cyan-300 font-medium">
                {hoverTooltip.source}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vertical Cutaway Height Profile Ruler */}
      {cutawayMode && (
        <div
          className="cesium-vertical-cutaway-ruler"
          role="region"
          aria-label="Vertical Cutaway Height Ruler"
        >
          <div className="cutaway-header">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Layers3 size={12} className="text-cyan-400" />
              Vertical Height Profile
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {selectedBuildingData?.height
                ? `${selectedBuildingData.height.toFixed(1)} m Total`
                : "MSL Elevation"}
            </span>
          </div>

          <div className="cutaway-body">
            {/* Roof Marker */}
            <div className="ruler-level roof">
              <div className="level-badge">Roof</div>
              <div className="level-line" />
              <div className="level-val">
                {selectedBuildingData?.height
                  ? `${selectedBuildingData.height.toFixed(1)} m`
                  : "Not available"}
              </div>
            </div>

            {/* Real Floor Levels (if present in authoritative dataset) */}
            {floorStackData?.floors && floorStackData.floors.length > 0 ? (
              <div className="ruler-floors-stack">
                {[...floorStackData.floors].reverse().map(floor => {
                  const isSelected = activeFloorIndex === floor.floorIndex;
                  return (
                    <button
                      key={floor.floorIndex}
                      type="button"
                      onClick={() => onFloorSelect?.(floor.floorIndex)}
                      className={`ruler-floor-item ${isSelected ? "selected" : ""}`}
                    >
                      <span className="code">Lvl {floor.floorCode}</span>
                      <span className="name truncate">{floor.floorName}</span>
                      <span className="msl font-mono">{floor.elevationMsl}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="ruler-no-floors">
                <Info size={12} className="text-amber-400 shrink-0" />
                <span>
                  Floor geometry: <b>Not available</b>
                </span>
              </div>
            )}

            {/* Ground Baseline Marker */}
            <div className="ruler-level ground">
              <div className="level-badge">Ground</div>
              <div className="level-line" />
              <div className="level-val">0.0 m (Baseline)</div>
            </div>
          </div>
        </div>
      )}

      {/* Height Mode Interactive Scale Legend */}
      {visualMode === "height" && (
        <div className="cesium-height-legend" role="note">
          <span className="legend-title">Height Analysis Scale</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="color-swatch bg-[#f59e0b]" /> High (≥ 35 m)
            </div>
            <div className="legend-item">
              <span className="color-swatch bg-[#0ea5e9]" /> Medium (18 - 35 m)
            </div>
            <div className="legend-item">
              <span className="color-swatch bg-[#14b8a6]" /> Low (&lt; 18 m)
            </div>
          </div>
        </div>
      )}

      {/* Footprint Mode Layer Legend */}
      {visualMode === "footprint" && (
        <div className="cesium-footprint-legend" role="note">
          <span className="legend-title">Cadastral Visual Layers</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="line-swatch border-cyan-400" /> Building Footprint
            </div>
            <div className="legend-item">
              <span className="line-swatch border-emerald-400" /> Parcel Boundary
            </div>
            <div className="legend-item">
              <span className="line-swatch border-sky-400" /> 3D Extrusion
            </div>
          </div>
        </div>
      )}
      {viewerState === "ready" && (
        <div
          className="cesium-context-controls"
          aria-label="Map context controls"
        >
          {!measurementControlsOnly && (
            <section>
              <span>Basemap · visual context</span>
              <div>
                <button
                  type="button"
                  className={basemap === "satellite" ? "active" : ""}
                  disabled={imageryState !== "ready"}
                  onClick={() => setBasemap("satellite")}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  className={basemap === "street" ? "active" : ""}
                  disabled={streetState !== "ready"}
                  onClick={() => setBasemap("street")}
                >
                  Street
                </button>
              </div>
            </section>
          )}
          {!measurementControlsOnly && (
            <section>
              <span>3D camera</span>
              <div>
                <button
                  type="button"
                  className={cameraView === "perspective" ? "active" : ""}
                  onClick={() => setMapView("perspective")}
                >
                  Perspective
                </button>
                <button
                  type="button"
                  className={cameraView === "plan" ? "active" : ""}
                  onClick={() => setMapView("plan")}
                >
                  Plan view
                </button>
              </div>
            </section>
          )}
          <section>
            <span>3D Tiles · visual context</span>
            <div>
              <button
                type="button"
                className={osmBuildingsVisible ? "active" : ""}
                disabled={osmBuildingsState !== "ready"}
                onClick={() => setOsmBuildingsVisible(current => !current)}
              >
                OSM Buildings
              </button>
            </div>
          </section>
          <section>
            <span>Visual measure</span>
            <div>
              <button
                type="button"
                className={measurementMode === "distance" ? "active" : ""}
                onClick={() => toggleMeasurementMode("distance")}
              >
                Distance
              </button>
              <button
                type="button"
                className={measurementMode === "area" ? "active" : ""}
                onClick={() => toggleMeasurementMode("area")}
              >
                Area
              </button>
              <button
                type="button"
                disabled={!measurementSummary}
                onClick={clearMeasurement}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!measurementSummary}
                onClick={() => void exportMeasurementPdf()}
                title="Export the current approximate measurement as a PDF"
              >
                <FileDown size={12} /> PDF
              </button>
            </div>
          </section>
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
              ? `${geometryQuery.data.features.filter(feature => layers[featureLayer(feature.properties)] && matchesMapEvidenceFilter(feature.properties, evidenceFilter) && (!focusUlpins || focusUlpins.includes(feature.properties.ulpin))).length} visible / ${geometryQuery.data.features.length} live · ${basemap === "street" ? "street" : "satellite"} context${osmBuildingsEnabled ? (imageryState === "ready" ? " + OSM 3D context" : imageryState === "loading" ? " · loading visual context" : "") : ""}`
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
          {basemap === "street"
            ? "OpenStreetMap street tiles"
            : imageryState === "ready"
              ? "Cesium World Imagery + OSM buildings"
              : "OSM buildings"}{" "}
          · visual context only
        </div>
      )}
      {osmBuildingSelection && (
        <div className="cesium-osm-building-inspector" role="status">
          <span>OSM 3D TILE SELECTED · VISUAL CONTEXT</span>
          <b>{osmBuildingSelection.name}</b>
          <dl>
            <div>
              <dt>OSM building type</dt>
              <dd>{osmBuildingSelection.buildingType}</dd>
            </div>
            <div>
              <dt>OSM tile identifier</dt>
              <dd>{osmBuildingSelection.osmIdentifier}</dd>
            </div>
          </dl>
          <small>
            OSM 3D Tiles are visual context only; they do not establish parcel,
            floor, height, ownership, rights, or ULPIN evidence.
          </small>
          {sourceBuildingSelection ? (
            <footer>
              <span>Current source-backed record</span>
              <b>{sourceBuildingSelection.name}</b>
              <code>{sourceBuildingSelection.ulpin}</code>
            </footer>
          ) : (
            <footer>
              <span>PostGIS source metadata remains separate</span>
              <b>Select a cyan source footprint to inspect it.</b>
            </footer>
          )}
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
      {mockFloorHover !== null && (
        <div className="cesium-mock-floor-hover" role="status">
          <svg
            className="cesium-mock-floor-thumbnail"
            viewBox="0 0 96 64"
            role="img"
            aria-label="Illustrative mock floor plan thumbnail"
          >
            <title>Illustrative mock floor plan · not to scale</title>
            <rect x="2" y="2" width="92" height="60" rx="3" />
            <path d="M11 12h34v20H11zM51 12h34v14H51zM51 32h20v20H51zM75 32h10v20H75zM11 38h34v14H11z" />
            <path d="M28 12v20M51 19h34M61 32v20M11 45h34" />
            <circle cx="47" cy="35" r="2.5" />
          </svg>
          <div>
            <span>DEMO FLOOR {mockFloorHover}</span>
            <b>Ownership status: mock placeholder</b>
            <small>
              Illustrative plan · not to scale · click to inspect details
            </small>
          </div>
        </div>
      )}
      {focusSummary && !syntheticDemoFeature && (
        <div className="cesium-focus-popup" role="status">
          <span>
            {focusSummary.comparisonCount === 2
              ? "Combined source-record comparison"
              : "Focused source geometry"}
          </span>
          <b>{focusSummary.name}</b>
          <small>{focusSummary.ulpin}</small>
          <footer>
            <em>{focusSummary.areaLabel}</em>
            <i>
              {focusSummary.comparisonCount === 2
                ? "2 source records · not issued"
                : "Source record · not issued"}
            </i>
          </footer>
        </div>
      )}
      {sampleAsset?.kind === "floor-plan" && (
        <div className="cesium-sample-asset-overlay" role="status">
          <span>DEMO · sample floor plan preview · not georeferenced</span>
          {sampleAsset.mimeType === "application/pdf" ? (
            <iframe
              title={`Sample floor plan ${sampleAsset.name}`}
              src={sampleAsset.url}
            />
          ) : (
            <img
              src={sampleAsset.url}
              alt={`Sample floor plan ${sampleAsset.name}`}
            />
          )}
        </div>
      )}
      {sampleAsset?.kind === "model" && (
        <div className="cesium-sample-asset-badge" role="status">
          DEMO · sample 3D model on map · not surveyed or authoritative
        </div>
      )}
      {measurementMode !== "off" && (
        <div className="cesium-measurement-summary" role="status">
          <b>{measurementSummary ?? "Select points on the map to begin"}</b>
          <span>
            Visual approximation only · not a GNSS, survey, or cadastral
            measurement
          </span>
        </div>
      )}
    </div>
  );
}
