import {
  AlertTriangle,
  ArrowLeft,
  Database,
  FlaskConical,
  LockKeyhole,
  MapPinned,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import {
  CesiumSpatialViewer,
  type CesiumLayerFlags,
  type MapCommand,
} from "@/components/CesiumSpatialViewer";
import { trpc } from "@/lib/trpc";

const DEMO_LAYERS: CesiumLayerFlags = {
  parcels: true,
  buildings: true,
  utilities: false,
  terrain: true,
};

export default function SyntheticGcpDemo() {
  const [, setLocation] = useLocation();
  const demo = trpc.postgis.syntheticGcpDemo.useQuery();
  const [command, setCommand] = useState<MapCommand>(null);
  const issueCommand = useCallback((kind: NonNullable<MapCommand>["kind"]) => {
    setCommand({ kind, nonce: Date.now() });
  }, []);

  if (demo.isLoading || !demo.data) {
    return (
      <main className="synthetic-demo-workspace synthetic-demo-loading">
        <FlaskConical size={22} /> Preparing non-authoritative transform demo…
      </main>
    );
  }
  if (demo.error) {
    return (
      <main className="synthetic-demo-workspace synthetic-demo-loading">
        <AlertTriangle size={22} /> The synthetic demo contract could not be
        prepared.
      </main>
    );
  }

  const feature = demo.data.geoJson.features[0];
  return (
    <main className="synthetic-demo-workspace">
      <header className="synthetic-demo-topbar">
        <button type="button" onClick={() => setLocation("/")}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div>
          <FlaskConical size={15} /> <strong>Prototype lab</strong>
        </div>
        <button
          type="button"
          onClick={() => issueCommand("focus-synthetic-demo")}
        >
          <MapPinned size={15} /> Focus demo geometry
        </button>
      </header>

      <section className="synthetic-demo-content">
        <section className="synthetic-demo-hero">
          <div>
            <p>DEMO / NON-AUTHORITATIVE</p>
            <h1>Synthetic GCP transform lab.</h1>
            <span>
              This is a reproducible EPSG:4326 transformation test for the
              supplied synthetic controls. It is not a survey, cadastral record,
              GNSS observation, government geometry, legal parcel, building
              footprint, or ULPIN.
            </span>
          </div>
          <div className="synthetic-demo-lock">
            <ShieldAlert size={21} />
            <span>
              <b>Authoritative evidence remains locked</b>
              <small>
                RERA attributes remain separate from this prototype input.
              </small>
            </span>
          </div>
        </section>

        <section className="synthetic-demo-grid">
          <div className="synthetic-demo-map-card">
            <CesiumSpatialViewer
              command={command}
              layers={DEMO_LAYERS}
              syntheticDemoFeature={feature}
            />
            <div className="synthetic-demo-map-actions">
              <button
                type="button"
                onClick={() => issueCommand("focus-synthetic-demo")}
              >
                <RotateCcw size={14} /> Reset demo view
              </button>
              <small>Synthetic visual extrusion: 12 m test value only</small>
            </div>
          </div>

          <aside className="synthetic-demo-results">
            <div className="synthetic-demo-result-heading">
              <p>Transform validation</p>
              <b>EPSG:4326 contract preview</b>
            </div>
            <dl>
              <div>
                <dt>Control points</dt>
                <dd>
                  {demo.data.validation.controlPointCount} synthetic points
                </dd>
              </div>
              <div>
                <dt>Plan bounds</dt>
                <dd>
                  {demo.data.validation.allPointsWithinDeclaredPlanBounds
                    ? "Valid"
                    : "Invalid"}
                </dd>
              </div>
              <div>
                <dt>Non-collinearity</dt>
                <dd>
                  {demo.data.validation.nonCollinear ? "Valid" : "Invalid"}
                </dd>
              </div>
              <div>
                <dt>Affine RMS</dt>
                <dd>{demo.data.validation.rmsMetres.toFixed(3)} m</dd>
              </div>
            </dl>
            <div className="synthetic-demo-persistence">
              <Database size={17} />
              <span>
                <b>PostGIS-shaped payload preview only</b>
                <small>{demo.data.ingestionContract.detail}</small>
              </span>
            </div>
            <div className="synthetic-demo-lock-list">
              <div>
                <LockKeyhole size={14} /> No authoritative footprint
              </div>
              <div>
                <LockKeyhole size={14} /> No approved-height extrusion
              </div>
              <div>
                <LockKeyhole size={14} /> No ownership or vertical ULPIN
              </div>
            </div>
          </aside>
        </section>

        <section className="synthetic-demo-footnote">
          <AlertTriangle size={17} />
          <p>
            <b>Prototype boundary:</b> the four supplied coordinates are
            intentionally synthetic. The real Bihar RERA facts for KUSUM SURESH
            ENCLAVE remain source-cited separately and are not used to validate,
            scale, or legalize this geometry.
          </p>
        </section>
      </section>
    </main>
  );
}
