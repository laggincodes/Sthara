import {
  AlertTriangle,
  ArrowLeft,
  Database,
  FlaskConical,
  LockKeyhole,
  MapPinned,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import {
  CesiumSpatialViewer,
  type CesiumLayerFlags,
  type MapCommand,
  type SyntheticVisualLayers,
} from "@/components/CesiumSpatialViewer";
import { trpc } from "@/lib/trpc";
import reraEvidence from "../../../submission/kusum-suresh-enclave-rera-evidence.json";

const DEMO_LAYERS: CesiumLayerFlags = {
  parcels: true,
  buildings: true,
  utilities: false,
  terrain: true,
};

export default function SyntheticGcpDemo() {
  const [, setLocation] = useLocation();
  const demo = trpc.postgis.syntheticGcpDemo.useQuery();
  const demoQuery = new URLSearchParams(window.location.search);
  const [command, setCommand] = useState<MapCommand>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">(() =>
    demoQuery.get("view") === "2d" ? "2d" : "3d"
  );
  const [syntheticVisualLayers, setSyntheticVisualLayers] =
    useState<SyntheticVisualLayers>({
      simulatedDroneImagery:
        demoQuery.get("layers")?.includes("drone") ?? false,
      simulatedLidarPointCloud:
        demoQuery.get("layers")?.includes("lidar") ?? false,
    });
  const [inspectorOpen, setInspectorOpen] = useState(
    () => demoQuery.get("inspect") === "rera"
  );
  const [ulpinSimulationOpen, setUlpInSimulationOpen] = useState(
    () => demoQuery.get("simulate") === "ulpin"
  );
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
  const rera = reraEvidence.kusumSureshEnclave;
  return (
    <main className="synthetic-demo-workspace">
      <header className="synthetic-demo-topbar">
        <button type="button" onClick={() => setLocation("/dashboard")}>
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
              syntheticDemoView={viewMode}
              syntheticVisualLayers={syntheticVisualLayers}
              onSyntheticDemoSelect={() => setInspectorOpen(true)}
            />
            <div className="synthetic-demo-map-badge" role="status">
              <FlaskConical size={15} />
              <span>
                <b>DEMO / NON-AUTHORITATIVE</b>
                <small>Synthetic GCP geometry · never a parcel boundary</small>
              </span>
            </div>
            {inspectorOpen && (
              <aside
                className="synthetic-demo-map-inspector"
                aria-label="RERA authority attributes"
              >
                <div className="synthetic-demo-map-inspector-heading">
                  <span>
                    <ShieldAlert size={16} /> Separate RERA authority record
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    aria-label="Close RERA inspector"
                  >
                    <X size={15} />
                  </button>
                </div>
                <strong>{rera.displayLabel}</strong>
                <p>
                  These are separately sourced RERA attributes. They do not
                  validate the synthetic geometry currently selected.
                </p>
                <dl>
                  <div>
                    <dt>Plot / Mauza</dt>
                    <dd>
                      {rera.projectLocation.khesraPlot} ·{" "}
                      {rera.projectLocation.mauza}
                    </dd>
                  </div>
                  <div>
                    <dt>Circle / District</dt>
                    <dd>{rera.projectLocation.anchal} · Patna</dd>
                  </div>
                  <div>
                    <dt>Sanctioned floors</dt>
                    <dd>
                      {rera.statedAuthorityFacts.sanctionedFloorsSourceValue}
                    </dd>
                  </div>
                  <div>
                    <dt>Land area</dt>
                    <dd>
                      {rera.statedAuthorityFacts.totalLandAreaSquareMetres.toLocaleString()}{" "}
                      m²
                    </dd>
                  </div>
                  <div>
                    <dt>Covered area</dt>
                    <dd>
                      {rera.statedAuthorityFacts.coverageAreaSquareMetres.toLocaleString()}{" "}
                      m²
                    </dd>
                  </div>
                  <div>
                    <dt>Built-up area</dt>
                    <dd>
                      {rera.statedAuthorityFacts.totalBuiltupAreaSquareMetres.toLocaleString()}{" "}
                      m²
                    </dd>
                  </div>
                </dl>
                <small>
                  Height, footprint, ownership, and vertical ULPIN remain locked
                  pending independent authority evidence.
                </small>
                <button
                  className="synthetic-demo-ulpin-simulate"
                  type="button"
                  onClick={() => setUlpInSimulationOpen(current => !current)}
                >
                  <FlaskConical size={14} />
                  {ulpinSimulationOpen
                    ? "Close ULPIN simulation"
                    : "Simulate 3D ULPIN preview"}
                </button>
                {ulpinSimulationOpen && (
                  <div className="synthetic-demo-ulpin-preview">
                    <b>SIMULATION PREVIEW · NOT ISSUED</b>
                    <span>
                      Demonstrates the workflow state only. No identifier, legal
                      right, or registered 3D ULPIN has been created.
                    </span>
                  </div>
                )}
              </aside>
            )}
            <div className="synthetic-demo-map-actions">
              <div
                className="synthetic-demo-view-toggle"
                aria-label="Synthetic geometry display"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "2d"}
                  onClick={() => setViewMode("2d")}
                >
                  2D plan
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "3d"}
                  onClick={() => setViewMode("3d")}
                >
                  3D prototype
                </button>
              </div>
              <button
                type="button"
                onClick={() => issueCommand("focus-synthetic-demo")}
              >
                <RotateCcw size={14} /> Reset {viewMode === "3d" ? "3D" : "2D"}{" "}
                view
              </button>
              <small>
                {viewMode === "3d"
                  ? "12 m synthetic visual test only"
                  : "Plan-style synthetic outline only"}
              </small>
              <div className="synthetic-demo-layer-menu">
                <p>SIMULATED VISUAL CONTEXT ONLY</p>
                <label>
                  <input
                    type="checkbox"
                    checked={syntheticVisualLayers.simulatedDroneImagery}
                    onChange={event =>
                      setSyntheticVisualLayers(current => ({
                        ...current,
                        simulatedDroneImagery: event.target.checked,
                      }))
                    }
                  />
                  Simulated drone imagery
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={syntheticVisualLayers.simulatedLidarPointCloud}
                    onChange={event =>
                      setSyntheticVisualLayers(current => ({
                        ...current,
                        simulatedLidarPointCloud: event.target.checked,
                      }))
                    }
                  />
                  Simulated LiDAR points
                </label>
              </div>
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
