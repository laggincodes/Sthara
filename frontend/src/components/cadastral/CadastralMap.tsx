"use client";

import React, { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeoJSONFeatureCollection } from "@/types/cadastre";

// Configure worker URL explicitly so the browser loads the static asset with proper JS MIME type
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

interface CadastralMapProps {
  geojson: GeoJSONFeatureCollection | null;
  buildingsGeojson?: GeoJSONFeatureCollection | null;
  selectedParcelId: string | null;
  selectedBuildingId?: string | null;
  onSelectParcel: (parcelId: string | null) => void;
  onSelectBuilding?: (buildingId: string | null) => void;
  layerVisibility?: { parcels: boolean; buildings: boolean };
  onToggleLayer?: (layer: "parcels" | "buildings") => void;
  isActive?: boolean;
}

// Free CartoDB Dark Matter basemap style (no API key required)
const DEFAULT_DARK_BASEMAP =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Fallback style in case of offline/network failure
const FALLBACK_BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0B0F19",
      },
    },
  ],
};

function extractPoints(coordinates: unknown): [number, number][] {
  const points: [number, number][] = [];
  function recurse(arr: unknown) {
    if (Array.isArray(arr)) {
      if (
        arr.length >= 2 &&
        typeof arr[0] === "number" &&
        typeof arr[1] === "number" &&
        !isNaN(arr[0]) &&
        !isNaN(arr[1]) &&
        arr[0] >= -180 &&
        arr[0] <= 180 &&
        arr[1] >= -90 &&
        arr[1] <= 90
      ) {
        points.push([arr[0], arr[1]]);
      } else {
        arr.forEach(recurse);
      }
    }
  }
  recurse(coordinates);
  return points;
}

function fitMapToBounds(
  map: maplibregl.Map,
  parcels: GeoJSONFeatureCollection | null,
  buildings?: GeoJSONFeatureCollection | null
) {
  try {
    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    if (parcels?.features) {
      parcels.features.forEach((feature) => {
        const points = extractPoints(feature.geometry?.coordinates);
        points.forEach(([lon, lat]) => {
          bounds.extend([lon, lat]);
          hasPoints = true;
        });
      });
    }

    if (buildings?.features) {
      buildings.features.forEach((feature) => {
        const points = extractPoints(feature.geometry?.coordinates);
        points.forEach(([lon, lat]) => {
          bounds.extend([lon, lat]);
          hasPoints = true;
        });
      });
    }

    if (hasPoints) {
      map.resize();
      map.fitBounds(bounds, {
        padding: 70,
        maxZoom: 18,
        duration: 500,
      });
    }
  } catch {
    // Ignore fit bounds issues on invalid coordinates
  }
}

function updateParcelsLayer(
  map: maplibregl.Map,
  data: GeoJSONFeatureCollection | null,
  activeParcelId: string | null,
  onSelectParcel: (id: string | null) => void,
  visible: boolean
) {
  const sourceId = "cadastral-parcels";
  const vis = visible ? "visible" : "none";

  if (!data || !data.features || data.features.length === 0) {
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    }
    return;
  }

  const normalizedFeatures = data.features.map((feat, index) => {
    const pId =
      feat.properties?.survey_no ||
      feat.properties?.parcel_id ||
      feat.id ||
      `SYS-PARCEL-${index + 1}`;
    return {
      ...feat,
      id: String(pId),
      properties: {
        ...feat.properties,
        __parcel_id: String(pId),
      },
    };
  });

  const enrichedCollection: GeoJSONFeatureCollection = {
    ...data,
    features: normalizedFeatures,
  };

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(
      enrichedCollection as unknown as GeoJSON.GeoJSON
    );
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: enrichedCollection as unknown as GeoJSON.GeoJSON,
    });

    // Parcels Base Fill
    map.addLayer({
      id: "parcels-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#10B981",
        "fill-opacity": 0.22,
      },
    });

    // Parcels Boundary Line
    map.addLayer({
      id: "parcels-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#10B981",
        "line-width": 2,
      },
    });

    // Selected Parcel Highlight Fill
    map.addLayer({
      id: "parcels-selected-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#06B6D4",
        "fill-opacity": 0.45,
      },
      filter: ["==", ["get", "__parcel_id"], activeParcelId || ""],
    });

    // Selected Parcel Highlight Line
    map.addLayer({
      id: "parcels-selected-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#38BDF8",
        "line-width": 3.5,
      },
      filter: ["==", ["get", "__parcel_id"], activeParcelId || ""],
    });

    map.on("click", "parcels-fill", (e: maplibregl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const clickedId = e.features[0].properties?.__parcel_id;
        onSelectParcel(clickedId ? String(clickedId) : null);
      }
    });

    map.on("mouseenter", "parcels-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "parcels-fill", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  // Update visibility and active selection
  ["parcels-fill", "parcels-line", "parcels-selected-fill", "parcels-selected-line"].forEach(
    (layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", vis);
      }
    }
  );

  if (map.getLayer("parcels-selected-fill") && map.getLayer("parcels-selected-line")) {
    const filterExpr = ["==", ["get", "__parcel_id"], activeParcelId || ""];
    map.setFilter("parcels-selected-fill", filterExpr as unknown as maplibregl.FilterSpecification);
    map.setFilter("parcels-selected-line", filterExpr as unknown as maplibregl.FilterSpecification);
  }
}

