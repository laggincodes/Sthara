import { CesiumSpatialViewer, type CesiumLayerFlags, type MapCommand } from "@/components/CesiumSpatialViewer";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, CircleDot, Database, Layers3, Maximize2, Minus, Plus, ScanSearch, Settings2, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type SelectedFeature = { ulpin: string; properties: Record<string, unknown> };

const layerOptions: Array<{ key: keyof CesiumLayerFlags; label: string; color: string }> = [
  { key: "parcels", label: "Parcel edges", color: "#2ad4d9" },
  { key: "buildings", label: "Building volumes", color: "#7de1aa" },
  { key: "utilities", label: "Underground utilities", color: "#eba760" },
  { key: "terrain", label: "Terrain contour", color: "#d8e2de" },
];

export default function SpatialWorkspace() {
  const [, setLocation] = useLocation();
  const initialSite = useMemo(() => new URLSearchParams(window.location.search).get("site") ?? "Amity University Patna", []);
  const [searchText, setSearchText] = useState(initialSite);
  const [siteQuery, setSiteQuery] = useState(initialSite);
  const [layers, setLayers] = useState<CesiumLayerFlags>({ parcels: true, buildings: true, utilities: true, terrain: true });
  const [command, setCommand] = useState<MapCommand>({ kind: "focus-site", nonce: Date.now() });
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const searchResult = trpc.postgis.areaSearch.useQuery({ query: siteQuery });

  const selectedName = typeof selected?.properties.name === "string" ? selected.properties.name : "Live building volume";
  const selectedArea = typeof selected?.properties.footprintAreaSquareMetres === "number" ? `${selected.properties.footprintAreaSquareMetres.toLocaleString()} m²` : "Area pending";
  const selectedHeight = typeof selected?.properties.approvedHeightMetres === "number" ? `${selected.properties.approvedHeightMetres} m approved` : "Height awaiting authority approval";
  const selectedUlpIn = selected?.ulpin ?? "Select a live footprint";
  const activeLayerCount = Object.values(layers).filter(Boolean).length;
  const issueCommand = (kind: Exclude<MapCommand, null>["kind"]) => setCommand({ kind, nonce: Date.now() });
  const onFeatureSelect = useCallback((feature: SelectedFeature) => setSelected(feature), []);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchText.trim();
    if (query.length >= 2) {
      setSiteQuery(query);
      issueCommand("focus-site");
    }
  };

  return (
    <main className="spatial-workspace-shell">
      <aside className="spatial-workspace-rail" aria-label="Spatial workspace navigation">
        <Link href="/" className="spatial-brand"><span className="spatial-brand-mark" /><span><small>Dept. of Land Resources</small><strong>3D ULPIN·VPM</strong></span></Link>
        <div className="spatial-rail-group"><p>Workspace</p><button type="button" className="active"><Building2 size={17} /> Property volumes</button><button type="button" onClick={() => setLocation("/")}><Layers3 size={17} /> Command home</button><button type="button" onClick={() => setLocation("/?workspace=ULPIN%20registry")}><ShieldCheck size={17} /> ULPIN registry</button></div>
        <div className="spatial-rail-group"><p>Data operations</p><button type="button" onClick={() => setLocation("/?workspace=Data%20ingestion")}><Database size={17} /> Data ingestion</button><button type="button" onClick={() => setLocation("/?workspace=Processing%20queue")}><Settings2 size={17} /> Processing queue</button></div>
        <div className="spatial-rail-status"><i /> <span><small>Active field mode</small><strong>3D ULPIN-VPM project</strong><em>source-backed individual footprints</em></span></div>
        <div className="spatial-rail-footer"><i /> CORS link stable <span>± 1.8 cm</span></div>
      </aside>

      <section className="spatial-workspace-main">
        <header className="spatial-workspace-topbar"><div><span>Operations</span><b>›</b><strong>{searchResult.data?.siteLabel ?? siteQuery}</strong></div><form onSubmit={submitSearch}><ScanSearch size={16} /><input value={searchText} onChange={event => setSearchText(event.target.value)} aria-label="Search live 3D site, ULPIN, or parcel" /><button type="submit">Locate</button></form><button className="workspace-home-button" type="button" onClick={() => setLocation("/")}><ArrowLeft size={15} /> Dashboard</button></header>

        <div className="spatial-model-layout">
          <section className="spatial-model-stage">
            <CesiumSpatialViewer command={command} layers={layers} focusUlpins={searchResult.data?.matchedUlpins} onFeatureSelect={onFeatureSelect} />
            <div className="spatial-stage-grid" />
            <div className="spatial-stage-vignette" />
            <div className="spatial-stage-heading"><p>Source-backed building structure</p><h1>{searchResult.isLoading ? "Finding verified 3D geometry…" : (searchResult.data?.buildingCount ?? 0) > 0 ? searchResult.data?.siteLabel : `No verified 3D visual for “${siteQuery}”`}</h1><span><CircleDot size={13} /> {(searchResult.data?.buildingCount ?? 0) > 0 ? `${searchResult.data?.buildingCount} matched PostGIS footprints · camera focused on source geometry` : "Try a mapped site, ULPIN, parcel, or building record"} <b>·</b> EPSG:4326</span></div>
            <div className="spatial-stage-actions"><button type="button" onClick={() => issueCommand("fullscreen")} aria-label="Expand 3D map"><Maximize2 size={17} /></button><button type="button" onClick={() => issueCommand("inspect-footprint")} aria-label="Inspect live footprint"><ScanSearch size={17} /></button></div>
            <div className="spatial-map-controls"><button type="button" onClick={() => issueCommand("zoom-in")} aria-label="Zoom in"><Plus size={17} /></button><button type="button" onClick={() => issueCommand("zoom-out")} aria-label="Zoom out"><Minus size={17} /></button><button type="button" onClick={() => issueCommand("north")} aria-label="Reset north">N</button></div>
            <div className="spatial-selection-chip"><i /> {selected ? `Selected ${selected.ulpin}` : (searchResult.data?.buildingCount ?? 0) > 0 ? `${searchResult.data?.buildingCount} live building layers` : "No source-backed footprint returned"} <b>{searchResult.data?.totalFootprintAreaSquareMetres.toLocaleString() ?? "0"} m²</b></div>
            <div className="spatial-stage-footer"><span>50 m</span><span>LIVE POSTGIS · individual footprints only</span></div>
          </section>

          <aside className="spatial-dossier">
            <div className="spatial-dossier-card"><div className="spatial-dossier-title"><div><p>Structure inspector</p><h2>{selected ? selectedName : "Source-backed 3D preview"}</h2></div><button type="button" onClick={() => issueCommand("inspect-footprint")} aria-label="Inspect a building footprint"><ScanSearch size={16} /></button></div><div className="spatial-volume-preview"><i /><i /><i /><i /></div><div className="spatial-dossier-state"><span>{selected ? "Selected source record" : (searchResult.data?.buildingCount ?? 0) > 0 ? "Select a building on the live map" : "No verified visual is available"}</span><strong>{selected ? selectedUlpIn : (searchResult.data?.buildingCount ?? 0) > 0 ? `${searchResult.data?.buildingCount} individual building polygons` : "Search another mapped location"}</strong></div><dl><div><dt>Footprint area</dt><dd>{selected ? selectedArea : `${searchResult.data?.totalFootprintAreaSquareMetres.toLocaleString() ?? "0"} m²`}</dd></div><div><dt>3D height</dt><dd>{selected ? selectedHeight : `${searchResult.data?.approvedHeightCount ?? 0} approved`}</dd></div><div><dt>Ownership</dt><dd>{selected?.properties.ownershipLinked ? "Authority-linked" : "No inferred ownership"}</dd></div></dl>{selected && <button className="spatial-correct-button" type="button" onClick={() => setLocation(`/?editor=${encodeURIComponent(selected.ulpin)}`)}>Review source record</button>}</div>
            <div className="spatial-dossier-card spatial-layer-panel"><div className="spatial-dossier-title"><div><p>Spatial layers</p><h2>{activeLayerCount} of 4 active</h2></div><Layers3 size={17} /></div>{layerOptions.map(layer => <label key={layer.key}><span style={{ background: layer.color }} /><b>{layer.label}</b><input type="checkbox" checked={layers[layer.key]} onChange={() => setLayers(current => ({ ...current, [layer.key]: !current[layer.key] }))} /><i /></label>)}</div>
            <div className="spatial-source-note"><ShieldCheck size={15} /><span>Microsoft ML footprints remain individual open-data detections. No campus boundary or ownership is inferred.</span></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
