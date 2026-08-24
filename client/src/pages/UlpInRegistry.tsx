import { trpc } from "@/lib/trpc";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowLeft,
  FileSearch,
  Filter,
  LockKeyhole,
  ScanSearch,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type RecordFilter = "all" | "area-available" | "area-unavailable";
type RecordSort = "name-asc" | "name-desc" | "area-desc" | "area-asc";

function footprintArea(feature: { properties: Record<string, unknown> }) {
  return typeof feature.properties.footprintAreaSquareMetres === "number"
    ? feature.properties.footprintAreaSquareMetres
    : null;
}

export default function UlpInRegistry() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [recordSort, setRecordSort] = useState<RecordSort>("name-asc");
  const [showAll, setShowAll] = useState(false);
  const geometry = trpc.postgis.geojson.useQuery();
  const records = geometry.data?.features ?? [];
  const recordCountLabel = geometry.isLoading
    ? "Loading live source records…"
    : `${records.length} source-attributed footprints available for discovery`;
  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records
      .filter(feature => {
        const name =
          typeof feature.properties.name === "string"
            ? feature.properties.name
            : "";
        const source =
          typeof feature.properties.source === "string"
            ? feature.properties.source
            : "";
        const matchesSearch =
          `${feature.properties.ulpin ?? ""} ${name} ${source}`
            .toLowerCase()
            .includes(normalized);
        const area = footprintArea(feature);
        const matchesFilter =
          recordFilter === "all" ||
          (recordFilter === "area-available" && area !== null) ||
          (recordFilter === "area-unavailable" && area === null);
        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        const leftName = String(left.properties.name ?? left.properties.ulpin);
        const rightName = String(
          right.properties.name ?? right.properties.ulpin
        );
        const leftArea = footprintArea(left) ?? -1;
        const rightArea = footprintArea(right) ?? -1;
        if (recordSort === "name-desc")
          return rightName.localeCompare(leftName);
        if (recordSort === "area-desc") return rightArea - leftArea;
        if (recordSort === "area-asc") return leftArea - rightArea;
        return leftName.localeCompare(rightName);
      });
  }, [query, recordFilter, recordSort, records]);
  const visibleRecords = showAll
    ? filteredRecords
    : filteredRecords.slice(0, 8);

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
              <div className="registry-discovery-controls">
                <label>
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={event => {
                      setQuery(event.target.value);
                      setShowAll(false);
                    }}
                    placeholder="Search ULPIN, source record or place"
                    aria-label="Search source footprint records"
                  />
                </label>
                <div>
                  <label className="registry-select-control">
                    <Filter size={13} />
                    <select
                      value={recordFilter}
                      onChange={event => {
                        setRecordFilter(event.target.value as RecordFilter);
                        setShowAll(false);
                      }}
                      aria-label="Filter ULPIN source records"
                    >
                      <option value="all">All records</option>
                      <option value="area-available">Area available</option>
                      <option value="area-unavailable">Area unavailable</option>
                    </select>
                  </label>
                  <label className="registry-select-control">
                    {recordSort === "name-desc" ? (
                      <ArrowDownAZ size={13} />
                    ) : (
                      <ArrowUpAZ size={13} />
                    )}
                    <select
                      value={recordSort}
                      onChange={event =>
                        setRecordSort(event.target.value as RecordSort)
                      }
                      aria-label="Sort ULPIN source records"
                    >
                      <option value="name-asc">Name: A–Z</option>
                      <option value="name-desc">Name: Z–A</option>
                      <option value="area-desc">Area: high–low</option>
                      <option value="area-asc">Area: low–high</option>
                    </select>
                  </label>
                </div>
              </div>
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
              ) : visibleRecords.length ? (
                visibleRecords.map(feature => {
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
            {filteredRecords.length > 8 && (
              <button
                type="button"
                className="registry-show-more"
                onClick={() => setShowAll(current => !current)}
              >
                {showAll
                  ? "Show first 8 records"
                  : `Show all ${filteredRecords.length} matching records`}
              </button>
            )}
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
