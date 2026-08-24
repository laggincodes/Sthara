import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Layers3,
  MapPinned,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  Satellite,
} from "lucide-react";
import { useLocation } from "wouter";

const officialDataRoutes = [
  {
    title: "BhuNaksha · Digha cadastral workflow",
    label: "Cadastral-map route",
    detail:
      "Patna → Patna Sadar → Patna Rural → Digha (0161) → RS Map 07 → Sheet 00 was publicly selectable. Plot 808 returned no visible result during review.",
    lock: "No parcel boundary, holder, area, or ULPIN imported.",
    href: "https://bhunaksha.bihar.gov.in/10/indexmain.jsp",
    icon: MapPinned,
  },
  {
    title: "BiharBhumi · revenue-service navigation",
    label: "Revenue-record route",
    detail:
      "The official service index exposes Jamabandi, LPC, Bhu-Manchitra, and e-Mapi workflows, including application and status routes.",
    lock: "No project-specific or private ownership record retrieved.",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/",
    icon: FileCheck2,
  },
  {
    title: "Patna AutoMAP · approved-plan workflow",
    label: "Building-approval route",
    detail:
      "The official PMC BPAS guidance requires plot details, a registered technical person, secured APZ plan material, supporting documents, and an application workflow.",
    lock: "No public project approval, plan, height, or footprint retrieved.",
    href: "https://automap.bihar.gov.in/PATNABPASPORTAL/Home",
    icon: ShieldCheck,
  },
  {
    title: "Survey of India CORS · GNSS survey workflow",
    label: "Survey-control route",
    detail:
      "Official SOPs cover registration, data downloading, DGNSS/NRTK survey, post-processing, and VRS data workflows.",
    lock: "No GCP can be generated; authorized survey control is required.",
    href: "https://surveyofindia.gov.in/pages/continuously-operating-reference-stations-cors-",
    icon: Satellite,
  },
] as const;

export default function PropertyVolumes() {
  const [, setLocation] = useLocation();
  const geometry = trpc.postgis.geojson.useQuery();
  const liveRecords = geometry.data?.features ?? [];
  const isLoadingRecords = geometry.isLoading;
  const heightApprovedCount = liveRecords.filter(
    feature => typeof feature.properties.approvedHeightMetres === "number"
  ).length;

  return (
    <main className="volume-workspace">
      <header className="volume-topbar">
        <button type="button" onClick={() => setLocation("/")}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div>
          <span>Operations</span>
          <b>›</b>
          <strong>Property volumes</strong>
        </div>
        <button
          className="volume-outline-button"
          type="button"
          onClick={() => setLocation("/workspace?segment=buildings")}
        >
          <ScanSearch size={15} /> Explore buildings
        </button>
      </header>

      <section className="volume-content">
        <div className="volume-intro">
          <div>
            <p>Evidence-gated property volumes</p>
            <h1>Vertical-property review, without invented 3D rights.</h1>
            <span>
              This workspace is distinct from map search. It explains what
              evidence is required before a footprint becomes an extruded
              building, a floor-by-floor model, or an issued vertical ULPIN.
            </span>
          </div>
          <div className="volume-status">
            <LockKeyhole size={18} />
            <div>
              <small>Current registry state</small>
              <strong>No vertical ULPINs issued</strong>
            </div>
          </div>
        </div>

        <div className="volume-metrics">
          <article>
            <ScanSearch size={18} />
            <span>Live source footprints</span>
            <strong>{isLoadingRecords ? "—" : liveRecords.length}</strong>
            <small>
              {isLoadingRecords
                ? "Loading source records"
                : "Spatial references only"}
            </small>
          </article>
          <article>
            <Layers3 size={18} />
            <span>Verified-height records</span>
            <strong>{isLoadingRecords ? "—" : heightApprovedCount}</strong>
            <small>
              {isLoadingRecords
                ? "Loading source records"
                : "Potential Level 2 inputs"}
            </small>
          </article>
          <article>
            <Box size={18} />
            <span>Floor/BIM evidence</span>
            <strong>0</strong>
            <small>No Level 3 model asserted</small>
          </article>
          <article>
            <ShieldCheck size={18} />
            <span>Vertical ULPINs</span>
            <strong>0</strong>
            <small>No issued identities in this demo</small>
          </article>
        </div>

        <section
          className="volume-ladder"
          aria-label="Evidence gates for property volumes"
        >
          <article className="volume-step active">
            <span>01</span>
            <div>
              <p>Source footprint</p>
              <h2>Level 1 — outline review</h2>
              <small>
                Public geometry can show a footprint and geometry-backed area
                only.
              </small>
            </div>
            <CheckCircle2 size={18} />
          </article>
          <article className="volume-step">
            <span>02</span>
            <div>
              <p>Approved height + exact footprint</p>
              <h2>Level 2 — building extrusion</h2>
              <small>
                Requires an authority-backed metre height and a defensible
                footprint match.
              </small>
            </div>
            <LockKeyhole size={18} />
          </article>
          <article className="volume-step">
            <span>03</span>
            <div>
              <p>Official floor plan/BIM + registration</p>
              <h2>Level 3 — vertical identity review</h2>
              <small>
                Requires floor geometry and approved vertical-property
                registration evidence.
              </small>
            </div>
            <LockKeyhole size={18} />
          </article>
        </section>

        <section className="volume-callout">
          <div>
            <p>Why this is separate from Buildings</p>
            <strong>
              3D visual context is not a property volume or a legal right.
            </strong>
            <span>
              Search the Buildings explorer for source-backed map context.
              Return here only when authority evidence is ready for a formal
              property-volume review.
            </span>
          </div>
          <button type="button" onClick={() => setLocation("/ulpin-registry")}>
            View ULPIN registry <ArrowLeft size={15} />
          </button>
        </section>

        <section
          className="official-data-panel"
          aria-label="Official authority-data access routes"
        >
          <div className="official-data-panel-heading">
            <div>
              <p>Authority data access</p>
              <h2>Verified government workflows, not inferred records.</h2>
            </div>
            <small>
              Retrieved 24 Aug 2026 · Use the official source before any
              cadastral, approval, or survey claim.
            </small>
          </div>
          <div className="official-data-route-grid">
            {officialDataRoutes.map(route => {
              const Icon = route.icon;
              return (
                <article key={route.title}>
                  <Icon size={18} />
                  <span>{route.label}</span>
                  <h3>{route.title}</h3>
                  <p>{route.detail}</p>
                  <small>{route.lock}</small>
                  <a href={route.href} target="_blank" rel="noreferrer">
                    Open official route <ExternalLink size={13} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