function updateBuildingsLayer(
  map: maplibregl.Map,
  data: GeoJSONFeatureCollection | null | undefined,
  activeBuildingId: string | null | undefined,
  onSelectBuilding?: (id: string | null) => void,
  visible: boolean = true
) {
  const sourceId = "cadastral-buildings";
  const vis = visible ? "visible" : "none";

  if (!data || !data.features || data.features.length === 0) {
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    }
    return;
  }

  const normalizedFeatures = data.features.map((feat, index) => {
    const bId =
      feat.properties?.building_id ||
      feat.properties?.bld_id ||
      feat.id ||
      `BLD-SYS-${index + 1}`;
    return {
      ...feat,
      id: String(bId),
      properties: {
        ...feat.properties,
        __building_id: String(bId),
      },
    };
  });

  const enrichedCollection: GeoJSONFeatureCollection = {
    ...data,
    features: normalizedFeatures,
  };

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(
      enrichedCollection as unknown as GeoJSON.GeoJSON
    );
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: enrichedCollection as unknown as GeoJSON.GeoJSON,
    });

    // Buildings Base Fill (Purple/Violet tone distinct from green parcels)
    map.addLayer({
      id: "buildings-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#8B5CF6",
        "fill-opacity": 0.5,
      },
    });

    // Buildings Boundary Line
    map.addLayer({
      id: "buildings-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#C4B5FD",
        "line-width": 2.2,
      },
    });

    // Selected Building Highlight Fill
    map.addLayer({
      id: "buildings-selected-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#F59E0B",
        "fill-opacity": 0.7,
      },
      filter: ["==", ["get", "__building_id"], activeBuildingId || ""],
    });

    // Selected Building Highlight Line
    map.addLayer({
      id: "buildings-selected-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#FDE68A",
        "line-width": 3.5,
      },
      filter: ["==", ["get", "__building_id"], activeBuildingId || ""],
    });

    if (onSelectBuilding) {
      map.on("click", "buildings-fill", (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].properties?.__building_id;
          onSelectBuilding(clickedId ? String(clickedId) : null);
        }
      });
    }

    map.on("mouseenter", "buildings-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "buildings-fill", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  // Update visibility and active selection
  ["buildings-fill", "buildings-line", "buildings-selected-fill", "buildings-selected-line"].forEach(
    (layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", vis);
      }
    }
  );

  if (map.getLayer("buildings-selected-fill") && map.getLayer("buildings-selected-line")) {
    const filterExpr = ["==", ["get", "__building_id"], activeBuildingId || ""];
    map.setFilter("buildings-selected-fill", filterExpr as unknown as maplibregl.FilterSpecification);
    map.setFilter("buildings-selected-line", filterExpr as unknown as maplibregl.FilterSpecification);
  }
}

