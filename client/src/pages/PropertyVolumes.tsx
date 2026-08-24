import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Layers3,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";

export default function PropertyVolumes() {
  const [, setLocation] = useLocation();
  const geometry = trpc.postgis.geojson.useQuery();
  const liveRecords = geometry.data?.features ?? [];
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
            <strong>{liveRecords.length}</strong>
            <small>Spatial references only</small>
          </article>
          <article>
            <Layers3 size={18} />
            <span>Verified-height records</span>
            <strong>{heightApprovedCount}</strong>
            <small>Potential Level 2 inputs</small>
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
      </section>
    </main>
  );
}
