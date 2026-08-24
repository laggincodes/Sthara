import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  FileSearch,
  LockKeyhole,
  ScanSearch,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function UlpInRegistry() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const geometry = trpc.postgis.geojson.useQuery();
  const records = geometry.data?.features ?? [];
  const recordCountLabel = geometry.isLoading
    ? "Loading live source records…"
    : `${records.length} source-attributed footprints available for discovery`;
  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return records.slice(0, 8);
    return records
      .filter(feature => {
        const name =
          typeof feature.properties.name === "string"
            ? feature.properties.name
            : "";
        return `${feature.properties.ulpin ?? ""} ${name}`
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 8);
  }, [query, records]);

  return (
    <main className="registry-workspace">
      <header className="registry-topbar">
        <button type="button" onClick={() => setLocation("/")}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div>
          <span>Operations</span>
          <b>›</b>
          <strong>ULPIN registry</strong>
        </div>
        <button
          type="button"
          onClick={() => setLocation("/?issue=eligibility")}
        >
          <ShieldCheck size={15} /> Review eligibility
        </button>
      </header>

      <section className="registry-content">
        <div className="registry-intro">
          <div>
            <p>Evidence-safe identity registry</p>
            <h1>
              Search source records. Issue no identity until evidence is
              complete.
            </h1>
            <span>
              Live source-footprint IDs are traceability references, not issued
              ULPINs. This registry keeps the distinction visible.
            </span>
          </div>
          <div className="registry-issued-state">
            <LockKeyhole size={17} />
            <span>
              <small>Issued vertical ULPINs</small>
              <strong>0</strong>
            </span>
          </div>
        </div>

        <div className="registry-layout">
          <section className="registry-records">
            <div className="registry-records-heading">
              <div>
                <p>Live source records</p>
                <span>{recordCountLabel}</span>
              </div>
              <label>
                <Search size={15} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search source record or place"
                  aria-label="Search source footprint records"
                />
              </label>
            </div>
            <div
              className="registry-table"
              role="table"
              aria-label="Live source footprint records"
            >
              <div className="registry-table-head" role="row">
                <span>Source record</span>
                <span>Footprint area</span>
                <span>Evidence state</span>
                <span />
              </div>
              {geometry.isLoading ? (
                <div className="registry-empty">
                  <FileSearch size={18} /> Loading live source records…
                </div>
              ) : filteredRecords.length ? (
                filteredRecords.map(feature => {
                  const name =
                    typeof feature.properties.name === "string"
                      ? feature.properties.name
                      : "Source-traced footprint";
                  const area =
                    typeof feature.properties.footprintAreaSquareMetres ===
                    "number"
                      ? `${feature.properties.footprintAreaSquareMetres.toLocaleString()} m²`
                      : "Area unavailable";
                  return (
                    <div
                      className="registry-table-row"
                      role="row"
                      key={String(feature.properties.ulpin)}
                    >
                      <span>
                        <b>{name}</b>
                        <small>{String(feature.properties.ulpin)}</small>
                      </span>
                      <span>{area}</span>
                      <span>
                        <i /> Public footprint only
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setLocation(
                            `/workspace?segment=buildings&site=${encodeURIComponent(String(feature.properties.ulpin))}`
                          )
                        }
                      >
                        <ScanSearch size={14} /> Inspect
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="registry-empty">
                  <FileSearch size={18} /> No live source record matches this
                  query.
                </div>
              )}
            </div>
          </section>

          <aside className="registry-gate">
            <p>Vertical ULPIN issue gate</p>
            <h2>Required before issuance</h2>
            <ol>
              <li>
                <span>01</span> Exact authoritative footprint or parcel geometry
              </li>
              <li>
                <span>02</span> Reviewed metre-height and floor/BIM evidence
              </li>
              <li>
                <span>03</span> Approved vertical-property registration evidence
              </li>
            </ol>
            <div>
              <LockKeyhole size={16} />
              <span>
                <b>Issuance locked</b>
                <small>
                  Source IDs shown here cannot be converted into legal or
                  vertical ULPINs by AI or imagery.
                </small>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/?issue=eligibility")}
            >
              View eligibility requirements
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
