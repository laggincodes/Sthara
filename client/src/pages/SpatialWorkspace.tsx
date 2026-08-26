import {
  CesiumSpatialViewer,
  type CesiumLayerFlags,
  type MapCommand,
  type SampleMapAsset,
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
  FileDown,
  Layers3,
  Maximize2,
  Minus,
  Plus,
  ScanSearch,
  Settings2,
  ShieldAlert,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

type SelectedFeature = { ulpin: string; properties: Record<string, unknown> };
type DemoRole = "citizen" | "surveyor" | "authority";

const demoRoleDetails: Record<
  DemoRole,
  { label: string; summary: string; access: string }
> = {
  citizen: {
    label: "Citizen",
    summary: "Explore published source footprints and demo records.",
    access: "Public source context · no ownership or rights access",
  },
  surveyor: {
    label: "Surveyor",
    summary: "Review measurement and evidence-intake workflows.",
    access: "Survey workflow preview · authority evidence still required",
  },
  authority: {
    label: "Authority",
    summary: "Review evidence gates and authority-review pathways.",
    access: "Review pathway preview · real authorization remains separate",
  },
};

const mockApprovalRequests = [
  {
    id: "MOCK-REQ-204",
    label: "Illustrative multi-storey review",
    submitted: "Demo queue · no real applicant",
  },
  {
    id: "MOCK-REQ-205",
    label: "Illustrative source-link review",
    submitted: "Demo queue · no real applicant",
  },
] as const;

type MockRecord = {
  id: string;
  sourceRecordId: string;
  propertyName: string;
  ownership: string;
  verticalRights: string;
  propertyType: string;
  createdAt: number;
};

const mockPropertyTypeColors: Record<string, string> = {
  "Multi-storey source building": "#72e3df",
  "Campus facility": "#b48cff",
  "Residential apartment": "#f5c66b",
  "Commercial property": "#7de1aa",
};

function mockPropertyTypeColor(propertyType: string) {
  return (
    mockPropertyTypeColors[propertyType] ??
    ["#72e3df", "#b48cff", "#f5c66b", "#7de1aa"][propertyType.length % 4]
  );
}

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
  const comparisonUlpins = (queryParameters.get("compare") ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 2);
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
  const [mockRecords, setMockRecords] = useState<MockRecord[]>([]);
  const [mockRecordQuery, setMockRecordQuery] = useState("");
  const [mockRecordFilter, setMockRecordFilter] = useState<
    "all" | "ulpin" | "ownership"
  >("all");
  const [groupMockRecords, setGroupMockRecords] = useState(false);
  const [sourceMapView, setSourceMapView] = useState<"2d" | "3d">("3d");
  const [mockUlpIn, setMockUlpIn] = useState<string | null>(null);
  const [selectedMockFloor, setSelectedMockFloor] = useState<number | null>(
    null
  );
  const [hoveredMockFloor, setHoveredMockFloor] = useState<number | null>(null);
  const [demoRole, setDemoRole] = useState<DemoRole>("citizen");
  const [reviewedMockRequest, setReviewedMockRequest] = useState<string | null>(
    null
  );
  const [sampleAsset, setSampleAsset] = useState<SampleMapAsset | null>(null);
  const [sampleAssetError, setSampleAssetError] = useState<string | null>(null);
  const [sampleUploadProgress, setSampleUploadProgress] = useState<
    number | null
  >(null);
  const [isSampleDragging, setIsSampleDragging] = useState(false);
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
  const activeMapUlpins =
    comparisonUlpins.length > 0
      ? comparisonUlpins
      : (searchResult.data?.matchedUlpins ?? []);
  const comparisonSourceRecords = useMemo(
    () =>
      comparisonUlpins
        .map(ulpin =>
          liveGeometry.data?.features.find(
            feature => feature.properties.ulpin === ulpin
          )
        )
        .filter(
          (
            feature
          ): feature is NonNullable<
            typeof liveGeometry.data
          >["features"][number] => Boolean(feature)
        ),
    [comparisonUlpins, liveGeometry.data]
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
    setMockUlpIn(null);
  }, [requestedSite]);

  useEffect(() => {
    return () => {
      if (sampleAsset?.url.startsWith("blob:")) {
        URL.revokeObjectURL(sampleAsset.url);
      }
    };
  }, [sampleAsset]);

  const canViewMockOwnership = demoRole === "authority";
  const filteredMockRecords = useMemo(() => {
    const query = mockRecordQuery.trim().toLowerCase();
    return mockRecords.filter(record => {
      const matchesQuery =
        !query ||
        [
          record.id,
          record.sourceRecordId,
          record.propertyName,
          ...(canViewMockOwnership ? [record.ownership] : []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesFilter =
        mockRecordFilter === "all" ||
        (mockRecordFilter === "ulpin" && record.id.startsWith("MOCK-3D-")) ||
        (mockRecordFilter === "ownership" &&
          canViewMockOwnership &&
          record.ownership.length > 0);
      return matchesQuery && matchesFilter;
    });
  }, [canViewMockOwnership, mockRecordFilter, mockRecordQuery, mockRecords]);

  const groupedMockRecords = useMemo(() => {
    return filteredMockRecords.reduce<Record<string, MockRecord[]>>(
      (groups, record) => {
        (groups[record.propertyType] ??= []).push(record);
        return groups;
      },
      {}
    );
  }, [filteredMockRecords]);

  const generateMockUlpIn = () => {
    if (!selected) return;
    const slug = selected.ulpin
      .replace(/[^a-z0-9]+/gi, "")
      .slice(-8)
      .toUpperCase();
    const id = `MOCK-3D-${slug || "SOURCE"}-${Date.now().toString(36).toUpperCase()}`;
    const record: MockRecord = {
      id,
      sourceRecordId: selected.ulpin,
      propertyName: selectedName,
      ownership: "Demo placeholder · not supplied",
      verticalRights: "Illustrative apartment envelope",
      propertyType:
        typeof selected.properties.propertyType === "string"
          ? selected.properties.propertyType
          : "Multi-storey source building",
      createdAt: Date.now(),
    };
    setMockUlpIn(id);
    setMockRecords(records => [record, ...records]);
  };

  const exportMockDetailsPdf = async () => {
    const record =
      mockRecords.find(item => item.id === mockUlpIn) ?? mockRecords[0];
    if (!record) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    let cursorY = 58;
    const addWrapped = (text: string, size = 10, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, 490) as string[];
      pdf.text(lines, 52, cursorY);
      cursorY += lines.length * (size + 5) + 9;
    };
    addWrapped("3D ULPIN-VPM · Mock identity and rights report", 16, true);
    addWrapped("DEMO / NON-AUTHORITATIVE", 11, true);
    addWrapped(`Sample 3D ULPIN: ${record.id}`, 12, true);
    addWrapped(`Source record: ${record.sourceRecordId}`);
    addWrapped(`Property label: ${record.propertyName}`);
    addWrapped(`Mock ownership: ${record.ownership}`);
    addWrapped(`Mock vertical rights: ${record.verticalRights}`);
    addWrapped(`Created: ${new Date(record.createdAt).toLocaleString()}`);
    cursorY += 12;
    addWrapped(
      "These fields are illustrative demo values only. This PDF does not create an official ULPIN, prove ownership, establish a legal vertical right, or replace cadastral, survey, or authority evidence.",
      10,
      true
    );
    pdf.save("ulpin-vpm-mock-identity-rights-report.pdf");
  };

  const processSampleAsset = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isFloorPlan =
      file.type === "application/pdf" ||
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      extension === "pdf" ||
      extension === "png" ||
      extension === "jpg" ||
      extension === "jpeg";
    const isModel =
      file.type === "model/gltf-binary" ||
      file.type === "model/gltf+json" ||
      extension === "glb" ||
      extension === "gltf";
    if (!isFloorPlan && !isModel) {
      setSampleAssetError("Choose a PNG, JPG, PDF, GLB, or GLTF sample file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSampleAssetError("Sample files must be 25 MB or smaller.");
      return;
    }
    setSampleAssetError(null);
    setSampleUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = event => {
      if (event.lengthComputable) {
        setSampleUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onerror = () => {
      setSampleUploadProgress(null);
      setSampleAssetError("The sample file could not be read in this browser.");
    };
    reader.onload = () => {
      setSampleAsset({
        kind: isModel ? "model" : "floor-plan",
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        mimeType:
          file.type || (isModel ? "model/gltf-binary" : "application/pdf"),
      });
      setSampleUploadProgress(100);
      window.setTimeout(() => setSampleUploadProgress(null), 700);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSampleAssetUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) processSampleAsset(file);
  };

  const handleSampleAssetDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsSampleDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processSampleAsset(file);
  };

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
        <Link href="/overview" className="spatial-brand">
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
          <button type="button" onClick={() => setLocation("/overview")}>
            <Layers3 size={17} /> Command home
          </button>
          <button
            type="button"
            onClick={() => setLocation("/ulpin-registry")}
          >
            <ShieldCheck size={17} /> ULPIN registry
          </button>
        </div>
        <div className="spatial-rail-group">
          <p>Data operations</p>
          <button
            type="button"
            onClick={() => setLocation("/overview?workspace=Data%20ingestion")}
          >
            <Database size={17} /> Data ingestion
          </button>
          <button
            type="button"
            onClick={() =>
              setLocation("/overview?workspace=Processing%20queue")
            }
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
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
        </header>

        <div className="spatial-model-layout">
          <div className="spatial-map-column">
            <section className="spatial-model-stage">
              <CesiumSpatialViewer
                command={command}
                layers={layers}
                focusUlpins={activeMapUlpins}
                sourceMapView={sourceMapView}
                mockFloorLevels={activeMapUlpins.length > 0 ? 4 : 0}
                measurementControlsOnly
                onFeatureSelect={onFeatureSelect}
                onMockFloorSelect={setSelectedMockFloor}
                onMockFloorHover={setHoveredMockFloor}
                sampleAsset={sampleAsset}
              />
              <div className="spatial-stage-grid" />
              <div className="spatial-stage-vignette" />
            </section>

            <section
              className="spatial-below-map"
              aria-label="Map details and actions"
            >
              <div className="spatial-stage-heading">
                <p>{explorer.stageLabel}</p>
                <h1>
                  {comparisonUlpins.length === 2
                    ? "Comparing two source-record geometries"
                    : resolveBuilding.isPending || searchResult.isLoading
                      ? "Finding source-backed geometry…"
                      : (searchResult.data?.buildingCount ?? 0) > 0
                        ? searchResult.data?.siteLabel
                        : explorer.noResultLabel}
                </h1>
                <span>
                  <CircleDot size={13} />{" "}
                  {comparisonUlpins.length === 2
                    ? "2 source records selected · combined camera extent · not issued ULPINs"
                    : (searchResult.data?.buildingCount ?? 0) > 0
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
              <div
                className="spatial-view-toggle"
                role="group"
                aria-label="Source record map view"
              >
                <span>Map view</span>
                {(["2d", "3d"] as const).map(view => (
                  <button
                    type="button"
                    key={view}
                    className={sourceMapView === view ? "active" : ""}
                    onClick={() => setSourceMapView(view)}
                    aria-pressed={sourceMapView === view}
                  >
                    {view.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="spatial-demo-floor-note">
                {selected
                  ? "4 mock floor levels shown in 3D only · illustrative stack · not an approved floor plan"
                  : "Select a source footprint to preview mock floor levels in 3D"}
              </p>
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
                        `/overview?workspace=Data%20ingestion&site=${encodeURIComponent(siteQuery)}`
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
                          ? `/overview?editor=${encodeURIComponent(selected.ulpin)}`
                          : "/overview?workspace=Operator%20access"
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
          </div>

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
            {comparisonUlpins.length === 2 && (
              <section
                className="spatial-comparison-panel"
                aria-label="Side-by-side source record comparison"
              >
                <header>
                  <span>Side-by-side source record comparison</span>
                  <button
                    type="button"
                    onClick={() => setLocation("/ulpin-registry")}
                  >
                    Back to Registry
                  </button>
                </header>
                {comparisonSourceRecords.length === 2 ? (
                  <div>
                    {comparisonSourceRecords.map((record, index) => {
                      const properties = record.properties;
                      const name =
                        typeof properties.name === "string"
                          ? properties.name
                          : "Source record";
                      const sourceId =
                        typeof properties.ulpin === "string"
                          ? properties.ulpin
                          : comparisonUlpins[index];
                      const area =
                        typeof properties.footprintAreaSquareMetres === "number"
                          ? `${properties.footprintAreaSquareMetres.toLocaleString()} m²`
                          : "Area unavailable";
                      const provenance =
                        typeof properties.source === "string"
                          ? properties.source
                          : "Source feed provenance not exposed";
                      return (
                        <article key={sourceId}>
                          <span>Record {index + 1} · source context only</span>
                          <h2>{name}</h2>
                          <small>{sourceId}</small>
                          <dl>
                            <div>
                              <dt>Footprint area</dt>
                              <dd>{area}</dd>
                            </div>
                            <div>
                              <dt>Provenance</dt>
                              <dd>{provenance}</dd>
                            </div>
                            <div>
                              <dt>History / ownership / height</dt>
                              <dd>Not inferred from this source record</dd>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p>
                    Loading the two requested source records. No missing
                    geometry, history, ownership, height, or ULPIN is inferred.
                  </p>
                )}
              </section>
            )}
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

        <section
          className="spatial-dossier-card spatial-demo-tools"
          aria-label="Demo identity and sample model tools"
        >
          <div className="spatial-dossier-title">
            <div>
              <p>Prototype tools</p>
              <h2>3D identity &amp; rights demo</h2>
            </div>
            <ShieldAlert size={17} />
          </div>
          <div className="spatial-demo-warning">
            <b>DEMO / NON-AUTHORITATIVE</b>
            <span>
              These values demonstrate the workflow only. They are not an issued
              ULPIN, ownership record, cadastral right, or survey.
            </span>
          </div>
          <div className="spatial-demo-identity">
            <div>
              <small>Selected source record</small>
              <strong>
                {selected ? selected.ulpin : "Select a live footprint"}
              </strong>
            </div>
            <button
              type="button"
              disabled={!selected}
              onClick={generateMockUlpIn}
            >
              <ShieldCheck size={13} /> Generate mock 3D ULPIN
            </button>
            {mockUlpIn && (
              <div className="spatial-mock-id" role="status">
                <small>Sample identifier · not issued</small>
                <strong>{mockUlpIn}</strong>
              </div>
            )}
            <button
              type="button"
              className="spatial-pdf-button"
              disabled={mockRecords.length === 0}
              onClick={() => void exportMockDetailsPdf()}
            >
              <FileDown size={13} /> Export mock details PDF
            </button>
          </div>
          <div
            className="spatial-mock-records"
            aria-label="Mock record search and filters"
          >
            <div className="spatial-mock-records-heading">
              <p>Mock record finder</p>
              <span>{filteredMockRecords.length} shown</span>
            </div>
            <input
              value={mockRecordQuery}
              onChange={event => setMockRecordQuery(event.target.value)}
              placeholder="Search mock ID, source, or ownership"
              aria-label="Search mock ULPIN and ownership records"
            />
            <div
              className="spatial-mock-filter-row"
              role="group"
              aria-label="Filter mock records"
            >
              {(["all", "ulpin", "ownership"] as const).map(filter => (
                <button
                  type="button"
                  key={filter}
                  className={mockRecordFilter === filter ? "active" : ""}
                  onClick={() => setMockRecordFilter(filter)}
                  disabled={filter === "ownership" && !canViewMockOwnership}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "ulpin"
                      ? "Mock ULPINs"
                      : "Ownership"}
                </button>
              ))}
            </div>
            <small className="spatial-role-visibility" role="status">
              {canViewMockOwnership
                ? "Authority demo view: mock ownership placeholders are visible for review."
                : `${demoRoleDetails[demoRole].label} demo view: mock ownership placeholders are hidden.`}
            </small>
            <div
              className="spatial-property-type-legend"
              aria-label="Property type legend"
            >
              <span>Property type legend</span>
              {Object.entries(mockPropertyTypeColors).map(([type, color]) => (
                <i key={type}>
                  <b
                    className="spatial-property-type-dot"
                    style={{ background: color }}
                  />
                  {type}
                </i>
              ))}
            </div>
            {filteredMockRecords.length > 0 && (
              <div className="spatial-mock-record-list">
                {groupMockRecords
                  ? Object.entries(groupedMockRecords).map(
                      ([group, records]) => (
                        <section
                          key={group}
                          className="spatial-mock-record-group"
                        >
                          <b className="spatial-mock-record-group-label">
                            <span
                              className="spatial-property-type-dot"
                              style={{
                                background: mockPropertyTypeColor(group),
                              }}
                            />
                            {group}
                          </b>
                          {records.slice(0, 5).map(record => (
                            <button
                              type="button"
                              key={record.id}
                              className={
                                mockUlpIn === record.id ? "active" : ""
                              }
                              onClick={() => setMockUlpIn(record.id)}
                            >
                              <strong>{record.id}</strong>
                              <span>
                                <i
                                  className="spatial-property-type-dot"
                                  style={{
                                    background: mockPropertyTypeColor(
                                      record.propertyType
                                    ),
                                  }}
                                />
                                {record.propertyName} ·{" "}
                                {canViewMockOwnership
                                  ? record.ownership
                                  : "Ownership placeholder hidden"}
                              </span>
                            </button>
                          ))}
                        </section>
                      )
                    )
                  : filteredMockRecords.slice(0, 5).map(record => (
                      <button
                        type="button"
                        key={record.id}
                        className={mockUlpIn === record.id ? "active" : ""}
                        onClick={() => setMockUlpIn(record.id)}
                      >
                        <strong>{record.id}</strong>
                        <span>
                          <i
                            className="spatial-property-type-dot"
                            style={{
                              background: mockPropertyTypeColor(
                                record.propertyType
                              ),
                            }}
                          />
                          {record.propertyName} ·{" "}
                          {canViewMockOwnership
                            ? record.ownership
                            : "Ownership placeholder hidden"}
                        </span>
                      </button>
                    ))}
              </div>
            )}
            <button
              type="button"
              className={`spatial-group-toggle${groupMockRecords ? " active" : ""}`}
              onClick={() => setGroupMockRecords(value => !value)}
              aria-pressed={groupMockRecords}
            >
              {groupMockRecords
                ? "Grouped by property type"
                : "Group by property type"}
            </button>
          </div>
          <div
            className="spatial-role-simulation"
            aria-label="Demo role simulation"
          >
            <div className="spatial-rights-heading">
              <div>
                <span className="spatial-kicker">Demo access simulation</span>
                <p>Role-based ULPIN data view</p>
              </div>
              <ShieldCheck size={16} />
            </div>
            <small>
              Illustrates role-specific screens only; it does not authenticate
              users or grant rights.
            </small>
            <div
              className="spatial-role-buttons"
              role="group"
              aria-label="Simulated user role"
            >
              {(Object.keys(demoRoleDetails) as DemoRole[]).map(role => (
                <button
                  type="button"
                  key={role}
                  className={demoRole === role ? "active" : ""}
                  onClick={() => setDemoRole(role)}
                  aria-pressed={demoRole === role}
                >
                  {demoRoleDetails[role].label}
                </button>
              ))}
            </div>
            <div className="spatial-role-status">
              <strong>
                {demoRoleDetails[demoRole].label} view · demo only
              </strong>
              <span>{demoRoleDetails[demoRole].summary}</span>
              <em>{demoRoleDetails[demoRole].access}</em>
            </div>
            {demoRole === "authority" && (
              <div className="spatial-approval-queue" aria-live="polite">
                <div>
                  <span className="spatial-kicker">Authority demo queue</span>
                  <b>Mock ULPIN approval requests</b>
                </div>
                <small>
                  Simulated review items only; no real applicant, approval, or
                  record change is created.
                </small>
                {mockApprovalRequests.map(request => (
                  <section key={request.id}>
                    <div>
                      <strong>{request.id}</strong>
                      <span>{request.label}</span>
                      <em>{request.submitted}</em>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewedMockRequest(request.id)}
                    >
                      {reviewedMockRequest === request.id
                        ? "Reviewed · demo"
                        : "Review mock request"}
                    </button>
                  </section>
                ))}
              </div>
            )}
          </div>
          <div className="spatial-floor-detail" aria-live="polite">
            <div className="spatial-rights-heading">
              <div>
                <span className="spatial-kicker">Interactive mock layer</span>
                <p>
                  {selectedMockFloor
                    ? `Floor ${selectedMockFloor} detail`
                    : "Floor-level detail"}
                </p>
              </div>
              <Layers3 size={16} />
            </div>
            <small>
              {selectedMockFloor
                ? `Illustrative data for mock floor ${selectedMockFloor}; not an authority-linked apartment record.`
                : "Click a labeled DEMO LEVEL in the 3D map to inspect its illustrative rights state."}
            </small>
            <dl>
              <div>
                <dt>Floor identity</dt>
                <dd>
                  {selectedMockFloor
                    ? `MOCK-FLOOR-${selectedMockFloor}`
                    : "Not selected"}
                </dd>
              </div>
              <div>
                <dt>Ownership</dt>
                <dd>
                  {selectedMockFloor
                    ? "Demo placeholder · not supplied"
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Rights status</dt>
                <dd>Mock only · authority record required</dd>
              </div>
            </dl>
          </div>
          <div
            className="spatial-mock-rights"
            aria-label="Mock ownership and vertical rights"
          >
            <div className="spatial-rights-heading">
              <div>
                <span className="spatial-kicker">Prototype data panel</span>
                <p>Mock apartment ownership &amp; vertical rights</p>
              </div>
              <ShieldAlert size={16} />
            </div>
            <small className="spatial-rights-note">
              Illustrative fields for the vertical-cadastre concept. These are
              not government ownership or rights records.
            </small>
            <dl>
              <div>
                <dt>Ownership</dt>
                <dd>
                  {selected
                    ? "Demo placeholder · not supplied"
                    : "Select a source record"}
                </dd>
              </div>
              <div>
                <dt>Vertical volume</dt>
                <dd>
                  {selected ? "Illustrative apartment envelope" : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Rights status</dt>
                <dd>Mock only · authority record required</dd>
              </div>
            </dl>
          </div>
          <div className="spatial-sample-upload">
            <div>
              <p>Sample floor plan / 3D model</p>
              <small>Browser-local preview only · max 25 MB</small>
            </div>
            <div
              className={`spatial-upload-dropzone${isSampleDragging ? " is-dragging" : ""}`}
              onDragOver={event => {
                event.preventDefault();
                setIsSampleDragging(true);
              }}
              onDragLeave={() => setIsSampleDragging(false)}
              onDrop={handleSampleAssetDrop}
            >
              <Upload size={15} />
              <span>Drop a sample here or</span>
              <label className="spatial-upload-button">
                Browse files
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.glb,.gltf,application/pdf,image/png,image/jpeg,model/gltf-binary,model/gltf+json"
                  onChange={handleSampleAssetUpload}
                />
              </label>
            </div>
            {sampleUploadProgress !== null && (
              <div className="spatial-upload-progress" role="status">
                <div>
                  <span>Reading sample locally</span>
                  <b>{sampleUploadProgress}%</b>
                </div>
                <i>
                  <em style={{ width: `${sampleUploadProgress}%` }} />
                </i>
              </div>
            )}
            {sampleAsset && (
              <div className="spatial-sample-file" role="status">
                <strong>{sampleAsset.name}</strong>
                <span>
                  {sampleAsset.kind === "model" ? "3D model" : "Floor plan"} ·{" "}
                  {(sampleAsset.size / 1024 / 1024).toFixed(2)} MB · visible on
                  map
                </span>
              </div>
            )}
            {sampleAssetError && (
              <small className="spatial-sample-error" role="alert">
                {sampleAssetError}
              </small>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
