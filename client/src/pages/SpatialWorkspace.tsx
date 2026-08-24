import {
  CesiumSpatialViewer,
  type CesiumLayerFlags,
  type MapCommand,
} from "@/components/CesiumSpatialViewer";
import {
  ThreeBuildingPreview,
  type ThreePreviewFeature,
} from "@/components/ThreeBuildingPreview";
import {
  IIT_PATNA_OFFICIAL_CONTEXT,
  isIitPatnaReference,
} from "@shared/iitPatnaEvidence";
import {
  getPlaceExplorerSegment,
  PLACE_EXPLORER_SEGMENTS,
  PLACE_EXPLORER_UNAVAILABLE_METRICS,
  SOURCE_BACKED_EXPLORER_SUGGESTIONS,
} from "@shared/placeExplorer";
import { resolveBuildingEvidenceLevel } from "@/lib/buildingEvidenceLevel";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Box,
  Building2,
  CircleDot,
  Database,
  Layers3,
  Maximize2,
  Minus,
  Plus,
  ScanSearch,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

type SelectedFeature = { ulpin: string; properties: Record<string, unknown> };

const layerOptions: Array<{
  key: keyof CesiumLayerFlags;
  label: string;
  color: string;
}> = [
  { key: "parcels", label: "Surface footprint references", color: "#2ad4d9" },
  { key: "buildings", label: "Detected building envelopes", color: "#7de1aa" },
  { key: "utilities", label: "Subsurface evidence", color: "#eba760" },
  { key: "terrain", label: "Terrain context", color: "#d8e2de" },
];

type VerticalLayerId =
  | "surface"
  | "envelope"
  | "unit"
  | "rights"
  | "subsurface";

const verticalLayers: Array<{
  id: VerticalLayerId;
  order: string;
  label: string;
  shortLabel: string;
  description: string;
  evidence: string;
}> = [
  {
    id: "surface",
    order: "01",
    label: "Source footprint",
    shortLabel: "Surface",
    description:
      "Live PostGIS geometry selected from an attributed source layer.",
    evidence: "Live geometry",
  },
  {
    id: "envelope",
    order: "02",
    label: "Building envelope",
    shortLabel: "Envelope",
    description:
      "Detected building extent; elevation remains unapproved until an authority source is attached.",
    evidence: "Height required",
  },
  {
    id: "unit",
    order: "03",
    label: "Floor & unit",
    shortLabel: "Floor / unit",
    description:
      "Vertical unit boundaries require an approved floor plan and registered ULPIN record.",
    evidence: "Plan required",
  },
  {
    id: "rights",
    order: "04",
    label: "Air & vertical rights",
    shortLabel: "Rights",
    description:
      "Rights volumes are displayed only from an explicit authority-linked record.",
    evidence: "Record required",
  },
  {
    id: "subsurface",
    order: "05",
    label: "Subsurface assets",
    shortLabel: "Subsurface",
    description:
      "Utility or underground layers require surveyed source evidence and depth metadata.",
    evidence: "Survey required",
  },
];

type EvidenceLevel = 1 | 2 | 3;

const evidenceLevels: Array<{
  level: EvidenceLevel;
  title: string;
  source: string;
  next: string;
  verticalLayer: VerticalLayerId;
}> = [
  {
    level: 1,
    title: "Building outline",
    source: "OSM / public footprint",
    next: "Verified building-height record",
    verticalLayer: "surface",
  },
  {
    level: 2,
    title: "Extruded 3D building",
    source: "Verified building height",
    next: "Official floor plan or BIM",
    verticalLayer: "envelope",
  },
  {
    level: 3,
    title: "Vertical ULPIN model",
    source: "Official floor plan / BIM",
    next: "Vertical ULPIN registration",
    verticalLayer: "unit",
  },
];

