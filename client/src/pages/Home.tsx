/**
 * Cadastral Blueprint design reminder: treat this as an expert spatial instrument.
 * Midnight slate, datum cyan, drafting lines, asymmetrical command-rail composition.
 */
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  FileUp,
  Grid3X3,
  Layers3,
  MapPinned,
  Maximize2,
  Menu,
  MoreHorizontal,
  PanelRightOpen,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

function SmallBadge({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "green" | "amber" | "slate" }) {
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
    <motion.article className="metric-card" {...panelMotion} transition={{ duration: 0.35 }}>
      <div className="metric-label"><span className={`status-dot ${color}`} /> {label}</div>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {trend && <SmallBadge tone={color === "green" ? "green" : color === "amber" ? "amber" : "cyan"}>{trend}</SmallBadge>}
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
      {items.map((item) => {
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
  const [activeNav, setActiveNav] = useState("Mission control");
  const [activeFloor, setActiveFloor] = useState(4);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [layersOn, setLayersOn] = useState<Record<LayerKey, boolean>>({
    parcels: true,
    buildings: true,
    utilities: true,
    terrain: true,
  });

  const activeLayerCount = useMemo(() => Object.values(layersOn).filter(Boolean).length, [layersOn]);

  const selectNav = (label: string) => {
    setActiveNav(label);
    setIsNavOpen(false);
    if (label !== "Mission control") toast(`${label} selected`, { description: "This demonstration keeps the command center context in view." });
  };

  const generateUlpIn = () => {
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      setGeneratorOpen(false);
      toast.success("3D ULPIN issued", { description: "KA-29-105-0421-B12-F04-021 is ready for review." });
    }, 1300);
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${isNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-lockup">
            <BrandMark />
            <div>
              <span className="eyebrow">Dept. of Land Resources</span>
              <strong>3D ULPIN<span>·</span>VPM</strong>
            </div>
          </div>
          <button className="icon-button mobile-close" type="button" aria-label="Close navigation" onClick={() => setIsNavOpen(false)}>
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
            <strong><i /> South Bengaluru pilot</strong>
            <small>KA-BLR-S5 · vertical cadastre</small>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="survey-state">
            <span className="pulse-dot" />
            <div><strong>CORS link stable</strong><small>± 1.8 cm accuracy</small></div>
          </div>
          <button className="account-row" type="button" onClick={() => toast("Account preferences", { description: "Settings are available in the full implementation." })}>
            <div className="avatar">AR</div>
            <div><strong>Arjun Rao</strong><small>Authority operator</small></div>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setIsNavOpen(true)}><Menu size={20} /></button>
          <div className="crumbs"><span>Operations</span><ChevronRight size={14} /><strong>South Bengaluru pilot</strong><ChevronDown size={14} /></div>
          <div className="top-actions">
            <button className="search-button" type="button" onClick={() => toast("Search ready", { description: "Search parcels, buildings, ULPINs, or coordinates." })}><Search size={17} /><span>Search spatial records</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" type="button" aria-label="Open settings" onClick={() => toast("Workspace settings", { description: "Layer and coordinate preferences are coming next." })}><Settings2 size={18} /></button>
            <button className="primary-button compact" type="button" onClick={() => setGeneratorOpen(true)}><Plus size={17} /> Generate ULPIN</button>
          </div>
        </header>

        <div className="workspace-content">
          <section className="heading-row">
            <div>
              <p className="eyebrow cyan-text">Vertical cadastre command desk</p>
              <h1>South Bengaluru vertical cadastre<br className="desktop-break" /> ready for volume review.</h1>
              <p className="subhead">1,248 parcels and 8,936 registered volumes are synchronized against the latest LiDAR, GIS, floor-plan, and CORS evidence.</p>
            </div>
            <div className="sync-card"><Check size={15} /><span>All sources synchronized</span><small>08:32 IST</small></div>
          </section>

          <section className="stats-grid" aria-label="Pilot program metrics">
            <StatCard label="Mapped parcels" value="1,248" detail="Across 18.6 km² of pilot area" trend="+5.2%" color="cyan" />
            <StatCard label="Registered volumes" value="8,936" detail="Flats, parking rights & air space" trend="+184" color="green" />
            <StatCard label="Topology health" value="98.7%" detail="116 checks completed this cycle" trend="12 flags" color="amber" />
            <StatCard label="Processing queue" value="03" detail="LiDAR & floor plans awaiting review" color="cyan" />
          </section>

          <section className="operations-grid">
            <motion.article className="map-card" {...panelMotion} transition={{ duration: 0.42, delay: 0.08 }}>
              <div className="map-image" />
              <div className="map-grid" />
              <div className="map-vignette" />

              <div className="map-header">
                <div>
                  <p className="section-kicker">Live 3D model</p>
                  <h2>Koramangala Sector 5</h2>
                  <div className="coordinates"><CircleDot size={13} /> 12.9352° N <span>·</span> 77.6245° E <span>·</span> EPSG:4326</div>
                </div>
                <div className="map-header-actions">
                  <button className="icon-button dark" type="button" onClick={() => toast("Fullscreen model", { description: "The full Cesium workspace opens in the implementation build." })} aria-label="Expand map"><Maximize2 size={17} /></button>
                  <button className="icon-button dark" type="button" onClick={() => toast("Map layers", { description: `${activeLayerCount} active layers in the current view.` })} aria-label="Map settings"><Settings2 size={17} /></button>
                </div>
              </div>

              <div className="map-control-stack">
                <button type="button" onClick={() => toast("Zoom in", { description: "Map zoom adjusted." })}>+</button>
                <button type="button" onClick={() => toast("Zoom out", { description: "Map zoom adjusted." })}>−</button>
                <button type="button" onClick={() => toast("North reset", { description: "Map orientation reset to north." })}><span className="north-mark">N</span></button>
              </div>

              <div className="property-tag"><span className="status-dot cyan" /> SELECTED VOLUME <strong>B12 · FLOOR {activeFloor}</strong></div>

              <div className="building-scene" aria-label="Selected building volume model">
                <div className="ground-plane" />
                <div className="tower-shadow" />
                <div className="tower">
                  {towerFloors.map((floor) => (
                    <button
                      className={`tower-floor ${activeFloor === floor ? "selected" : ""}`}
                      style={{ bottom: `${(floor - 1) * 21 + 28}px` }}
                      type="button"
                      onClick={() => setActiveFloor(floor)}
                      aria-label={`Select floor ${floor}`}
                      key={floor}
                    >
                      <span className="floor-glow" />
                      <em>{floor}</em>
                    </button>
                  ))}
                  <div className="tower-roof" />
                </div>
                <div className="tower-side" />
                <div className="underground-lines"><i /><i /><i /></div>
                <div className="map-pin pin-one"><span />B12</div>
                <div className="map-pin pin-two"><span />P-04</div>
              </div>

              <div className="map-footer">
                <div className="map-scale"><i /><span>50 m</span></div>
                <div className="terrain-key"><span>DSM 2026.06</span><span className="divider-dot">·</span><span>LiDAR classified</span></div>
              </div>
            </motion.article>

            <aside className="inspector-column">
              <motion.article className="inspector-card" {...panelMotion} transition={{ duration: 0.42, delay: 0.13 }}>
                <div className="card-title-row"><div><p className="section-kicker">Property inspector</p><h2>Block B12</h2></div><button className="icon-button ghost" type="button" aria-label="Open inspector"><PanelRightOpen size={17} /></button></div>
                <div className="inspector-visual"><div className="visual-floor floor-top" /><div className="visual-floor floor-mid" /><div className="visual-floor floor-active"><span>F{activeFloor}</span></div><div className="visual-floor floor-low" /><i /></div>
                <div className="inspector-main"><div><p>Active vertical parcel</p><strong>Unit 4C · Floor {activeFloor}</strong></div><SmallBadge tone="green"><Check size={12} /> verified</SmallBadge></div>
                <div className="data-list">
                  <div><span>3D ULPIN</span><code>KA-29-105-0421-B12-F{String(activeFloor).padStart(2, "0")}-021</code></div>
                  <div><span>Volume</span><strong>486.2 m³</strong></div>
                  <div><span>Elevation</span><strong>+{activeFloor * 3.2 - 0.1} m → +{activeFloor * 3.2 + 3.0} m</strong></div>
                </div>
                <button className="secondary-button" type="button" onClick={() => toast("Volume profile loaded", { description: "Review the cadastral volume, rights, and validation history." })}>Review volume profile <ArrowUpRight size={16} /></button>
              </motion.article>

              <motion.article className="layer-card" {...panelMotion} transition={{ duration: 0.42, delay: 0.18 }}>
                <div className="card-title-row"><div><p className="section-kicker">Spatial layers</p><h2>{activeLayerCount} of 4 active</h2></div><Layers3 size={19} /></div>
                <div className="layer-list">
                  {layers.map((layer) => (
                    <label key={layer.key} className="layer-row">
                      <span className="layer-icon" style={{ background: layer.color }} />
                      <span>{layer.label}</span>
                      <input type="checkbox" checked={layersOn[layer.key]} onChange={() => setLayersOn((current) => ({ ...current, [layer.key]: !current[layer.key] }))} />
                      <i className="toggle-track" />
                    </label>
                  ))}
                </div>
              </motion.article>
            </aside>
          </section>

          <section className="lower-grid">
            <motion.article className="activity-card" {...panelMotion} transition={{ duration: 0.42, delay: 0.22 }}>
              <div className="card-title-row"><div><p className="section-kicker">Validation stream</p><h2>Today’s spatial decisions</h2></div><button className="text-action" type="button" onClick={() => toast("Activity archive", { description: "The audit trail is maintained per volume in the full system." })}>View audit trail <ArrowUpRight size={15} /></button></div>
              <div className="activity-list">
                <div className="activity-row"><span className="activity-icon green"><ShieldCheck size={16} /></span><div><strong>Block B12 passed topology validation</strong><p>12 volumes checked · no overlaps or containment errors</p></div><time>08:26</time></div>
                <div className="activity-row"><span className="activity-icon cyan"><FileUp size={16} /></span><div><strong>New LiDAR point cloud received</strong><p>Sector 5 west · 22.4 million classified points</p></div><time>08:11</time></div>
                <div className="activity-row"><span className="activity-icon amber"><AlertTriangle size={16} /></span><div><strong>Review required: utility depth conflict</strong><p>Waterline U-223 intersects proposed parking volume</p></div><time>07:48</time></div>
              </div>
            </motion.article>

            <motion.article className="pipeline-card" {...panelMotion} transition={{ duration: 0.42, delay: 0.27 }}>
              <img src="/manus-storage/ulpin-underground-utilities_6d8a64d1.png" alt="Underground utility mapping visualization" />
              <div className="pipeline-shade" />
              <div className="pipeline-content"><p className="section-kicker">Next in line</p><h2>Resolve the depth conflict before issuing 12 parking volumes.</h2><button className="primary-button warm" type="button" onClick={() => toast("Conflict workspace queued", { description: "The U-223 utility intersection has been added to your review queue." })}>Open conflict workspace <ChevronRight size={16} /></button></div>
            </motion.article>
          </section>

          <section className="source-strip">
            <p>Connected evidence sources</p>
            <div className="source-pills"><span><i />Drone imagery</span><span><i />LiDAR / point cloud</span><span><i />GIS parcel layer</span><span><i />Floor plans</span><span><i />GNSS / CORS</span><span><i />DEM / DSM</span></div>
          </section>
        </div>
      </section>

      {isNavOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setIsNavOpen(false)} />}

      {generatorOpen && (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="ulpin-generator-title">
          <motion.div className="generator-modal" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.24 }}>
            <button className="icon-button modal-close" type="button" aria-label="Close ULPIN generator" onClick={() => setGeneratorOpen(false)}><X size={18} /></button>
            <div className="generator-symbol"><Sparkles size={22} /></div>
            <p className="eyebrow cyan-text">Standardized volume identity</p>
            <h2 id="ulpin-generator-title">Issue a 3D ULPIN</h2>
            <p className="generator-copy">The selected parcel volume has cleared CRS, geometry, containment, and uniqueness checks.</p>
            <div className="generator-code"><span>Proposed identifier</span><code>KA-29-105-0421-B12-F{String(activeFloor).padStart(2, "0")}-021</code></div>
            <div className="generation-checks"><span><Check size={14} /> CRS aligned</span><span><Check size={14} /> topology valid</span><span><Check size={14} /> volume unique</span></div>
            <button className="primary-button generator-button" type="button" disabled={isGenerating} onClick={generateUlpIn}>{isGenerating ? <><span className="button-spinner" /> Generating identity…</> : <><Zap size={17} /> Generate & register</>}</button>
          </motion.div>
        </div>
      )}
    </main>
  );
}
