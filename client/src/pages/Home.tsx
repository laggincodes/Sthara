/**
 * Cadastral Blueprint design reminder: treat this as an expert spatial instrument.
 * Midnight slate, datum cyan, drafting lines, asymmetrical command-rail composition.
 */
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Box,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  FileDown,
  FileUp,
  FileJson,
  FileText,
  Grid3X3,
  Layers3,
  Loader2,
  MapPinned,
  Maximize2,
  Menu,
  MoreHorizontal,
  PanelRightOpen,
  Play,
  Plus,
  Search,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CesiumSpatialViewer,
  type MapCommand,
} from "@/components/CesiumSpatialViewer";
import { EvidenceLockBadge } from "@/components/EvidenceLockBadge";
import { startLogin } from "@/const";
import {
  REVISION_NOTE_MINIMUM_LENGTH,
  validateRevisionNote,
} from "../../../shared/authorityEditValidation";
import {
  getEditablePolygonVertices,
  replacePolygonVertex,
} from "../../../shared/footprintGeometryEditing";
import academicBlock4Evidence from "../../../submission/academic-block-4-institutional-evidence.json";
import kusumSureshEnclaveEvidence from "../../../submission/kusum-suresh-enclave-rera-evidence.json";
import { buildAcademicBlock4PdfLines } from "../../../shared/academicBlock4PdfContent";
import {
  getMapEvidenceFilterLabel,
  type MapEvidenceFilter,
} from "../../../shared/evidenceMapFilter";
import { filterIitPatnaAutocomplete } from "../../../shared/iitPatnaAutocomplete";
import { useLocation } from "wouter";

type LayerKey = "parcels" | "buildings" | "utilities" | "terrain";

const navItems: { icon: LucideIcon; label: string; caption?: string }[] = [
  { icon: Grid3X3, label: "Mission control" },
  { icon: MapPinned, label: "3D workspace" },
  { icon: Box, label: "Parcels", caption: "1,248" },
  { icon: Building2, label: "Buildings", caption: "342" },
  { icon: Layers3, label: "Property volumes" },
  { icon: ShieldCheck, label: "ULPIN registry" },
];

const dataItems: { icon: LucideIcon; label: string; caption?: string }[] = [
  { icon: FileUp, label: "Data ingestion", caption: "3" },
  { icon: Database, label: "Processing queue" },
];

const towerFloors = Array.from({ length: 8 }, (_, index) => 8 - index);

const layers: { key: LayerKey; label: string; color: string }[] = [
  { key: "parcels", label: "Parcel edges", color: "#2ad4d9" },
  { key: "buildings", label: "Building volumes", color: "#7de1aa" },
  { key: "utilities", label: "Underground utilities", color: "#eba760" },
  { key: "terrain", label: "Terrain contour", color: "#d8e2de" },
];

const panelMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-mark ${className}`}
      src="/manus-storage/ulpin-logo-mark_5177b8d0.png"
      alt="3D ULPIN-VPM"
    />
  );
}

function SmallBadge({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "green" | "amber" | "slate";
}) {
  return <span className={`small-badge ${tone}`}>{children}</span>;
}

function StatCard({
  label,
  value,
  detail,
  trend,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  color: "cyan" | "green" | "amber";
}) {
  return (
    <motion.article
      className="metric-card"
      {...panelMotion}
      transition={{ duration: 0.35 }}
    >
      <div className="metric-label">
        <span className={`status-dot ${color}`} /> {label}
      </div>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {trend && (
          <SmallBadge
            tone={
              color === "green" ? "green" : color === "amber" ? "amber" : "cyan"
            }
          >
            {trend}
          </SmallBadge>
        )}
      </div>
      <p>{detail}</p>
    </motion.article>
  );
}

function NavGroup({
  items,
  active,
  onSelect,
}: {
  items: { icon: LucideIcon; label: string; caption?: string }[];
  active: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="nav-group">
      {items.map(item => {
        const Icon = item.icon;
        const selected = active === item.label;
        return (
          <button
            className={`nav-item ${selected ? "active" : ""}`}
            key={item.label}
            onClick={() => onSelect(item.label)}
            type="button"
          >
            <Icon size={17} strokeWidth={selected ? 2.3 : 1.8} />
            <span>{item.label}</span>
            {item.caption && <em>{item.caption}</em>}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeNav, setActiveNav] = useState("Mission control");
  const [activeFloor, setActiveFloor] = useState(4);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"geojson" | "floorplan">(
    "geojson"
  );
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState<string | null>(null);
  const [mapCommand, setMapCommand] = useState<MapCommand>(null);
  const [selectedLiveFeature, setSelectedLiveFeature] = useState<{
    ulpin: string;
    properties: Record<string, unknown>;
  } | null>(null);
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [areaSearchRequest, setAreaSearchRequest] = useState<string | null>(
    null
  );
  const [placeSearchRationale, setPlaceSearchRationale] = useState<
    string | null
  >(null);
  const [evidenceFilter, setEvidenceFilter] =
    useState<MapEvidenceFilter>("all");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const resolvedWorkspaceSite =
    areaSearchQuery.trim() || "Amity University Patna";
  const [sourceGeometry, setSourceGeometry] = useState("");
  const [editorForm, setEditorForm] = useState({
    geometry: "",
    approvedHeightMetres: "",
    heightSource: "",
    parcelReference: "",
    ulpinRecord: "",
    ownerName: "",
    ownershipBasis: "",
    rightsSummary: "",
    sourceReference: "",
    editorName: "Authority operator",
    editNote: "",
  });
  const [authorityNoteError, setAuthorityNoteError] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiSearch = trpc.cadastre.search.useMutation();
  const cadastreUpload = trpc.cadastre.upload.useMutation();
  const geometryQuery = trpc.postgis.geojson.useQuery(undefined, {
    refetchInterval: 20_000,
  });
  const authQuery = trpc.auth.me.useQuery();
  const areaSearchInput = useMemo(
    () => ({ query: areaSearchRequest ?? "Amity University Patna" }),
    [areaSearchRequest]
  );
  const areaSearch = trpc.postgis.areaSearch.useQuery(areaSearchInput, {
    enabled: Boolean(areaSearchRequest),
  });
  const placeFacts = trpc.postgis.placeFacts.useQuery(areaSearchInput, {
    enabled: Boolean(areaSearchRequest),
  });
  const resolvePlace = trpc.postgis.resolveBuilding.useMutation();
  const footprintUpdate = trpc.postgis.updateFootprint.useMutation();
  const trpcUtils = trpc.useUtils();
  const [layersOn, setLayersOn] = useState<Record<LayerKey, boolean>>({
    parcels: true,
    buildings: true,
    utilities: true,
    terrain: true,
  });

  useEffect(() => {
    const requestedWorkspace = new URLSearchParams(window.location.search).get(
      "workspace"
    );
    if (!requestedWorkspace) return;
    if (
      requestedWorkspace === "ULPIN registry" ||
      requestedWorkspace === "Parcels"
    ) {
      setSearchQuery(
        requestedWorkspace === "Parcels"
          ? "Find parcel records"
          : "Find a 3D ULPIN record"
      );
      setSearchOpen(true);
    } else if (
      requestedWorkspace === "Data ingestion" ||
      requestedWorkspace === "Processing queue"
    ) {
      setUploadOpen(true);
    } else {
      setWorkspaceOpen(requestedWorkspace);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const activeLayerCount = useMemo(
    () => Object.values(layersOn).filter(Boolean).length,
    [layersOn]
  );
  const liveProperty = selectedLiveFeature?.properties;
  const liveFeatureName =
    typeof liveProperty?.name === "string"
      ? liveProperty.name
      : "Selected PostGIS footprint";
  const liveFeatureSource =
    typeof liveProperty?.source === "string"
      ? liveProperty.source
      : "Neon PostGIS";
  const liveFeatureLicense =
    typeof liveProperty?.sourceLicense === "string"
      ? liveProperty.sourceLicense
      : "Source metadata unavailable";
  const liveFeatureConfidence =
    typeof liveProperty?.confidence === "number"
      ? `${Math.round(liveProperty.confidence * 100)}%`
      : "Not supplied";
  const liveFeatureDistance =
    typeof liveProperty?.centroidDistanceMetres === "number"
      ? `${liveProperty.centroidDistanceMetres} m from campus reference`
      : "Coordinate reference available";
  const selectedOwnership =
    liveProperty?.ownershipData &&
    typeof liveProperty.ownershipData === "object" &&
    !Array.isArray(liveProperty.ownershipData)
      ? (liveProperty.ownershipData as Record<string, unknown>)
      : {};
  const liveFootprintArea =
    typeof liveProperty?.footprintAreaSquareMetres === "number"
      ? `${liveProperty.footprintAreaSquareMetres.toLocaleString()} m²`
      : "Area awaiting calculation";
  const liveFeatureHeight =
    typeof liveProperty?.approvedHeightMetres === "number"
      ? `${liveProperty.approvedHeightMetres} m approved`
      : "Height not approved";
  const liveFootprintCount = geometryQuery.data?.features.length ?? 0;
  const selectedSiteArea = useMemo(() => {
    const features = geometryQuery.data?.features ?? [];
    return (
      Math.round(
        features.reduce(
          (sum, feature) =>
            sum +
            (typeof feature.properties.footprintAreaSquareMetres === "number"
              ? feature.properties.footprintAreaSquareMetres
              : 0),
          0
        ) * 100
      ) / 100
    );
  }, [geometryQuery.data]);
  const canSaveAuthorityRecord = authQuery.data?.role === "admin";
  const revisionNoteValidation = validateRevisionNote(editorForm.editNote);
  const validateAuthorityRevisionNote = () => {
    if (revisionNoteValidation.valid) {
      setAuthorityNoteError(null);
      return true;
    }
    setAuthorityNoteError(revisionNoteValidation.message);
    toast.error("Revision note is required", {
      description: revisionNoteValidation.message,
    });
    return false;
  };
  const requestAuthoritySignIn = () => {
    if (!selectedLiveFeature) return;
    if (!validateAuthorityRevisionNote()) return;
    if (canSaveAuthorityRecord) {
      saveFootprintCorrection();
      return;
    }
    if (authQuery.data) {
      toast.error("Administrator access is required", {
        description:
          "This account is signed in but does not have the administrator role required to approve geometry, height, or ownership evidence.",
      });
      return;
    }
    window.sessionStorage.setItem(
      "ulpin:resume-authority-editor",
      selectedLiveFeature.ulpin
    );
    toast.message("Opening secure administrator sign-in", {
      description:
        "You will return to this footprint correction form after signing in.",
    });
    window.setTimeout(() => startLogin(), 150);
  };
  useEffect(() => {
    const resumeUlpin = window.sessionStorage.getItem(
      "ulpin:resume-authority-editor"
    );
    if (!resumeUlpin || !authQuery.data) return;
    window.sessionStorage.removeItem("ulpin:resume-authority-editor");
    const url = new URL(window.location.href);
    url.searchParams.set("editor", resumeUlpin);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [authQuery.data]);
  const editableVertices = useMemo(
    () => getEditablePolygonVertices(editorForm.geometry),
    [editorForm.geometry]
  );
  const displayedLayerCount = areaSearch.data
    ? areaSearch.data.buildingCount
    : liveFootprintCount;
  const displayedSiteArea = areaSearch.data
    ? areaSearch.data.totalFootprintAreaSquareMetres
    : selectedSiteArea;
  const hasFocusedSearchGeometry = Boolean(
    areaSearch.data && areaSearch.data.buildingCount > 0
  );
  const academicBlock4 = academicBlock4Evidence.academicBlock4;
  const kusumSureshEnclave = kusumSureshEnclaveEvidence.kusumSureshEnclave;
  const reraEndpointReference = useMemo(
    () => ({
      latitude: kusumSureshEnclave.endpointReference.latitude,
      longitude: kusumSureshEnclave.endpointReference.longitude,
      label: "Bihar RERA endpoint · KUSUM SURESH ENCLAVE",
      detail: kusumSureshEnclave.endpointReference.mapUse,
    }),
    [kusumSureshEnclave]
  );
  const autocompleteSuggestions = useMemo(
    () => filterIitPatnaAutocomplete(areaSearchQuery),
    [areaSearchQuery]
  );
  useEffect(() => {
    if (!areaSearch.data || areaSearch.data.query !== areaSearchRequest) return;
    setMapCommand({ kind: "focus-site", nonce: Date.now() });
    toast.success("Layered 3D search result ready", {
      description: `${areaSearch.data.buildingCount} matching building layers · ${areaSearch.data.totalFootprintAreaSquareMetres.toLocaleString()} m² footprint area.`,
    });
  }, [areaSearch.data, areaSearchRequest]);
  const onMapFeatureSelect = useCallback(
    (feature: { ulpin: string; properties: Record<string, unknown> }) => {
      setSelectedLiveFeature(feature);
      toast.success(`Selected ${feature.ulpin}`, {
        description:
          "Live PostGIS footprint metadata loaded into the property inspector.",
      });
      setDetailOpen(true);
    },
    []
  );
  const openFootprintEditor = (featureToEdit = selectedLiveFeature) => {
    const geometry = geometryQuery.data?.features.find(
      feature => feature.properties.ulpin === featureToEdit?.ulpin
    )?.geometry;
    if (!featureToEdit || !geometry) {
      toast.error("Select a live building footprint first", {
        description:
          "Choose a building in the Cesium viewer to load its editable geometry.",
      });
      return;
    }
    const featureProperties = featureToEdit.properties;
    const ownership =
      featureProperties.ownershipData &&
      typeof featureProperties.ownershipData === "object" &&
      !Array.isArray(featureProperties.ownershipData)
        ? (featureProperties.ownershipData as Record<string, unknown>)
        : {};
    const geometryText = JSON.stringify(geometry, null, 2);
    setSourceGeometry(geometryText);
    setEditorForm({
      geometry: geometryText,
      approvedHeightMetres:
        typeof featureProperties.approvedHeightMetres === "number"
          ? String(featureProperties.approvedHeightMetres)
          : "",
      heightSource:
        typeof featureProperties.heightSource === "string"
          ? featureProperties.heightSource
          : "",
      parcelReference:
        typeof featureProperties.parcelReference === "string"
          ? featureProperties.parcelReference
          : "",
      ulpinRecord:
        typeof featureProperties.ulpinRecord === "string"
          ? featureProperties.ulpinRecord
          : "",
      ownerName:
        typeof ownership.ownerName === "string" ? ownership.ownerName : "",
      ownershipBasis:
        typeof ownership.ownershipBasis === "string"
          ? ownership.ownershipBasis
          : "",
      rightsSummary:
        typeof ownership.rightsSummary === "string"
          ? ownership.rightsSummary
          : "",
      sourceReference:
        typeof ownership.sourceReference === "string"
          ? ownership.sourceReference
          : "",
      editorName: "Authority operator",
      editNote: "",
    });
    setAuthorityNoteError(null);
    setEditorOpen(true);
  };
  useEffect(() => {
    const requestedUlpin = new URLSearchParams(window.location.search).get(
      "editor"
    );
    if (!requestedUlpin || !geometryQuery.data || editorOpen) return;
    const requestedFeature = geometryQuery.data.features.find(
      feature => feature.properties.ulpin === requestedUlpin
    );
    if (!requestedFeature) {
      toast.error("The requested live footprint could not be opened", {
        description:
          "The source record is no longer present in the current PostGIS layer.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    setSelectedLiveFeature({
      ulpin: requestedUlpin,
      properties: requestedFeature.properties,
    });
    setDetailOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
    openFootprintEditor({
      ulpin: requestedUlpin,
      properties: requestedFeature.properties,
    });
  }, [editorOpen, geometryQuery.data]);
  const saveFootprintCorrection = () => {
    if (!selectedLiveFeature) return;
    if (!validateAuthorityRevisionNote()) return;
    let geometry:
      | { type: "Polygon" | "MultiPolygon"; coordinates: unknown }
      | undefined;
    try {
      geometry = JSON.parse(editorForm.geometry) as {
        type: "Polygon" | "MultiPolygon";
        coordinates: unknown;
      };
    } catch {
      toast.error("Geometry must be valid GeoJSON", {
        description: "Use a Polygon or MultiPolygon coordinate object.",
      });
      return;
    }
    const height = editorForm.approvedHeightMetres
      ? Number(editorForm.approvedHeightMetres)
      : undefined;
    if (height !== undefined && (!Number.isFinite(height) || height <= 0)) {
      toast.error("Enter a positive approved height");
      return;
    }
    const ownershipSupplied = Boolean(
      editorForm.parcelReference ||
        editorForm.ulpinRecord ||
        editorForm.ownerName ||
        editorForm.ownershipBasis ||
        editorForm.rightsSummary ||
        editorForm.sourceReference
    );
    if (
      ownershipSupplied &&
      (!editorForm.parcelReference ||
        !editorForm.ulpinRecord ||
        !editorForm.ownerName ||
        !editorForm.ownershipBasis)
    ) {
      toast.error("Complete the verified ownership record", {
        description:
          "Parcel reference, ULPIN record, owner or rights-holder, and ownership basis are required for a link.",
      });
      return;
    }
    footprintUpdate.mutate(
      {
        ulpin: selectedLiveFeature.ulpin,
        geometry,
        approvedHeightMetres: height,
        heightSource: editorForm.heightSource,
        ownershipRecord: ownershipSupplied
          ? {
              parcelReference: editorForm.parcelReference,
              ulpinRecord: editorForm.ulpinRecord,
              ownerName: editorForm.ownerName,
              ownershipBasis: editorForm.ownershipBasis,
              rightsSummary: editorForm.rightsSummary || undefined,
              sourceReference: editorForm.sourceReference || undefined,
            }
          : undefined,
        editNote: revisionNoteValidation.normalized,
      },
      {
        onSuccess: () => {
          void trpcUtils.postgis.geojson.invalidate();
          setEditorOpen(false);
          toast.success("Footprint revision saved", {
            description:
              "The original source geometry remains preserved with the new approved revision.",
          });
        },
        onError: error =>
          toast.error("Correction could not be saved", {
            description: error.message,
          }),
      }
    );
  };

  const selectNav = (label: string) => {
    setActiveNav(label);
    setIsNavOpen(false);
    if (label === "3D workspace") {
      setLocation(
        `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
      );
      return;
    }
    if (label === "Parcels" || label === "ULPIN registry") {
      setSearchQuery(
        label === "Parcels" ? "Find parcel records" : "Find a 3D ULPIN record"
      );
      setSearchOpen(true);
      return;
    }
    if (label === "Buildings" || label === "Property volumes") {
      setLocation(
        `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
      );
      return;
    }
    if (label === "Data ingestion") {
      setUploadOpen(true);
      return;
    }
    if (label === "Processing queue") {
      setUploadOpen(true);
      return;
    }
    if (label !== "Mission control") setWorkspaceOpen(label);
  };

  const issueMapCommand = (kind: Exclude<MapCommand, null>["kind"]) =>
    setMapCommand({ kind, nonce: Date.now() });

  const submitAreaSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = areaSearchQuery.trim();
    if (query.length < 2) {
      toast.error("Enter a site, ULPIN, parcel, or ownership reference");
      return;
    }
    setPlaceSearchRationale(null);
    resolvePlace.mutate(
      { query },
      {
        onSuccess: result => {
          setAreaSearchRequest(result.resolvedQuery);
          setPlaceSearchRationale(result.rationale);
          setLocation(
            `/workspace?site=${encodeURIComponent(result.resolvedQuery)}`
          );
        },
        onError: () => {
          setAreaSearchRequest(query);
          setPlaceSearchRationale(
            "AI routing is unavailable; only the live source-backed layer was searched."
          );
          setLocation(`/workspace?site=${encodeURIComponent(query)}`);
        },
      }
    );
  };

  const selectAutocompleteSuggestion = (query: string) => {
    setAreaSearchQuery(query);
    setAutocompleteOpen(false);
    const nextRequest = query.trim();
    if (!nextRequest) return;
    setPlaceSearchRationale(null);
    resolvePlace.mutate(
      { query: nextRequest },
      {
        onSuccess: result => {
          setAreaSearchRequest(result.resolvedQuery);
          setPlaceSearchRationale(result.rationale);
          setLocation(
            `/workspace?site=${encodeURIComponent(result.resolvedQuery)}`
          );
        },
        onError: () => {
          setAreaSearchRequest(nextRequest);
          setPlaceSearchRationale(
            "AI routing is unavailable; only the live source-backed layer was searched."
          );
        },
      }
    );
  };

  const exportAcademicBlock4Pdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const lines = buildAcademicBlock4PdfLines(academicBlock4);
    let cursorY = 52;
    const addWrapped = (text: string, size = 10, emphasis = false) => {
      pdf.setFont("helvetica", emphasis ? "bold" : "normal");
      pdf.setFontSize(size);
      const wrapped = pdf.splitTextToSize(text, 500);
      pdf.text(wrapped, 48, cursorY);
      cursorY += wrapped.length * (size + 4) + 8;
    };
    const addSection = (title: string, values: string[]) => {
      addWrapped(title, 13, true);
      values.forEach(value => addWrapped(value));
      cursorY += 4;
    };
    addWrapped("3D ULPIN-VPM · SIH evidence export", 9, true);
    addWrapped(academicBlock4.displayLabel, 20, true);
    addWrapped(
      "Institution-level, source-cited context only. This document does not create a GIS footprint, surveyed height, parcel, owner, cadastral ULPIN, or vertical ULPIN."
    );
    addSection("Displayed facts", lines.factLines);
    addSection("Source citations", lines.citationLines);
    addSection("Active evidence locks", lines.lockLines);
    addWrapped(
      "Generated from the dashboard’s Academic Block-4 JSON evidence package. Values are preserved exactly as displayed with their source-availability limitation.",
      8
    );
    pdf.save("sih-academic-block-4-evidence.pdf");
    toast.success("SIH evidence PDF downloaded", {
      description:
        "The export includes displayed facts, citations, source limitations, and active locks.",
    });
  };

  const selectFloor = (floor: number) => {
    setActiveFloor(floor);
    setVolumeLoading(true);
    window.setTimeout(() => setVolumeLoading(false), 520);
  };

  const submitAiSearch = (
    event?: FormEvent<HTMLFormElement>,
    suggestedQuery?: string
  ) => {
    event?.preventDefault();
    const query = (suggestedQuery ?? searchQuery).trim();
    if (query.length < 3) {
      toast.error("Add a more specific property question", {
        description:
          "Try a ULPIN, block, floor, unit, right, or validation state.",
      });
      return;
    }
    setSearchQuery(query);
    aiSearch.mutate(
      { query },
      {
        onSuccess: result => {
          if (result.record) selectFloor(result.record.floor);
        },
        onError: () =>
          toast.error("Search could not be completed", {
            description: "Please try again in a moment.",
          }),
      }
    );
  };

  const stageFile = (file?: File) => {
    if (!file) return;
    const inferredCategory = /\.(geojson|json)$/i.test(file.name)
      ? "geojson"
      : "floorplan";
    setUploadCategory(inferredCategory);
    setStagedFile(file);
    setUploadProgress(0);
    cadastreUpload.reset();
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) =>
    stageFile(event.target.files?.[0]);
  const onFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    stageFile(event.dataTransfer.files?.[0]);
  };

  const beginUpload = async () => {
    if (!stagedFile) {
      toast.error("Choose a file first", {
        description:
          "Upload a GeoJSON parcel layer or a floor plan in PDF, PNG, or JPG format.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("The selected file could not be read");
    reader.onprogress = event => {
      if (event.lengthComputable)
        setUploadProgress(
          Math.min(45, Math.round((event.loaded / event.total) * 45))
        );
    };
    reader.onload = () => {
      const encoded =
        typeof reader.result === "string" ? reader.result.split(",")[1] : "";
      if (!encoded)
        return toast.error("The selected file could not be encoded");
      setUploadProgress(45);
      cadastreUpload.mutate(
        {
          category: uploadCategory,
          fileName: stagedFile.name,
          mimeType: stagedFile.type || "application/octet-stream",
          dataBase64: encoded,
        },
        {
          onSuccess: response => {
            setUploadProgress(100);
            if (response.stored) {
              void trpcUtils.postgis.geojson.invalidate();
              const importedGeometryCount =
                response.spatialImport?.imported ?? 0;
              const spatialNote =
                importedGeometryCount > 0
                  ? ` ${importedGeometryCount} geometry feature(s) are live on the map.`
                  : "";
              toast.success("Evidence file validated", {
                description: `${stagedFile.name} is ready for the processing queue.${spatialNote}`,
              });
            }
          },
          onError: () => {
            setUploadProgress(0);
            toast.error("Upload service unavailable", {
              description: "Your file was not stored. Please try again.",
            });
          },
        }
      );
    };
    reader.readAsDataURL(stagedFile);
  };

  const requestUlpInEligibilityReview = () => {
    setGeneratorOpen(false);
    toast.message("3D ULPIN issuance remains locked", {
      description:
        "Validated GCPs, an authoritative footprint, approved vertical-property evidence, and registration review are required before an identifier can be issued.",
    });
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${isNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-lockup">
            <BrandMark />
            <div>
              <span className="eyebrow">Dept. of Land Resources</span>
              <strong>
                3D ULPIN<span>·</span>VPM
              </strong>
            </div>
          </div>
          <button
            className="icon-button mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <p className="section-kicker">Workspace</p>
          <NavGroup items={navItems} active={activeNav} onSelect={selectNav} />
          <p className="section-kicker nav-spacer">Data operations</p>
          <NavGroup items={dataItems} active={activeNav} onSelect={selectNav} />
          <div className="rail-datum">
            <span className="rail-label">Active field mode</span>
            <strong>
              <i /> 3D ULPIN-VPM framework
            </strong>
            <small>source-linked vertical mapping</small>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            className="account-row"
            type="button"
            onClick={() => setWorkspaceOpen("Operator account")}
          >
            <div className="avatar">AR</div>
            <div>
              <strong>Arjun Rao</strong>
              <small>Authority operator</small>
            </div>
            <MoreHorizontal size={18} />
          </button>
          <div className="survey-state">
            <span className="pulse-dot" />
            <div>
              <strong>CORS link stable</strong>
              <small>± 1.8 cm accuracy</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsNavOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="crumbs">
            <span>Operations</span>
            <ChevronRight size={14} />
            <strong>3D ULPIN-VPM project</strong>
            <ChevronDown size={14} />
          </div>
          <div className="top-actions">
            <button
              className="search-button ai-search-trigger"
              type="button"
              onClick={() => setSearchOpen(true)}
            >
              <BrainCircuit size={17} />
              <span>Ask ULPIN intelligence</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Open settings"
              onClick={() => setWorkspaceOpen("Workspace settings")}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="icon-button upload-top-trigger"
              type="button"
              aria-label="Upload spatial evidence"
              onClick={() => setUploadOpen(true)}
            >
              <FileUp size={18} />
            </button>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setGeneratorOpen(true)}
            >
              <Plus size={17} /> Generate ULPIN
            </button>
          </div>
        </header>

        <div className="workspace-content">
          <section className="heading-row">
            <div>
              <p className="eyebrow cyan-text">
                Department of Land Resources · project command desk
              </p>
              <h1>
                3D ULPIN generation
                <br className="desktop-break" /> &amp; vertical property
                mapping.
              </h1>
              <p className="subhead">
                A source-linked framework for creating spatial identities across
                surface parcels, multi-storey property rights, subsurface
                infrastructure, and air-space interests—without inferring legal
                ownership from detected geometry.
              </p>
            </div>
            <div className="sync-card">
              <Check size={15} />
              <span>All sources synchronized</span>
              <small>08:32 IST</small>
            </div>
          </section>

          <section
            className="home-spatial-hero"
            aria-label="3D spatial workspace overview"
          >
            <img
              src="/manus-storage/ulpin-vpm-user-3d-workspace_acdcc803.png"
              alt="3D ULPIN-VPM workspace reference supplied by the project team"
              style={{ opacity: 0.88, objectPosition: "center" }}
            />
            <div
              className="home-spatial-hero-shade"
              style={{
                background:
                  "linear-gradient(90deg, rgba(7,16,20,.98), rgba(7,16,20,.84) 40%, rgba(7,16,20,.24) 69%, rgba(7,16,20,.08)), linear-gradient(0deg, rgba(7,16,20,.35), transparent 52%)",
              }}
            />
            <div className="home-spatial-hero-grid" />
            <div className="home-spatial-hero-copy">
              <p className="section-kicker">3D ULPIN-VPM project overview</p>
              <h2>
                One interoperable view for land, buildings, infrastructure, and
                vertical rights.
              </h2>
              <p>
                Combine GIS parcel layers, drone imagery, LiDAR and point
                clouds, floor plans, GNSS/CORS control, and DEM/DSM data into
                auditable 3D property records.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setLocation(
                    `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
                  )
                }
              >
                Open live 3D workspace <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="home-spatial-hero-metrics">
              <span>
                <Building2 size={16} />
                <b>3D</b> parcel identity
              </span>
              <span>
                <Layers3 size={16} />
                <b>{activeLayerCount}</b> spatial layers
              </span>
              <span>
                <ShieldCheck size={16} /> authority-gated edits
              </span>
            </div>
          </section>

          <section
            className="area-search-panel"
            aria-label="Layered 3D area search"
          >
            <div>
              <p className="section-kicker">Layered 3D area search</p>
              <strong>
                Locate a site, ULPIN, parcel, or rights record and review its
                situated 3D context.
              </strong>
            </div>
            <form className="area-search-controls" onSubmit={submitAreaSearch}>
              <BrainCircuit size={17} />
              <div className="area-autocomplete">
                <input
                  value={areaSearchQuery}
                  onChange={event => {
                    setAreaSearchQuery(event.target.value);
                    setAutocompleteOpen(true);
                  }}
                  onFocus={() => setAutocompleteOpen(true)}
                  onBlur={() =>
                    window.setTimeout(() => setAutocompleteOpen(false), 140)
                  }
                  placeholder="AI lookup: IIT Patna, college, restaurant, park…"
                  aria-autocomplete="list"
                  aria-expanded={
                    autocompleteOpen && autocompleteSuggestions.length > 0
                  }
                />
                {autocompleteOpen && autocompleteSuggestions.length > 0 && (
                  <div
                    className="area-autocomplete-menu"
                    role="listbox"
                    aria-label="IIT Patna source-aware suggestions"
                  >
                    {autocompleteSuggestions.map(suggestion => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() =>
                          selectAutocompleteSuggestion(suggestion.query)
                        }
                      >
                        <strong>{suggestion.label}</strong>
                        <small>{suggestion.detail}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="primary-button compact"
                type="submit"
                disabled={areaSearch.isFetching || resolvePlace.isPending}
              >
                {areaSearch.isFetching || resolvePlace.isPending ? (
                  <Loader2 className="spin-icon" size={16} />
                ) : (
                  <>
                    Show in 3D <MapPinned size={16} />
                  </>
                )}
              </button>
            </form>
            <label className="map-evidence-filter">
              <span>Map evidence filter</span>
              <select
                value={evidenceFilter}
                onChange={event =>
                  setEvidenceFilter(event.target.value as MapEvidenceFilter)
                }
              >
                <option value="all">All live footprints</option>
                <option value="public-footprint">Public footprint only</option>
                <option value="height-verified">
                  Verified-height extrusion
                </option>
              </select>
              <EvidenceLockBadge
                state={
                  evidenceFilter === "height-verified"
                    ? "verified"
                    : evidenceFilter === "public-footprint"
                      ? "public-footprint"
                      : "source-cited"
                }
                detail={getMapEvidenceFilterLabel(evidenceFilter)}
              />
            </label>
            <div className="area-search-meta">
              <span>
                <Building2 size={13} /> {displayedLayerCount} matching building
                layers
              </span>
              <span>
                <Grid3X3 size={13} /> {displayedSiteArea.toLocaleString()} m²
                situated footprint area
              </span>
              <span>
                <ShieldCheck size={13} /> individual footprints only · no campus
                boundary inferred
              </span>
              {areaSearch.data && (
                <span>
                  <Database size={13} /> query: {areaSearch.data.siteLabel}
                </span>
              )}
              {areaSearch.data && areaSearch.data.ownershipLinkCount > 0 && (
                <span>
                  <Users size={13} /> {areaSearch.data.ownershipLinkCount}{" "}
                  authority-linked records
                </span>
              )}
            </div>
            {placeFacts.data && (
              <div
                className={`place-facts-status ${placeFacts.data.availability}`}
              >
                <EvidenceLockBadge
                  state={
                    placeFacts.data.availability === "source-backed"
                      ? "public-footprint"
                      : "locked"
                  }
                />
                <strong>{placeFacts.data.headline}</strong>
                <span>
                  {placeFacts.data.availability === "source-backed"
                    ? `${placeFacts.data.combinedSourceFootprintAreaSquareMetres.toLocaleString()} m² is a combined live source-footprint total, not an estimated building area.`
                    : "No licensed or official geometry is available; area, length, width, height, floors, and building count are not estimated."}
                </span>
                {placeSearchRationale && <small>{placeSearchRationale}</small>}
              </div>
            )}
          </section>

          <section
            className="evidence-dashboard-grid"
            aria-label="Academic Block-4 institutional evidence and metric locks"
          >
            <motion.article
              className="evidence-dashboard-card"
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.05 }}
            >
              <div className="card-title-row">
                <div>
                  <p className="section-kicker">
                    IIT Patna institutional evidence
                  </p>
                  <h2>{academicBlock4.displayLabel}</h2>
                </div>
                <EvidenceLockBadge
                  state="source-cited"
                  detail={academicBlock4.independentValidationStatus}
                />
              </div>
              <button
                className="evidence-pdf-export"
                type="button"
                onClick={() => void exportAcademicBlock4Pdf()}
              >
                <FileDown size={14} /> Download SIH PDF
              </button>
              <div className="evidence-metric-grid">
                <div>
                  <span>Storeys</span>
                  <strong>
                    {academicBlock4.statedInstitutionalFacts.storeys}
                  </strong>
                </div>
                <div>
                  <span>Total floor area</span>
                  <strong>
                    {academicBlock4.statedInstitutionalFacts.totalFloorAreaSquareMetres.toLocaleString()}{" "}
                    m²
                  </strong>
                </div>
              </div>
              <p className="evidence-dashboard-copy">
                {academicBlock4.independentValidationStatus}
              </p>
              <div className="evidence-citation-list">
                {academicBlock4.officialSourceCitations.map(source => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={13} />
                    <span>
                      <b>{source.label}</b>
                      <small>{source.availabilityAtValidation}</small>
                    </span>
                  </a>
                ))}
              </div>
            </motion.article>
            <motion.article
              className="evidence-dashboard-card evidence-lock-card"
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.1 }}
            >
              <div className="card-title-row">
                <div>
                  <p className="section-kicker">Evidence locks</p>
                  <h2>3D &amp; ULPIN safeguards</h2>
                </div>
                <EvidenceLockBadge state="locked" />
              </div>
              <div className="evidence-lock-list">
                {Object.entries(academicBlock4.activeLocks).map(
                  ([key, detail]) => (
                    <div key={key}>
                      <EvidenceLockBadge state="locked" />
                      <span>
                        <b>
                          {key === "cesiumMetreHeightExtrusion"
                            ? "Height extrusion"
                            : key === "floorByFloorModel"
                              ? "Floor-by-floor model"
                              : "Vertical ULPIN"}
                        </b>
                        <small>{detail}</small>
                      </span>
                    </div>
                  )
                )}
              </div>
              <p className="evidence-dashboard-copy">
                The G+3 statement and total floor area remain institutional
                context. They are not converted into metres, a GIS polygon, an
                exact footprint match, or a legal property identity.
              </p>
            </motion.article>
            <motion.article
              className="evidence-dashboard-card rera-authority-card"
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.14 }}
            >
              <div className="card-title-row">
                <div>
                  <p className="section-kicker">
                    Bihar RERA authority test record
                  </p>
                  <h2>{kusumSureshEnclave.displayLabel}</h2>
                </div>
                <EvidenceLockBadge
                  state="source-cited"
                  detail="Explicit RERA attributes only; height and geometry remain locked"
                />
              </div>
              <div className="rera-metric-grid">
                <div>
                  <span>Sanctioned floors</span>
                  <strong>
                    {
                      kusumSureshEnclave.statedAuthorityFacts
                        .sanctionedFloorsSourceValue
                    }
                  </strong>
                  <small>Source value preserved · five storeys explained</small>
                </div>
                <div>
                  <span>Building height</span>
                  <strong>Not verified</strong>
                  <small>Authority-issued metre height required</small>
                </div>
                <div>
                  <span>Coverage area</span>
                  <strong>
                    {kusumSureshEnclave.statedAuthorityFacts.coverageAreaSquareMetres.toLocaleString()}{" "}
                    m²
                  </strong>
                  <small>Published coverage measure · not a GIS polygon</small>
                </div>
                <div>
                  <span>Plot context</span>
                  <strong>
                    {kusumSureshEnclave.projectLocation.khesraPlot}
                  </strong>
                  <small>
                    {kusumSureshEnclave.projectLocation.mauza} ·{" "}
                    {kusumSureshEnclave.projectLocation.anchal}
                  </small>
                </div>
              </div>
              <a
                className="rera-record-link"
                href={kusumSureshEnclave.authority.recordUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={13} /> Bihar RERA{" "}
                {kusumSureshEnclave.authority.recordId}
              </a>
              <button
                className="rera-focus-button"
                type="button"
                onClick={() => issueMapCommand("focus-authority-reference")}
              >
                <MapPinned size={13} /> Focus RERA endpoint reference
              </button>
              <div className="rera-plan-review">
                <div className="rera-plan-review-heading">
                  <EvidenceLockBadge
                    state="source-cited"
                    detail="Sanctioned plan reviewed"
                  />
                  <b>Plan-space footprint reviewed</b>
                </div>
                <p>
                  The supplied sanctioned plan contains a local closed site and
                  building outline, 1:100 metric scale, G+4 floor drawing, and
                  local road context. The two supplied PDFs are byte-identical.
                </p>
                <p className="rera-plan-review-limit">
                  No WGS84 grid, control point, or benchmark is present. The
                  outline remains plan-space only—not a PostGIS polygon or
                  Cesium extrusion target. Independent GCPs and an
                  authority-issued height source are still required.
                </p>
              </div>
              <div className="rera-lock-summary">
                <EvidenceLockBadge state="locked" />
                <p>
                  The 25.63366, 85.071159 coordinate is labelled as the plot end
                  point. It is displayed only as a Cesium reference marker—not a
                  footprint, parcel boundary, or extrusion target.
                </p>
              </div>
              <div className="evidence-lock-list">
                {Object.entries(kusumSureshEnclave.activeLocks).map(
                  ([key, detail]) => (
                    <div key={key}>
                      <EvidenceLockBadge state={"locked"} />
                      <span>
                        <b>
                          {key === "cesiumExtrusion"
                            ? "Height & extrusion"
                            : key === "officialFootprintGeometry"
                              ? "Footprint geometry"
                              : key === "floorByFloorModel"
                                ? "Floor-by-floor model"
                                : "Vertical ULPIN"}
                        </b>
                        <small>{detail}</small>
                      </span>
                    </div>
                  )
                )}
              </div>
            </motion.article>
          </section>

          <section className="stats-grid" aria-label="Pilot program metrics">
            <StatCard
              label="Surface parcels"
              value="2D → 3D"
              detail="Standardized spatial identities"
              trend="ULPIN"
              color="cyan"
            />
            <StatCard
              label="Vertical rights"
              value="Floor · unit"
              detail="Apartments, parking & air rights"
              trend="volume"
              color="green"
            />
            <StatCard
              label="Underground assets"
              value="Utility"
              detail="Subsurface corridor mapping"
              trend="depth"
              color="amber"
            />
            <StatCard
              label="Evidence resources"
              value="06"
              detail="Drone, LiDAR, GIS, plans, GNSS & DEM"
              color="cyan"
            />
          </section>

          <section className="operations-grid">
            <motion.article
              className={`map-card ${volumeLoading ? "volume-loading" : ""}`}
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.08 }}
            >
              <CesiumSpatialViewer
                command={mapCommand}
                layers={layersOn}
                evidenceFilter={evidenceFilter}
                authorityReference={reraEndpointReference}
                focusUlpins={areaSearch.data?.matchedUlpins}
                onFeatureSelect={onMapFeatureSelect}
              />
              <div className="map-grid" />
              <div className="map-vignette" />

              <div className="map-header">
                <div>
                  <p className="section-kicker">
                    Source-backed building structure
                  </p>
                  <h2>
                    {selectedLiveFeature
                      ? liveFeatureName
                      : hasFocusedSearchGeometry
                        ? `${areaSearch.data?.siteLabel ?? "Search result"} · 3D focus`
                        : "Search a place to focus its live 3D geometry"}
                  </h2>
                  <div className="coordinates">
                    <CircleDot size={13} />{" "}
                    {hasFocusedSearchGeometry
                      ? "Matched PostGIS geometry focused"
                      : "Individual footprints ready"}{" "}
                    <span>·</span> approved heights extrude only after authority
                    approval <span>·</span> EPSG:4326
                  </div>
                </div>
                <div className="map-header-actions">
                  <button
                    className="icon-button dark"
                    type="button"
                    onClick={() =>
                      setLocation(
                        `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
                      )
                    }
                    aria-label="Open the dedicated layered 3D area"
                  >
                    <MapPinned size={17} />
                  </button>
                  <button
                    className="icon-button dark"
                    type="button"
                    onClick={() => issueMapCommand("inspect-footprint")}
                    aria-label="Inspect a live building footprint"
                  >
                    <ScanSearch size={17} />
                  </button>
                  <button
                    className="icon-button dark"
                    type="button"
                    onClick={() =>
                      setLocation(
                        `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
                      )
                    }
                    aria-label="Open full 3D spatial workspace"
                  >
                    <Maximize2 size={17} />
                  </button>
                  <button
                    className="icon-button dark"
                    type="button"
                    onClick={() => setWorkspaceOpen("Spatial layers")}
                    aria-label="Open map layers"
                  >
                    <Settings2 size={17} />
                  </button>
                </div>
              </div>

              <div className="map-control-stack">
                <button
                  type="button"
                  onClick={() => issueMapCommand("zoom-in")}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => issueMapCommand("zoom-out")}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => issueMapCommand("north")}
                  aria-label="Reset map to north"
                >
                  <span className="north-mark">N</span>
                </button>
              </div>

              <div className="property-tag live-property-tag">
                <span className="status-dot cyan" /> LIVE POSTGIS AREA{" "}
                <strong>
                  {displayedLayerCount} building layers ·{" "}
                  {displayedSiteArea.toLocaleString()} m²
                </strong>
              </div>

              {volumeLoading && (
                <motion.div
                  className="volume-sync-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 size={17} />
                  <span>Synchronizing selected volume</span>
                  <i />
                </motion.div>
              )}

              <div className="map-footer">
                <div className="map-scale">
                  <i />
                  <span>50 m</span>
                </div>
                <div className="terrain-key">
                  <span>DSM 2026.06</span>
                  <span className="divider-dot">·</span>
                  <span>LiDAR classified</span>
                </div>
              </div>
            </motion.article>

            <aside className="inspector-column">
              <motion.article
                className="inspector-card"
                {...panelMotion}
                transition={{ duration: 0.42, delay: 0.13 }}
              >
                <div className="card-title-row">
                  <div>
                    <p className="section-kicker">Property inspector</p>
                    <h2>
                      {selectedLiveFeature
                        ? "Live footprint"
                        : "3D structure preview"}
                    </h2>
                  </div>
                  <button
                    className="icon-button ghost"
                    type="button"
                    aria-label="Open inspector"
                    onClick={() =>
                      selectedLiveFeature
                        ? setDetailOpen(true)
                        : issueMapCommand("inspect-footprint")
                    }
                  >
                    <PanelRightOpen size={17} />
                  </button>
                </div>
                <div
                  className="inspector-visual"
                  style={!selectedLiveFeature ? { height: 132 } : undefined}
                >
                  {!selectedLiveFeature && (
                    <>
                      <img
                        src="/manus-storage/ulpin-vpm-source-backed-structure_6245c32e.png"
                        alt="Source-backed building structure reference supplied by the project team"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.6,
                          filter: "saturate(.82) contrast(1.08)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(90deg, rgba(7,16,20,.38), rgba(7,16,20,.08) 56%, rgba(7,16,20,.62)), linear-gradient(0deg, rgba(7,16,20,.54), transparent 58%)",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          zIndex: 3,
                          left: 10,
                          bottom: 8,
                          color: "#bcecea",
                          font: "8px 'IBM Plex Mono', monospace",
                          letterSpacing: ".04em",
                        }}
                      >
                        REFERENCE STRUCTURE VIEW · LIVE GEOMETRY ABOVE
                      </span>
                    </>
                  )}
                  <div className="visual-floor floor-top" />
                  <div className="visual-floor floor-mid" />
                  <div className="visual-floor floor-active">
                    <span>F{activeFloor}</span>
                  </div>
                  <div className="visual-floor floor-low" />
                  <i />
                </div>
                <div className="inspector-main">
                  <div>
                    <p>
                      {selectedLiveFeature
                        ? "Live detected building"
                        : "Illustrative vertical workflow"}
                    </p>
                    <strong>
                      {selectedLiveFeature
                        ? liveFeatureName
                        : "Select a source-backed footprint"}
                    </strong>
                  </div>
                  <SmallBadge tone={selectedLiveFeature ? "cyan" : "slate"}>
                    {selectedLiveFeature ? (
                      <>
                        <Building2 size={12} /> source traced
                      </>
                    ) : (
                      <>
                        <Layers3 size={12} /> guide only
                      </>
                    )}
                  </SmallBadge>
                </div>
                <div className="data-list">
                  <div>
                    <span>
                      {selectedLiveFeature
                        ? "Source record"
                        : "Structure source"}
                    </span>
                    <code>
                      {selectedLiveFeature
                        ? selectedLiveFeature.ulpin
                        : "Select a live PostGIS footprint"}
                    </code>
                  </div>
                  <div>
                    <span>
                      {selectedLiveFeature ? "Footprint area" : "3D visual"}
                    </span>
                    <strong>
                      {selectedLiveFeature
                        ? liveFootprintArea
                        : hasFocusedSearchGeometry
                          ? "Matched geometry in Cesium"
                          : "No place selected"}
                    </strong>
                  </div>
                  <div>
                    <span>
                      {selectedLiveFeature ? "3D height" : "Height status"}
                    </span>
                    <strong>
                      {selectedLiveFeature
                        ? liveFeatureHeight
                        : "Authority approval required"}
                    </strong>
                  </div>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    selectedLiveFeature
                      ? openFootprintEditor()
                      : issueMapCommand("inspect-footprint")
                  }
                >
                  {selectedLiveFeature
                    ? "Correct & link record"
                    : "Inspect live structure"}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </motion.article>

              <motion.article
                className="layer-card"
                {...panelMotion}
                transition={{ duration: 0.42, delay: 0.18 }}
              >
                <div className="card-title-row">
                  <div>
                    <p className="section-kicker">Spatial layers</p>
                    <h2>{activeLayerCount} of 4 active</h2>
                  </div>
                  <Layers3 size={19} />
                </div>
                <div className="layer-list">
                  {layers.map(layer => (
                    <label key={layer.key} className="layer-row">
                      <span
                        className="layer-icon"
                        style={{ background: layer.color }}
                      />
                      <span>{layer.label}</span>
                      <input
                        type="checkbox"
                        checked={layersOn[layer.key]}
                        onChange={() =>
                          setLayersOn(current => ({
                            ...current,
                            [layer.key]: !current[layer.key],
                          }))
                        }
                      />
                      <i className="toggle-track" />
                    </label>
                  ))}
                </div>
              </motion.article>
            </aside>
          </section>

          <section className="lower-grid">
            <motion.article
              className="activity-card"
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.22 }}
            >
              <div className="card-title-row">
                <div>
                  <p className="section-kicker">Validation stream</p>
                  <h2>Today’s spatial decisions</h2>
                </div>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => setWorkspaceOpen("Audit trail")}
                >
                  View audit trail <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="activity-list">
                <div className="activity-row">
                  <span className="activity-icon green">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <strong>Block B12 passed topology validation</strong>
                    <p>
                      12 volumes checked · no overlaps or containment errors
                    </p>
                  </div>
                  <time>08:26</time>
                </div>
                <div className="activity-row">
                  <span className="activity-icon cyan">
                    <FileUp size={16} />
                  </span>
                  <div>
                    <strong>New LiDAR point cloud received</strong>
                    <p>Sector 5 west · 22.4 million classified points</p>
                  </div>
                  <time>08:11</time>
                </div>
                <div className="activity-row">
                  <span className="activity-icon amber">
                    <AlertTriangle size={16} />
                  </span>
                  <div>
                    <strong>Review required: utility depth conflict</strong>
                    <p>Waterline U-223 intersects proposed parking volume</p>
                  </div>
                  <time>07:48</time>
                </div>
              </div>
            </motion.article>

            <motion.article
              className="pipeline-card"
              {...panelMotion}
              transition={{ duration: 0.42, delay: 0.27 }}
            >
              <img
                src="/manus-storage/ulpin-underground-utilities_6d8a64d1.png"
                alt="Underground utility mapping visualization"
              />
              <div className="pipeline-shade" />
              <div className="pipeline-content">
                <p className="section-kicker">Next in line</p>
                <h2>
                  Resolve the depth conflict before issuing 12 parking volumes.
                </h2>
                <button
                  className="primary-button warm"
                  type="button"
                  onClick={() => setWorkspaceOpen("Conflict workspace")}
                >
                  Open conflict workspace <ChevronRight size={16} />
                </button>
              </div>
            </motion.article>
          </section>

          <section className="source-strip">
            <p>Connected evidence sources</p>
            <div className="source-pills">
              <button type="button" onClick={() => setUploadOpen(true)}>
                <i />
                Drone imagery
              </button>
              <button type="button" onClick={() => setUploadOpen(true)}>
                <i />
                LiDAR / point cloud
              </button>
              <button type="button" onClick={() => setUploadOpen(true)}>
                <i />
                GIS parcel layer
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadCategory("floorplan");
                  setUploadOpen(true);
                }}
              >
                <i />
                Floor plans
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceOpen("GNSS / CORS alignment")}
              >
                <i />
                GNSS / CORS
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceOpen("DEM / DSM terrain")}
              >
                <i />
                DEM / DSM
              </button>
            </div>
          </section>
        </div>
      </section>

      {isNavOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      {generatorOpen && (
        <div
          className="modal-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ulpin-generator-title"
        >
          <motion.div
            className="generator-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close ULPIN generator"
              onClick={() => setGeneratorOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="generator-symbol">
              <Sparkles size={22} />
            </div>
            <p className="eyebrow cyan-text">Evidence-gated identity review</p>
            <h2 id="ulpin-generator-title">3D ULPIN issuance locked</h2>
            <p className="generator-copy">
              This SIH demonstration does not create a ULPIN until authoritative
              geometry, vertical-property evidence, and registration review are
              complete.
            </p>
            <div className="generator-code">
              <span>Identifier status</span>
              <code>Not issued</code>
            </div>
            <div className="generation-checks">
              <span>
                <AlertTriangle size={14} /> Ground control points required
              </span>
              <span>
                <AlertTriangle size={14} /> Authoritative footprint required
              </span>
              <span>
                <AlertTriangle size={14} /> Vertical registration evidence
                required
              </span>
            </div>
            <button
              className="primary-button generator-button"
              type="button"
              onClick={requestUlpInEligibilityReview}
            >
              <AlertTriangle size={17} /> View evidence requirements
            </button>
          </motion.div>
        </div>
      )}

      {searchOpen && (
        <div
          className="modal-shell ai-search-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-search-title"
        >
          <motion.div
            className="ai-search-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close AI search"
              onClick={() => setSearchOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="dialog-heading">
              <div className="generator-symbol ai-symbol">
                <BrainCircuit size={21} />
              </div>
              <div>
                <p className="eyebrow cyan-text">
                  Natural-language record intelligence
                </p>
                <h2 id="ai-search-title">Ask the cadastre.</h2>
              </div>
            </div>
            <p className="dialog-intro">
              Query a ULPIN, property right, validation status, building, unit,
              or floor in plain language.
            </p>
            <form className="ai-search-form" onSubmit={submitAiSearch}>
              <ScanSearch size={19} />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                autoFocus
                placeholder="e.g. show the parking volume with a utility conflict"
              />
              <button
                className="primary-button search-submit"
                type="submit"
                disabled={aiSearch.isPending}
              >
                {aiSearch.isPending ? (
                  <Loader2 size={16} className="spin-icon" />
                ) : (
                  "Search"
                )}
              </button>
            </form>
            <div className="suggestion-row">
              <span>Try</span>
              {[
                "Show Block B12 floor 4",
                "Find a parking conflict",
                "Which volume has air-rights?",
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitAiSearch(undefined, prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="ai-result-zone">
              {aiSearch.isPending && (
                <div className="ai-search-loading">
                  <div>
                    <Loader2 size={19} className="spin-icon" />
                    <strong>Interpreting your spatial question</strong>
                    <span>
                      Matching registered volumes, rights, and validation
                      signals.
                    </span>
                  </div>
                  <i />
                  <i />
                </div>
              )}
              {!aiSearch.isPending && aiSearch.data?.record && (
                <motion.div
                  className="ai-result-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="ai-result-top">
                    <SmallBadge
                      tone={
                        aiSearch.data.poweredBy === "AI semantic match"
                          ? "cyan"
                          : "slate"
                      }
                    >
                      <BrainCircuit size={11} /> {aiSearch.data.poweredBy}
                    </SmallBadge>
                    <span>{aiSearch.data.confidence}% confidence</span>
                  </div>
                  <h3>{aiSearch.data.record.title}</h3>
                  <p>{aiSearch.data.answer}</p>
                  <div className="record-identifier">
                    <span>Matched 3D ULPIN</span>
                    <code>{aiSearch.data.record.ulpin}</code>
                  </div>
                  <div className="ai-result-grid">
                    <div>
                      <span>Parcel / Building</span>
                      <strong>
                        {aiSearch.data.record.parcel} ·{" "}
                        {aiSearch.data.record.building}
                      </strong>
                    </div>
                    <div>
                      <span>Volume / elevation</span>
                      <strong>
                        {aiSearch.data.record.volume} ·{" "}
                        {aiSearch.data.record.elevation}
                      </strong>
                    </div>
                    <div>
                      <span>Rights</span>
                      <strong>{aiSearch.data.record.rights}</strong>
                    </div>
                    <div>
                      <span>Reasoning</span>
                      <strong>{aiSearch.data.rationale}</strong>
                    </div>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      const record = aiSearch.data?.record;
                      if (!record) return;
                      selectFloor(record.floor);
                      setDetailOpen(true);
                      setSearchOpen(false);
                    }}
                  >
                    Open property information <ArrowUpRight size={16} />
                  </button>
                </motion.div>
              )}
              {!aiSearch.isPending && !aiSearch.data && (
                <div className="ai-empty-state">
                  <BrainCircuit size={25} />
                  <p>Semantic search is standing by.</p>
                  <span>
                    Results will cite the matched registered record rather than
                    infer ownership data.
                  </span>
                </div>
              )}
              {!aiSearch.isPending &&
                aiSearch.data &&
                !aiSearch.data.record && (
                  <div className="ai-empty-state">
                    <Search size={25} />
                    <p>No stored ULPIN records yet.</p>
                    <span>{aiSearch.data.answer}</span>
                  </div>
                )}
            </div>
          </motion.div>
        </div>
      )}

      {uploadOpen && (
        <div
          className="modal-shell upload-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
        >
          <motion.div
            className="upload-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close data ingestion"
              onClick={() => setUploadOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="dialog-heading">
              <div className="generator-symbol upload-symbol">
                <UploadCloud size={21} />
              </div>
              <div>
                <p className="eyebrow cyan-text">Evidence intake station</p>
                <h2 id="upload-title">Add spatial evidence.</h2>
              </div>
            </div>
            <p className="dialog-intro">
              Bring parcel geometry and floor-plan evidence into the processing
              queue. Each file is checked before it is stored.
            </p>
            <div className="upload-tabs">
              <button
                className={uploadCategory === "geojson" ? "active" : ""}
                type="button"
                onClick={() => {
                  setUploadCategory("geojson");
                  setStagedFile(null);
                  cadastreUpload.reset();
                }}
              >
                <FileJson size={16} /> GeoJSON layer
              </button>
              <button
                className={uploadCategory === "floorplan" ? "active" : ""}
                type="button"
                onClick={() => {
                  setUploadCategory("floorplan");
                  setStagedFile(null);
                  cadastreUpload.reset();
                }}
              >
                <FileText size={16} /> Floor plan
              </button>
            </div>
            <div
              className="upload-dropzone"
              onDragOver={event => event.preventDefault()}
              onDrop={onFileDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ")
                  fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  uploadCategory === "geojson"
                    ? ".geojson,.json,application/geo+json,application/json"
                    : ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                }
                onChange={onFileInput}
              />
              <UploadCloud size={25} />
              <strong>
                {stagedFile
                  ? stagedFile.name
                  : uploadCategory === "geojson"
                    ? "Drop a GeoJSON parcel layer"
                    : "Drop a PDF, PNG, or JPG floor plan"}
              </strong>
              <span>
                {stagedFile
                  ? `${(stagedFile.size / 1024 / 1024).toFixed(2)} MB · click to replace`
                  : "or click to browse · max 7 MB"}
              </span>
            </div>
            {stagedFile && (
              <div className="upload-file-row">
                <div className="file-type-icon">
                  {uploadCategory === "geojson" ? (
                    <FileJson size={17} />
                  ) : (
                    <FileText size={17} />
                  )}
                </div>
                <div>
                  <strong>{stagedFile.name}</strong>
                  <span>
                    {uploadCategory === "geojson"
                      ? "Parcel layer · structure and feature count will be checked"
                      : "Floor plan · format and georeference readiness will be checked"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStagedFile(null);
                    cadastreUpload.reset();
                    setUploadProgress(0);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {(cadastreUpload.isPending || uploadProgress > 0) && (
              <div className="upload-progress-wrap">
                <div>
                  <span>
                    {cadastreUpload.isPending
                      ? "Server validation & storage in progress"
                      : cadastreUpload.data?.stored
                        ? "Evidence stored"
                        : "Validation complete"}
                  </span>
                  <strong>
                    {cadastreUpload.isPending
                      ? "Working"
                      : `${uploadProgress}%`}
                  </strong>
                </div>
                <div className="upload-progress">
                  <i
                    className={
                      cadastreUpload.isPending ? "server-indeterminate" : ""
                    }
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {cadastreUpload.data && (
              <div
                className={`validation-report ${cadastreUpload.data.validation.accepted ? "accepted" : "rejected"}`}
              >
                <div className="validation-heading">
                  {cadastreUpload.data.validation.accepted ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                  <div>
                    <strong>
                      {cadastreUpload.data.validation.accepted
                        ? "Validation feedback"
                        : "File needs attention"}
                    </strong>
                    <span>
                      Readiness score {cadastreUpload.data.validation.score}/100
                    </span>
                  </div>
                </div>
                <div className="validation-checks">
                  {cadastreUpload.data.validation.checks.map(check => (
                    <span className={check.state} key={check.label}>
                      <i />
                      {check.label}
                    </span>
                  ))}
                </div>
                <p>{cadastreUpload.data.validation.findings.join(" ")}</p>
              </div>
            )}
            {cadastreUpload.data?.extraction && (
              <div className="extraction-report">
                <div>
                  <BrainCircuit size={17} />
                  <strong>AI evidence extraction</strong>
                  <SmallBadge tone="cyan">
                    {cadastreUpload.data.extraction.confidence}% confidence
                  </SmallBadge>
                </div>
                <p>{cadastreUpload.data.extraction.summary}</p>
                <div className="extraction-grid">
                  <span>
                    Footprints{" "}
                    <b>{cadastreUpload.data.extraction.footprintCount}</b>
                  </span>
                  <span>
                    Floors{" "}
                    <b>
                      {cadastreUpload.data.extraction.detectedFloorCount ?? "—"}
                    </b>
                  </span>
                  <span>
                    Units{" "}
                    <b>{cadastreUpload.data.extraction.unitLabels.length}</b>
                  </span>
                  <span>
                    Map status{" "}
                    <b>
                      {cadastreUpload.data.extraction.needsGeoreference
                        ? "georeference needed"
                        : `${cadastreUpload.data.spatialImport?.imported ?? 0} imported`}
                    </b>
                  </span>
                </div>
                {cadastreUpload.data.extraction.needsGeoreference && (
                  <div className="georeference-note">
                    <MapPinned size={13} />
                    <span>
                      {cadastreUpload.data.extraction.normalizedFootprint
                        .length >= 3
                        ? "Footprint derived in plan coordinates. Add ground-control points before publishing to PostGIS."
                        : "No reliable exterior footprint found. Upload a clearer plan or add the boundary during georeferencing."}
                    </span>
                  </div>
                )}
              </div>
            )}
            <button
              className="primary-button upload-submit"
              type="button"
              onClick={beginUpload}
              disabled={cadastreUpload.isPending}
            >
              {cadastreUpload.isPending ? (
                <>
                  <Loader2 className="spin-icon" size={16} /> Validating
                  evidence…
                </>
              ) : (
                <>
                  <Check size={16} /> Validate & add to queue
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}

      {detailOpen && (
        <div
          className="modal-shell property-detail-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-detail-title"
        >
          <motion.div
            className="property-detail-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close property information"
              onClick={() => setDetailOpen(false)}
            >
              <X size={18} />
            </button>
            <div className="detail-hero">
              <div>
                <p className="eyebrow cyan-text">
                  {selectedLiveFeature
                    ? "Live footprint source metadata"
                    : "Detailed property information"}
                </p>
                <h2 id="property-detail-title">
                  {selectedLiveFeature
                    ? liveFeatureName
                    : "No authority-verified property selected"}
                </h2>
                <p>
                  {selectedLiveFeature
                    ? "Individual open building footprint selected from the live Neon PostGIS layer; no campus boundary has been inferred."
                    : "Select a source-backed footprint to inspect its provenance. This demonstration does not fabricate a ULPIN, ownership, floor, or property-volume record."}
                </p>
              </div>
              <SmallBadge tone={selectedLiveFeature ? "cyan" : "amber"}>
                {selectedLiveFeature ? (
                  <>
                    <Building2 size={12} /> detected footprint
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> evidence pending
                  </>
                )}
              </SmallBadge>
            </div>
            <div className="detail-ulpin">
              <span>
                {selectedLiveFeature ? "Source record" : "Vertical ULPIN"}
              </span>
              <code>
                {selectedLiveFeature ? selectedLiveFeature.ulpin : "Not issued"}
              </code>
              <span className="detail-score">
                {selectedLiveFeature
                  ? liveFeatureConfidence
                  : "Evidence pending"}
              </span>
            </div>
            <div className="detail-metrics">
              <div>
                <span>
                  {selectedLiveFeature
                    ? "Footprint area"
                    : "Footprint geometry"}
                </span>
                <strong>
                  {selectedLiveFeature ? liveFootprintArea : "Not supplied"}
                </strong>
              </div>
              <div>
                <span>
                  {selectedLiveFeature
                    ? "Approved 3D height"
                    : "Approved height"}
                </span>
                <strong>
                  {selectedLiveFeature ? liveFeatureHeight : "Not supplied"}
                </strong>
              </div>
              <div>
                <span>
                  {selectedLiveFeature ? "Spatial proximity" : "Floor / unit"}
                </span>
                <strong>
                  {selectedLiveFeature ? liveFeatureDistance : "Not supplied"}
                </strong>
              </div>
            </div>
            <div className="detail-columns">
              <section>
                <p className="section-kicker">
                  {selectedLiveFeature ? "Dataset scope" : "Rights & ownership"}
                </p>
                <h3>
                  {selectedLiveFeature
                    ? "Individual footprint only"
                    : "Not asserted"}
                </h3>
                <ul>
                  {selectedLiveFeature ? (
                    <>
                      <li>No campus boundary inferred</li>
                      <li>Selected from an 180 m location radius</li>
                      <li>Rendered as a flat plan footprint only</li>
                    </>
                  ) : (
                    <>
                      <li>No ownership or rights inferred</li>
                      <li>No parcel boundary or volume asserted</li>
                      <li>No floor or unit identity issued</li>
                    </>
                  )}
                </ul>
              </section>
              <section>
                <p className="section-kicker">
                  {selectedLiveFeature ? "Traceability" : "Evidence status"}
                </p>
                <h3>
                  {selectedLiveFeature
                    ? "Reusable source record"
                    : "Requirements pending"}
                </h3>
                <ul>
                  {selectedLiveFeature ? (
                    <>
                      <li>
                        <Check size={14} /> Microsoft Global ML Building
                        Footprints
                      </li>
                      <li>
                        <Check size={14} /> CDLA Permissive 2.0 attribution
                      </li>
                      <li>
                        <Check size={14} /> Stored in live Neon PostGIS
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <AlertTriangle size={14} /> Independent GCPs required
                      </li>
                      <li>
                        <AlertTriangle size={14} /> Authority footprint required
                      </li>
                      <li>
                        <AlertTriangle size={14} /> Vertical registration
                        required
                      </li>
                    </>
                  )}
                </ul>
              </section>
            </div>
            <div className="detail-validation">
              <ShieldCheck size={18} />
              <div>
                <strong>
                  {selectedLiveFeature
                    ? "Source metadata preserved"
                    : "Evidence validation pending"}
                </strong>
                <span>
                  {selectedLiveFeature
                    ? `${typeof selectedOwnership.ownerName === "string" ? `Linked owner: ${selectedOwnership.ownerName}. ` : "No ownership record linked yet. "}The selected building footprint remains attributed to its Microsoft open-data source and is not treated as a cadastral parcel or campus boundary.`
                    : "No source-backed property record is selected. Geometry, height, ownership, and vertical ULPIN status remain unavailable until the required evidence is reviewed."}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  selectedLiveFeature
                    ? openFootprintEditor()
                    : setWorkspaceOpen("Audit trail")
                }
              >
                {selectedLiveFeature ? "Correct & link" : "View evidence locks"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {workspaceOpen && (
        <div
          className="modal-shell workspace-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-title"
        >
          <motion.div
            className="workspace-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className="icon-button modal-close"
              type="button"
              aria-label="Close workspace"
              onClick={() => setWorkspaceOpen(null)}
            >
              <X size={18} />
            </button>
            <p className="eyebrow cyan-text">
              {workspaceOpen === "Audit trail"
                ? "Cadastral audit workspace"
                : workspaceOpen === "Conflict workspace"
                  ? "Topology resolution workspace"
                  : workspaceOpen === "GNSS / CORS alignment"
                    ? "Coordinate control workspace"
                    : workspaceOpen === "DEM / DSM terrain"
                      ? "Terrain evidence workspace"
                      : workspaceOpen === "Operator account"
                        ? "Authority operator workspace"
                        : "Workspace settings"}
            </p>
            <h2 id="workspace-title">{workspaceOpen}</h2>
            <p>
              {workspaceOpen === "Workspace settings"
                ? "Adjust the active map layer baseline and continue directly to the live spatial workspace."
                : workspaceOpen === "Operator account"
                  ? authQuery.data
                    ? `Signed in as ${authQuery.data.name ?? "authority operator"} with ${authQuery.data.role} access.`
                    : "Sign in to approve heights, footprint revisions, and explicit parcel/ULPIN ownership links."
                  : workspaceOpen === "Audit trail"
                    ? "Review the current validation decisions and move to the live layers that generated them."
                    : workspaceOpen === "Conflict workspace"
                      ? "Open the live 3D workspace to locate the reported utility-depth conflict before assigning a resolution note."
                      : workspaceOpen === "GNSS / CORS alignment"
                        ? "The Amity reference point is stored in EPSG:4326. Use the live workspace to inspect its relationship to individual footprints."
                        : workspaceOpen === "DEM / DSM terrain"
                          ? "Terrain controls are available as a visible layer in the live workspace; elevation-derived building height must still be authority approved."
                          : workspaceOpen === "Spatial layers"
                            ? `${activeLayerCount} layers are active. Use the layer switches in the property inspector to adjust the display.`
                            : "This operational panel routes directly to the relevant cadastral workflow."}
            </p>
            {workspaceOpen === "Audit trail" && (
              <div className="workspace-context-list">
                <span>
                  <Check size={14} /> Block B12 topology validation passed
                </span>
                <span>
                  <FileUp size={14} /> LiDAR classification received
                </span>
                <span>
                  <AlertTriangle size={14} /> Utility depth review requires
                  resolution
                </span>
              </div>
            )}
            {workspaceOpen === "Workspace settings" && (
              <div className="workspace-context-list">
                <span>
                  <Layers3 size={14} /> {activeLayerCount} spatial layers
                  currently enabled
                </span>
                <span>
                  <Database size={14} /> PostGIS refreshes live geometry every
                  20 seconds
                </span>
              </div>
            )}
            {workspaceOpen === "Operator account" && (
              <div className="workspace-context-list">
                <span>
                  <ShieldCheck size={14} /> Approved edits require administrator
                  access
                </span>
                <span>
                  <Building2 size={14} /> Original Microsoft source geometry
                  remains immutable
                </span>
              </div>
            )}
            <div className="workspace-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setWorkspaceOpen(null)}
              >
                Return to command desk
              </button>
              {workspaceOpen === "Workspace settings" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    setLayersOn({
                      parcels: true,
                      buildings: true,
                      utilities: true,
                      terrain: true,
                    })
                  }
                >
                  Enable all layers <Layers3 size={16} />
                </button>
              ) : workspaceOpen === "Operator account" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
                    )
                  }
                >
                  Open live records <ArrowUpRight size={16} />
                </button>
              ) : workspaceOpen === "Audit trail" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setWorkspaceOpen(null);
                    issueMapCommand("inspect-footprint");
                  }}
                >
                  Inspect source layer <ScanSearch size={16} />
                </button>
              ) : workspaceOpen === "Conflict workspace" ||
                workspaceOpen === "GNSS / CORS alignment" ||
                workspaceOpen === "DEM / DSM terrain" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/workspace?site=${encodeURIComponent(resolvedWorkspaceSite)}`
                    )
                  }
                >
                  Open 3D review <MapPinned size={16} />
                </button>
              ) : workspaceOpen === "Spatial layers" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setWorkspaceOpen(null);
                    issueMapCommand("focus-site");
                  }}
                >
                  Focus live layers <MapPinned size={16} />
                </button>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}

      {editorOpen && selectedLiveFeature && (
        <div
          className="modal-shell editor-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footprint-editor-title"
        >
          <motion.div
            className="editor-dialog"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="editor-top-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="Open authority workspace in a separate full page"
                title="Open in a separate full page"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("editor", selectedLiveFeature.ulpin);
                  window.open(url.toString(), "_blank", "noopener,noreferrer");
                }}
              >
                <ArrowUpRight size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Open authority workspace in full screen"
                title="Use browser full screen"
                onClick={() =>
                  void document.documentElement.requestFullscreen?.()
                }
              >
                <Maximize2 size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Close footprint editor"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  setEditorOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="eyebrow cyan-text">
              Authority correction & cadastral linkage
            </p>
            <h2 id="footprint-editor-title">Correct live footprint</h2>
            <p className="dialog-intro">
              Save a revision with the original Microsoft footprint retained,
              then attach approved height and verified parcel/ULPIN ownership
              references.
            </p>
            <div className="editor-grid">
              <label>
                Approved height (metres)
                <input
                  value={editorForm.approvedHeightMetres}
                  inputMode="decimal"
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      approvedHeightMetres: event.target.value,
                    }))
                  }
                  placeholder="e.g. 18.5"
                />
              </label>
              <label>
                Height approval source
                <input
                  value={editorForm.heightSource}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      heightSource: event.target.value,
                    }))
                  }
                  placeholder="Survey / approved drawing reference"
                />
              </label>
              <label>
                Parcel reference
                <input
                  value={editorForm.parcelReference}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      parcelReference: event.target.value,
                    }))
                  }
                  placeholder="Parcel ID"
                />
              </label>
              <label>
                3D ULPIN record
                <input
                  value={editorForm.ulpinRecord}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      ulpinRecord: event.target.value,
                    }))
                  }
                  placeholder="Verified ULPIN"
                />
              </label>
              <label>
                Owner / rights-holder
                <input
                  value={editorForm.ownerName}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      ownerName: event.target.value,
                    }))
                  }
                  placeholder="Verified record name"
                />
              </label>
              <label>
                Ownership basis
                <input
                  value={editorForm.ownershipBasis}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      ownershipBasis: event.target.value,
                    }))
                  }
                  placeholder="Registry reference"
                />
              </label>
              <label>
                Rights summary
                <input
                  value={editorForm.rightsSummary}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      rightsSummary: event.target.value,
                    }))
                  }
                  placeholder="Recorded rights or restrictions"
                />
              </label>
              <label>
                Source reference
                <input
                  value={editorForm.sourceReference}
                  onChange={event =>
                    setEditorForm(current => ({
                      ...current,
                      sourceReference: event.target.value,
                    }))
                  }
                  placeholder="Registry, order, or deed reference"
                />
              </label>
              <label>
                Authority audit identity
                <input
                  value="Server records the signed-in administrator"
                  readOnly
                  aria-label="Server records the signed-in administrator identity"
                />
              </label>
              <label>
                Revision note
                <input
                  value={editorForm.editNote}
                  minLength={REVISION_NOTE_MINIMUM_LENGTH}
                  required
                  aria-invalid={Boolean(
                    authorityNoteError || !revisionNoteValidation.valid
                  )}
                  aria-describedby="revision-note-help"
                  onBlur={() => {
                    if (!revisionNoteValidation.valid)
                      setAuthorityNoteError(revisionNoteValidation.message);
                  }}
                  onChange={event => {
                    const editNote = event.target.value;
                    setEditorForm(current => ({ ...current, editNote }));
                    if (validateRevisionNote(editNote).valid)
                      setAuthorityNoteError(null);
                  }}
                  placeholder="Why this correction is approved"
                />
                <small
                  id="revision-note-help"
                  className={`editor-field-validation ${authorityNoteError || !revisionNoteValidation.valid ? "invalid" : "valid"}`}
                >
                  {authorityNoteError ??
                    (revisionNoteValidation.valid
                      ? "Revision note meets the save requirement."
                      : `Required: at least ${REVISION_NOTE_MINIMUM_LENGTH} characters.`)}
                </small>
              </label>
            </div>
            {editableVertices.length > 0 ? (
              <section className="vertex-editor">
                <div>
                  <p className="section-kicker">Assisted vertex correction</p>
                  <strong>
                    Edit longitude and latitude values; the closing polygon
                    vertex is maintained automatically.
                  </strong>
                </div>
                <button
                  type="button"
                  className="text-action"
                  onClick={() =>
                    setEditorForm(current => ({
                      ...current,
                      geometry: sourceGeometry,
                    }))
                  }
                >
                  Reset to source
                </button>
                <div className="vertex-grid">
                  {editableVertices.map((vertex, index) => (
                    <div key={index}>
                      <span>V{index + 1}</span>
                      <input
                        aria-label={`Vertex ${index + 1} longitude`}
                        value={vertex[0]}
                        inputMode="decimal"
                        onChange={event =>
                          setEditorForm(current => ({
                            ...current,
                            geometry: replacePolygonVertex(
                              current.geometry,
                              index,
                              0,
                              event.target.value
                            ),
                          }))
                        }
                      />
                      <input
                        aria-label={`Vertex ${index + 1} latitude`}
                        value={vertex[1]}
                        inputMode="decimal"
                        onChange={event =>
                          setEditorForm(current => ({
                            ...current,
                            geometry: replacePolygonVertex(
                              current.geometry,
                              index,
                              1,
                              event.target.value
                            ),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <p className="editor-note">
                This feature uses a MultiPolygon or a non-standard geometry. Use
                the reviewed GeoJSON editor below.
              </p>
            )}
            <label className="geometry-editor">
              Reviewed GeoJSON geometry
              <textarea
                value={editorForm.geometry}
                onChange={event =>
                  setEditorForm(current => ({
                    ...current,
                    geometry: event.target.value,
                  }))
                }
                spellCheck={false}
              />
            </label>
            <div className="editor-actions">
              <span>
                Source record: <code>{selectedLiveFeature.ulpin}</code>
              </span>
              <button
                className="primary-button"
                type="button"
                disabled={
                  footprintUpdate.isPending ||
                  (canSaveAuthorityRecord && !revisionNoteValidation.valid)
                }
                onClick={requestAuthoritySignIn}
              >
                {footprintUpdate.isPending ? (
                  <>
                    <Loader2 className="spin-icon" size={16} /> Saving revision…
                  </>
                ) : !authQuery.data ? (
                  <>
                    <ShieldCheck size={16} /> Sign in as administrator
                  </>
                ) : !canSaveAuthorityRecord ? (
                  "Administrator role required"
                ) : !revisionNoteValidation.valid ? (
                  `Add ${REVISION_NOTE_MINIMUM_LENGTH}-character note`
                ) : (
                  <>
                    <Check size={16} /> Save approved correction
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