export default function SpatialWorkspace() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryParameters = new URLSearchParams(search);
  const requestedSite = queryParameters.get("site") ?? "Amity University Patna";
  const explorerSegment = getPlaceExplorerSegment(
    queryParameters.get("segment")
  );
  const explorer = PLACE_EXPLORER_SEGMENTS[explorerSegment];
  const initialSite = useMemo(() => requestedSite, []);
  const [searchText, setSearchText] = useState(initialSite);
  const [siteQuery, setSiteQuery] = useState(initialSite);
  const [layers, setLayers] = useState<CesiumLayerFlags>({
    parcels: true,
    buildings: true,
    utilities: true,
    terrain: true,
  });
  const [command, setCommand] = useState<MapCommand>({
    kind: "focus-site",
    nonce: Date.now(),
  });
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [verticalLayer, setVerticalLayer] =
    useState<VerticalLayerId>("surface");
  const [resolutionNote, setResolutionNote] = useState<string | null>(null);
  const searchResult = trpc.postgis.areaSearch.useQuery({ query: siteQuery });
  const placeFacts = trpc.postgis.placeFacts.useQuery({ query: siteQuery });
  const liveGeometry = trpc.postgis.geojson.useQuery();
  const resolveBuilding = trpc.postgis.resolveBuilding.useMutation();

  const selectedName =
    typeof selected?.properties.name === "string"
      ? selected.properties.name
      : "Live building volume";
  const selectedArea =
    typeof selected?.properties.footprintAreaSquareMetres === "number"
      ? `${selected.properties.footprintAreaSquareMetres.toLocaleString()} m²`
      : "Area pending";
  const selectedHeight =
    typeof selected?.properties.approvedHeightMetres === "number"
      ? `${selected.properties.approvedHeightMetres} m approved`
      : "Height awaiting authority approval";
  const selectedSource =
    typeof selected?.properties.source === "string"
      ? selected.properties.source
      : "Live PostGIS geometry";
  const selectedRecordType =
    typeof selected?.properties.recordType === "string"
      ? selected.properties.recordType
      : "Source-backed geometry";
  const iitPatnaContext = isIitPatnaReference(siteQuery)
    ? IIT_PATNA_OFFICIAL_CONTEXT
    : null;
  const selectedUlpIn = selected?.ulpin ?? "Select a live footprint";
  const activeLayerCount = Object.values(layers).filter(Boolean).length;
  const activeVerticalLayer =
    verticalLayers.find(layer => layer.id === verticalLayer) ??
    verticalLayers[0];
  const osmBuildingsReady = Boolean(
    import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN
  );
  const previewFeature = useMemo<ThreePreviewFeature | null>(() => {
    const preferredUlpins = selected
      ? [selected.ulpin]
      : (searchResult.data?.matchedUlpins ?? []);
    const feature = liveGeometry.data?.features.find(candidate =>
      preferredUlpins.includes(candidate.properties.ulpin)
    );
    return feature
      ? {
          ulpin: feature.properties.ulpin,
          geometry: feature.geometry,
          properties: feature.properties,
        }
      : null;
  }, [liveGeometry.data, searchResult.data?.matchedUlpins, selected]);
  const evidenceState = resolveBuildingEvidenceLevel(
    previewFeature?.properties
  );
  const { hasOfficialFloorPlan, level: activeEvidenceLevel } = evidenceState;
  const activeEvidence = evidenceLevels[activeEvidenceLevel - 1];
  const nextEvidenceAction =
    activeEvidenceLevel === 1
      ? "Attach height evidence"
      : activeEvidenceLevel === 2
        ? "Attach floor plan / BIM"
        : "Review vertical ULPIN";
  const issueCommand = (kind: Exclude<MapCommand, null>["kind"]) =>
    setCommand({ kind, nonce: Date.now() });
  const onFeatureSelect = useCallback(
    (feature: SelectedFeature) => setSelected(feature),
    []
  );

  useEffect(() => {
    setSearchText(requestedSite);
    setSiteQuery(requestedSite);
    setResolutionNote(null);
    setSelected(null);
  }, [requestedSite]);

  const activateVerticalLayer = (layer: VerticalLayerId) => {
    setVerticalLayer(layer);
    if (layer === "surface" || layer === "envelope")
      issueCommand("inspect-footprint");
  };
  const activateEvidenceLevel = (level: (typeof evidenceLevels)[number]) => {
    setVerticalLayer(level.verticalLayer);
    issueCommand(level.level === 1 ? "inspect-footprint" : "focus-site");
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchText.trim();
    if (query.length >= 2) {
      setResolutionNote(null);
      resolveBuilding.mutate(
        { query },
        {
          onSuccess: result => {
            setSiteQuery(result.resolvedQuery);
            setResolutionNote(
              result.resolution === "ai-assisted-source-alias"
                ? `AI routing matched an existing source-backed area: ${result.rationale}`
                : result.resolution === "unavailable"
                  ? result.rationale
                  : null
            );
            issueCommand("focus-site");
          },
          onError: () => {
            setSiteQuery(query);
            setResolutionNote(
              "AI routing is unavailable; searching only the live source-backed layer."
            );
            issueCommand("focus-site");
          },
        }
      );
    }
  };

  return (
    <main className="spatial-workspace-shell">
      <aside
        className="spatial-workspace-rail"
        aria-label="Spatial workspace navigation"
      >
        <Link href="/" className="spatial-brand">
          <span className="spatial-brand-mark" />
          <span>
            <small>Dept. of Land Resources</small>
            <strong>3D ULPIN·VPM</strong>
          </span>
        </Link>
        <div className="spatial-rail-group">
          <p>Explore records</p>
          <button
            type="button"
            className={explorerSegment === "parcels" ? "active" : ""}
            onClick={() =>
              setLocation(
                `/workspace?segment=parcels&site=${encodeURIComponent(siteQuery)}`
              )
            }
          >
            <Box size={17} /> Parcels
          </button>
          <button
            type="button"
            className={explorerSegment === "buildings" ? "active" : ""}
            onClick={() =>
              setLocation(
                `/workspace?segment=buildings&site=${encodeURIComponent(siteQuery)}`
              )
            }
          >
            <Building2 size={17} /> Buildings
          </button>
          <button type="button" onClick={() => setLocation("/")}>
            <Layers3 size={17} /> Command home
          </button>
          <button
            type="button"
            onClick={() => setLocation("/?workspace=ULPIN%20registry")}
          >
            <ShieldCheck size={17} /> ULPIN registry
          </button>
        </div>
        <div className="spatial-rail-group">
          <p>Data operations</p>
          <button
            type="button"
            onClick={() => setLocation("/?workspace=Data%20ingestion")}
          >
            <Database size={17} /> Data ingestion
          </button>
          <button
            type="button"
            onClick={() => setLocation("/?workspace=Processing%20queue")}
          >
            <Settings2 size={17} /> Processing queue
          </button>
        </div>
        <div className="spatial-rail-status">
          <i />{" "}
          <span>
            <small>Active field mode</small>
            <strong>3D ULPIN-VPM project</strong>
            <em>source-backed individual footprints</em>
          </span>
        </div>
        <div className="spatial-rail-footer">
          <i /> CORS link stable <span>± 1.8 cm</span>
        </div>
      </aside>

      <section className="spatial-workspace-main">
        <header className="spatial-workspace-topbar">
          <div>
            <span>Operations</span>
            <b>›</b>
            <strong>{explorer.label}</strong>
            <b>›</b>
            <strong>{searchResult.data?.siteLabel ?? siteQuery}</strong>
          </div>
          <form onSubmit={submitSearch}>
            <ScanSearch size={16} />
            <input
              list="source-backed-place-suggestions"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              aria-label={`Search ${explorer.label.toLowerCase()} and live place records`}
              placeholder={explorer.searchPlaceholder}
            />
            <datalist id="source-backed-place-suggestions">
              {SOURCE_BACKED_EXPLORER_SUGGESTIONS.map(suggestion => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <button type="submit">Locate</button>
          </form>
          <button
            className="workspace-home-button"
            type="button"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
        </header>

        <div className="spatial-model-layout">
          <section className="spatial-model-stage">
            <CesiumSpatialViewer
              command={command}
              layers={layers}
              focusUlpins={searchResult.data?.matchedUlpins}
              onFeatureSelect={onFeatureSelect}
            />
            <div className="spatial-stage-grid" />
            <div className="spatial-stage-vignette" />
            <div className="spatial-stage-heading">
              <p>{explorer.stageLabel}</p>
              <h1>
                {resolveBuilding.isPending || searchResult.isLoading
                  ? "Finding source-backed geometry…"
                  : (searchResult.data?.buildingCount ?? 0) > 0
                    ? searchResult.data?.siteLabel
                    : explorer.noResultLabel}
              </h1>
              <span>
                <CircleDot size={13} />{" "}
                {(searchResult.data?.buildingCount ?? 0) > 0
                  ? `${searchResult.data?.buildingCount} matched PostGIS footprints · camera focused on source geometry`
                  : "Try a mapped site, ULPIN, or source-backed building record"}{" "}
                <b>·</b> EPSG:4326
              </span>
              {resolutionNote && (
                <small className="spatial-resolution-note">
                  {resolutionNote}
                </small>
              )}
            </div>
            <div className="spatial-stage-actions">
              <button
                type="button"
                onClick={() => issueCommand("fullscreen")}
                aria-label="Expand 3D map"
              >
                <Maximize2 size={17} />
              </button>
              <button
                type="button"
                onClick={() => issueCommand("inspect-footprint")}
                aria-label="Inspect live footprint"
              >
                <ScanSearch size={17} />
              </button>
            </div>
            <div className="spatial-map-controls">
              <button
                type="button"
                onClick={() => issueCommand("zoom-in")}
                aria-label="Zoom in"
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                onClick={() => issueCommand("zoom-out")}
                aria-label="Zoom out"
              >
                <Minus size={17} />
              </button>
              <button
                type="button"
                onClick={() => issueCommand("north")}
                aria-label="Reset north"
              >
                N
              </button>
            </div>
            <div
              className="spatial-action-dock"
              aria-label="Property workflow actions"
            >
              <span>Live property workflow</span>
              <div>
                <button
                  type="button"
                  onClick={() => issueCommand("focus-site")}
                >
                  <ScanSearch size={13} /> Focus source
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/?workspace=Data%20ingestion&site=${encodeURIComponent(siteQuery)}`
                    )
                  }
                >
                  <Database size={13} /> {nextEvidenceAction}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocation(
                      selected
                        ? `/?editor=${encodeURIComponent(selected.ulpin)}`
                        : "/?workspace=Operator%20access"
                    )
                  }
                >
                  <ShieldCheck size={13} />{" "}
                  {selected ? "Authority review" : "Operator access"}
                </button>
              </div>
              <small>
                {activeEvidenceLevel === 1
                  ? "No height, floor, or unit data is inferred."
                  : activeEvidenceLevel === 2
                    ? "Extrusion is evidence-backed; floor geometry remains locked."
                    : "Floor-plan/BIM evidence is ready for registered vertical ULPIN review."}
              </small>
            </div>
            <div
              className="spatial-order-panel spatial-evidence-panel"
              aria-label="Three-level building evidence model"
            >
              <div className="spatial-order-panel-heading">
                <span>
                  <Box size={13} /> Building evidence levels
                </span>
                <b>LEVEL {activeEvidenceLevel} / 03</b>
              </div>
              <div className="spatial-order-list">
                {evidenceLevels.map(level => (
                  <button
                    key={level.level}
                    type="button"
                    className={
                      activeEvidenceLevel === level.level
                        ? "active"
                        : activeEvidenceLevel > level.level
                          ? "complete"
                          : "pending"
                    }
                    onClick={() => activateEvidenceLevel(level)}
                    aria-pressed={activeEvidenceLevel === level.level}
                  >
                    <strong>0{level.level}</strong>
                    <span>
                      <b>{level.title}</b>
                      <small>
                        {activeEvidenceLevel === level.level
                          ? `Active · ${level.source}`
                          : activeEvidenceLevel > level.level
                            ? `Complete · ${level.source}`
                            : `Locked · ${level.next}`}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              <small className="spatial-evidence-next">
                Next evidence:{" "}
                <b>
                  {activeEvidenceLevel === 3
                    ? "vertical ULPIN registration record"
                    : activeEvidence.next}
                </b>
              </small>
            </div>
            <div className="spatial-selection-chip">
              <i />{" "}
              {selected
                ? `Selected ${selected.ulpin}`
                : (searchResult.data?.buildingCount ?? 0) > 0
                  ? `${searchResult.data?.buildingCount} live building layers`
                  : "No source-backed footprint returned"}{" "}
              <b>
                {searchResult.data?.totalFootprintAreaSquareMetres.toLocaleString() ??
                  "0"}{" "}
                m²
              </b>
            </div>
            <div className="spatial-stage-footer">
              <span>50 m</span>
              <span>LIVE POSTGIS · individual footprints only</span>
            </div>
          </section>

          <aside className="spatial-dossier">
            <div className="spatial-dossier-card explorer-segment-card">
              <div className="spatial-dossier-title">
                <div>
                  <p>{explorer.eyebrow}</p>
                  <h2>{explorer.label} explorer</h2>
                </div>
                <Box size={16} />
              </div>
              <p className="explorer-segment-copy">{explorer.description}</p>
              <dl>
                <div>
                  <dt>Matched records</dt>
                  <dd>{searchResult.data?.buildingCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Geometry-backed area</dt>
                  <dd>{`${searchResult.data?.totalFootprintAreaSquareMetres.toLocaleString() ?? "0"} m²`}</dd>
                </div>
              </dl>
              <div className="spatial-institution-lock">
                <b>Unavailable measurements</b>
                <small>{PLACE_EXPLORER_UNAVAILABLE_METRICS}</small>
              </div>
              <div className="explorer-record-list">
                <b>{explorer.recordLabel}</b>
                {searchResult.data?.records.length ? (
                  searchResult.data.records.slice(0, 6).map(record => (
                    <button
                      type="button"
                      key={record.ulpin}
                      onClick={() => {
                        setSelected({
                          ulpin: record.ulpin,
                          properties: {
                            name: record.name,
                            footprintAreaSquareMetres:
                              record.footprintAreaSquareMetres,
                            approvedHeightMetres: record.approvedHeightMetres,
                          },
                        });
                        issueCommand("inspect-footprint");
                      }}
                    >
                      <span>{record.name}</span>
                      <small>
                        {record.footprintAreaSquareMetres.toLocaleString()} m² ·
                        source footprint
                      </small>
                    </button>
                  ))
                ) : (
                  <small className="explorer-empty-records">
                    No matching live source records.
                  </small>
                )}
              </div>
            </div>
            <div className="spatial-dossier-card">
              <div className="spatial-dossier-title">
                <div>
                  <p>Structure inspector</p>
                  <h2>
                    {selected ? selectedName : "Source-backed 3D preview"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => issueCommand("inspect-footprint")}
                  aria-label="Inspect a building footprint"
                >
                  <ScanSearch size={16} />
                </button>
              </div>
              <ThreeBuildingPreview feature={previewFeature} />
              <div
                className="spatial-source-facts"
                aria-label="Source-backed building facts"
              >
                <span>
                  <small>Visual context</small>
                  <b>Licensed imagery + public 3D context</b>
                </span>
                <span>
                  <small>Geometry record</small>
                  <b>{selected ? selectedRecordType : "Live PostGIS query"}</b>
                </span>
                <span>
                  <small>Evidence source</small>
                  <b>
                    {selected ? selectedSource : "Microsoft / OSM provenance"}
                  </b>
                </span>
                <span>
                  <small>Selected reference</small>
                  <b>
                    {selected ? selectedUlpIn : "Choose a source footprint"}
                  </b>
                </span>
              </div>
              {placeFacts.data && (
                <div
                  className="spatial-institution-evidence"
                  aria-label="Source-aware place facts"
                >
                  <p>Source-aware place facts</p>
                  <div>
                    <b>{placeFacts.data.headline}</b>
                    <span>
                      {placeFacts.data.availability === "source-backed"
                        ? `${placeFacts.data.combinedSourceFootprintAreaSquareMetres.toLocaleString()} m² combined source-footprint area`
                        : "No verified geometry returned"}
                    </span>
                    <small>{placeFacts.data.dataOrigin}</small>
                  </div>
                  <div className="spatial-institution-lock">
                    <b>Unavailable measurements</b>
                    <small>
                      {placeFacts.data.unavailableMeasurements.join(" ")}
                    </small>
                  </div>
                </div>
              )}
              {iitPatnaContext && (
                <div
                  className="spatial-institution-evidence"
                  aria-label="IIT Patna unlinked official building context"
                >
                  <p>Verified institution context</p>
                  {iitPatnaContext.records.map(record => (
                    <div key={record.label}>
                      <a
                        href={record.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {record.label} ↗
                      </a>
                      <span>
                        {record.floors} · {record.builtUpArea}
                      </span>
                      <small>{record.linkage}</small>
                    </div>
                  ))}
                  {iitPatnaContext.lockedRequests.map(record => (
                    <div
                      className="spatial-institution-lock"
                      key={record.label}
                    >
                      <b>{record.label} · authority gate</b>
                      <small>
                        {record.requirement} {record.outcome}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <div
                className="spatial-vertical-profile"
                aria-label="Ordered vertical review profile"
              >
                {verticalLayers.map(layer => (
                  <button
                    type="button"
                    className={`${verticalLayer === layer.id ? "active" : ""} ${layer.id === "surface" ? "live" : "pending"}`}
                    key={layer.id}
                    onClick={() => activateVerticalLayer(layer.id)}
                  >
                    <span>{layer.order}</span>
                    <b>{layer.shortLabel}</b>
                    <i />
                  </button>
                ))}
              </div>
              <div className="spatial-dossier-state">
                <span>
                  Level {activeEvidenceLevel} · {activeEvidence.source}
                </span>
                <strong>
                  {activeEvidenceLevel === 1
                    ? "Public footprint visual only. Add a verified building-height record to unlock the extruded building."
                    : activeEvidenceLevel === 2
                      ? "Verified height unlocks the building extrusion. Add an official floor plan or BIM to unlock floor-by-floor geometry."
                      : "Official floor-plan/BIM evidence supports a floor-by-floor model and vertical ULPIN review."}
                </strong>
              </div>
              <dl>
                <div>
                  <dt>Footprint area</dt>
                  <dd>
                    {selected
                      ? selectedArea
                      : `${searchResult.data?.totalFootprintAreaSquareMetres.toLocaleString() ?? "0"} m²`}
                  </dd>
                </div>
                <div>
                  <dt>3D height</dt>
                  <dd>
                    {selected
                      ? selectedHeight
                      : `${searchResult.data?.approvedHeightCount ?? 0} approved`}
                  </dd>
                </div>
                <div>
                  <dt>Floor plan / BIM</dt>
                  <dd>
                    {hasOfficialFloorPlan
                      ? "Official evidence"
                      : "Not attached"}
                  </dd>
                </div>
                <div>
                  <dt>Ownership</dt>
                  <dd>
                    {selected?.properties.ownershipLinked
                      ? "Authority-linked"
                      : "No inferred ownership"}
                  </dd>
                </div>
              </dl>
              {selected && (
                <button
                  className="spatial-correct-button"
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/?editor=${encodeURIComponent(selected.ulpin)}`
                    )
                  }
                >
                  Review source record
                </button>
              )}
            </div>
            <div className="spatial-dossier-card spatial-layer-panel">
              <div className="spatial-dossier-title">
                <div>
                  <p>Spatial layers</p>
                  <h2>{activeLayerCount} of 4 active</h2>
                </div>
                <Layers3 size={17} />
              </div>
              {layerOptions.map(layer => (
                <label key={layer.key}>
                  <span style={{ background: layer.color }} />
                  <b>{layer.label}</b>
                  <input
                    type="checkbox"
                    checked={layers[layer.key]}
                    onChange={() =>
                      setLayers(current => ({
                        ...current,
                        [layer.key]: !current[layer.key],
                      }))
                    }
                  />
                  <i />
                </label>
              ))}
            </div>
            <div className="spatial-source-note">
              <ShieldAlert size={15} />
              <span>
                <strong>
                  {osmBuildingsReady
                    ? "OSM 3D context available"
                    : "Source-footprint mode"}
                </strong>
                <span className="source-note-muted">
                  {osmBuildingsReady
                    ? "OpenStreetMap-derived 3D buildings provide visual context around the selected place."
                    : "Only the source-footprint layer is presently populated from live public geometry."}{" "}
                  <b>They are not cadastral evidence.</b>
                </span>
                <span className="source-note-muted">
                  Building height, floors, rights, utilities, ownership, and
                  cadastral status require separate authority evidence.
                </span>
              </span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