export function CadastralMap({
  geojson,
  buildingsGeojson,
  selectedParcelId,
  selectedBuildingId,
  onSelectParcel,
  onSelectBuilding,
  layerVisibility = { parcels: true, buildings: true },
  onToggleLayer,
  isActive = true,
}: CadastralMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isLoadedRef = useRef<boolean>(false);

  const onSelectParcelCallback = useCallback(
    (id: string | null) => {
      onSelectParcel(id);
    },
    [onSelectParcel]
  );

  const onSelectBuildingCallback = useCallback(
    (id: string | null) => {
      if (onSelectBuilding) onSelectBuilding(id);
    },
    [onSelectBuilding]
  );

  // 1. Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let mapInstance: maplibregl.Map;

    try {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DEFAULT_DARK_BASEMAP,
        center: [73.856, 18.52],
        zoom: 15,
        attributionControl: false,
      });
    } catch {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: FALLBACK_BLANK_STYLE,
        center: [73.856, 18.52],
        zoom: 15,
        attributionControl: false,
      });
    }

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    mapInstance.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "OpenStreetMap, CARTO | 3D Cadastral Intelligence",
      }),
      "bottom-right"
    );

    const setupLayers = () => {
      if (!mapInstance.isStyleLoaded()) return;
      isLoadedRef.current = true;
      mapRef.current = mapInstance;
      updateParcelsLayer(
        mapInstance,
        geojson,
        selectedParcelId,
        onSelectParcelCallback,
        layerVisibility.parcels
      );
      updateBuildingsLayer(
        mapInstance,
        buildingsGeojson,
        selectedBuildingId,
        onSelectBuildingCallback,
        layerVisibility.buildings
      );
      fitMapToBounds(mapInstance, geojson, buildingsGeojson);
    };

    mapInstance.on("load", setupLayers);
    mapInstance.on("style.load", setupLayers);

    mapInstance.on("error", (e: { error?: { message?: string } }) => {
      if (e.error?.message && e.error.message.includes("style")) {
        try {
          mapInstance.setStyle(FALLBACK_BLANK_STYLE);
        } catch {
          // ignore
        }
      }
    });

    mapRef.current = mapInstance;

    return () => {
      isLoadedRef.current = false;
      mapInstance.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Resize observer for viewport responsiveness and display transitions
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current && isLoadedRef.current) {
        mapRef.current.resize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 3. React to isActive view mode transition
  useEffect(() => {
    if (isActive && mapRef.current && isLoadedRef.current) {
      mapRef.current.resize();
      fitMapToBounds(mapRef.current, geojson, buildingsGeojson);
    }
  }, [isActive, geojson, buildingsGeojson]);

  // 4. Update Map Layers on Data or Selection Changes
  useEffect(() => {
    if (mapRef.current && isLoadedRef.current) {
      updateParcelsLayer(
        mapRef.current,
        geojson,
        selectedParcelId,
        onSelectParcelCallback,
        layerVisibility.parcels
      );
      updateBuildingsLayer(
        mapRef.current,
        buildingsGeojson,
        selectedBuildingId,
        onSelectBuildingCallback,
        layerVisibility.buildings
      );
    }
  }, [
    geojson,
    buildingsGeojson,
    selectedParcelId,
    selectedBuildingId,
    layerVisibility.parcels,
    layerVisibility.buildings,
    onSelectParcelCallback,
    onSelectBuildingCallback,
  ]);

  // 5. Fit bounds when new dataset arrives
  useEffect(() => {
    if (mapRef.current && isLoadedRef.current) {
      fitMapToBounds(mapRef.current, geojson, buildingsGeojson);
    }
  }, [geojson, buildingsGeojson]);

  return (
    <div className="relative h-full w-full min-h-[480px]">
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full bg-[#0B0F19]" />

      {/* Layer Visibility Control Widget */}
      <div className="absolute top-3 left-3 z-10 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 backdrop-blur-md shadow-lg text-xs">
        <span className="font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 block mb-1.5">
          Map Layers
        </span>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={layerVisibility.parcels}
              onChange={() => onToggleLayer && onToggleLayer("parcels")}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80 border border-emerald-400 inline-block" />
              Parcels
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={layerVisibility.buildings}
              onChange={() => onToggleLayer && onToggleLayer("buildings")}
              className="rounded border-slate-700 bg-slate-800 text-purple-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-purple-500/80 border border-purple-400 inline-block" />
              Buildings
            </span>
          </label>
        </div>
      </div>

      {/* Map Legend Widget */}
      <div className="absolute bottom-6 left-3 z-10 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur-md shadow-lg text-[11px] font-mono">
        <span className="uppercase tracking-wider text-[9px] font-bold text-slate-400 block mb-1.5">
          Legend
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs border border-emerald-400 bg-emerald-950/40 inline-block" />
            <span>Parcel Boundary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs border border-purple-400 bg-purple-900/50 inline-block" />
            <span>Building Footprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs border border-sky-400 bg-sky-500/50 inline-block" />
            <span>Selected Parcel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs border border-amber-300 bg-amber-500/70 inline-block" />
            <span>Selected Building</span>
          </div>
        </div>
      </div>
    </div>
  );
}

