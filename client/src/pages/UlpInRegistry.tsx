import { trpc } from "@/lib/trpc";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowLeft,
  Clipboard,
  Database,
  Download,
  FileSearch,
  Filter,
  History,
  Info,
  LockKeyhole,
  MapPinned,
  ScanSearch,
  Search,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RecordFilter = "all" | "area-available" | "area-unavailable" | "favorites";
type RecordSort = "name-asc" | "name-desc" | "area-desc" | "area-asc";
type SourceRecord = { properties: Record<string, unknown> };
type PersonalAnnotation = { note: string; tags: string[] };
const PERSONAL_ANNOTATIONS_STORAGE_KEY = "ulpin-vpm-personal-annotations-v1";
const PERSONAL_FAVORITES_STORAGE_KEY = "ulpin-vpm-personal-favorites-v1";

function footprintArea(feature: { properties: Record<string, unknown> }) {
  return typeof feature.properties.footprintAreaSquareMetres === "number"
    ? feature.properties.footprintAreaSquareMetres
    : null;
}

function recordText(value: unknown, fallback = "Not available") {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function readPersonalAnnotations(): Record<string, PersonalAnnotation> {
  try {
    const stored = window.localStorage.getItem(
      PERSONAL_ANNOTATIONS_STORAGE_KEY
    );
    return stored
      ? (JSON.parse(stored) as Record<string, PersonalAnnotation>)
      : {};
  } catch {
    return {};
  }
}

function readPersonalFavorites() {
  try {
    const stored = window.localStorage.getItem(PERSONAL_FAVORITES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export default function UlpInRegistry() {
  const [, setLocation] = useLocation();
  const sharedRecordId =
    new URLSearchParams(window.location.search).get("record") ?? "";
  const [query, setQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [recordSort, setRecordSort] = useState<RecordSort>("name-asc");
  const [showAll, setShowAll] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SourceRecord | null>(
    null
  );
  const [personalAnnotations, setPersonalAnnotations] = useState<
    Record<string, PersonalAnnotation>
  >(readPersonalAnnotations);
  const [personalFavorites, setPersonalFavorites] = useState<string[]>(
    readPersonalFavorites
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const handledSharedRecordRef = useRef("");
  const geometry = trpc.postgis.geojson.useQuery();
  const records = geometry.data?.features ?? [];
  const totalAvailableArea = useMemo(
    () =>
      records.reduce((sum, record) => sum + (footprintArea(record) ?? 0), 0),
    [records]
  );
  const tagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(personalAnnotations).forEach(annotation => {
      annotation.tags.forEach(tag =>
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      );
    });
    return Array.from(counts.entries()).sort(
      (left, right) => right[1] - left[1]
    );
  }, [personalAnnotations]);
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
          (recordFilter === "area-unavailable" && area === null) ||
          (recordFilter === "favorites" &&
            personalFavorites.includes(String(feature.properties.ulpin ?? "")));
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
  }, [personalFavorites, query, recordFilter, recordSort, records]);
  const visibleRecords = showAll
    ? filteredRecords
    : filteredRecords.slice(0, 8);
  const focusRecordOnMap = (record: SourceRecord) => {
    const ulpin = recordText(record.properties.ulpin, "");
    if (!ulpin) return;
    setLocation(
      `/workspace?segment=buildings&site=${encodeURIComponent(ulpin)}`
    );
  };
  const toggleFavorite = (record: SourceRecord) => {
    const recordId = recordText(record.properties.ulpin, "");
    if (!recordId) return;
    setPersonalFavorites(current => {
      const next = current.includes(recordId)
        ? current.filter(candidate => candidate !== recordId)
        : [...current, recordId];
      window.localStorage.setItem(
        PERSONAL_FAVORITES_STORAGE_KEY,
        JSON.stringify(next)
      );
      return next;
    });
  };
  const exportFilteredRecords = () => {
    if (!filteredRecords.length) return;
    const heading = [
      "Source record ID",
      "Name",
      "Footprint area (m²)",
      "Evidence state",
      "Source/provenance",
      "Issued vertical ULPIN",
      "History status",
    ];
    const rows = filteredRecords.map(record => [
      recordText(record.properties.ulpin),
      recordText(record.properties.name, "Source-traced footprint"),
      footprintArea(record) ?? "Area unavailable",
      "Public footprint only",
      recordText(record.properties.source),
      "No — source record only",
      "Not exposed by current source feed",
    ]);
    const csv = [heading, ...rows]
      .map(row => row.map(csvCell).join(","))
      .join("\n");
    const downloadUrl = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `ulpin-source-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };
  const selectedRecordId = selectedRecord
    ? recordText(selectedRecord.properties.ulpin, "")
    : "";
  const selectedAnnotation = selectedRecordId
    ? (personalAnnotations[selectedRecordId] ?? { note: "", tags: [] })
    : { note: "", tags: [] };
  const updatePersonalAnnotation = (
    recordId: string,
    update: Partial<PersonalAnnotation>
  ) => {
    if (!recordId) return;
    setPersonalAnnotations(current => {
      const next = {
        ...current,
        [recordId]: {
          note: current[recordId]?.note ?? "",
          tags: current[recordId]?.tags ?? [],
          ...update,
        },
      };
      window.localStorage.setItem(
        PERSONAL_ANNOTATIONS_STORAGE_KEY,
        JSON.stringify(next)
      );
      return next;
    });
  };
  const openRecordDetails = (record: SourceRecord) => {
    const recordId = recordText(record.properties.ulpin, "");
    setSelectedRecord(record);
    setNoteDraft(personalAnnotations[recordId]?.note ?? "");
    setTagDraft("");
  };
  const exportRecordPdf = async (record: SourceRecord) => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const recordId = recordText(record.properties.ulpin, "Source-record");
    const annotation = personalAnnotations[recordId];
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
    addWrapped("3D ULPIN-VPM · Source record detail export", 9, true);
    addWrapped(recordText(record.properties.name, "Source record"), 20, true);
    addWrapped(
      "This report documents displayed source-record metadata only. It does not issue a vertical ULPIN or establish ownership, legal boundary, height, floor, survey, or audit history."
    );
    addSection("Available source metadata", [
      `Source record ID: ${recordId}`,
      `Footprint area: ${footprintArea(record)?.toLocaleString() ?? "Area unavailable"}${footprintArea(record) !== null ? " m²" : ""}`,
      "Evidence state: Public footprint only",
      `Source / provenance: ${recordText(record.properties.source)}`,
      `Record type: ${recordText(record.properties.recordType, "Source-backed geometry")}`,
    ]);
    addSection("Evidence boundaries", [
      "Issued vertical ULPIN: No — source record only.",
      "History status: Not exposed by the current source feed.",
      "Ownership, issue history and authority audit trail: Not available unless separately supplied by an authorized source.",
    ]);
    if (annotation?.note || annotation?.tags.length) {
      addSection("Personal browser-local annotation · non-authoritative", [
        `Tags: ${annotation.tags.join(", ") || "No tags"}`,
        `Note: ${annotation.note || "No note"}`,
      ]);
    }
    addWrapped(
      "Generated from the dashboard’s live source-record display. Any personal note or tag is stored locally in this browser and is not an official record.",
      8
    );
    pdf.save(
      `ulpin-source-record-${recordId.replaceAll(/[^a-z0-9_-]+/gi, "-")}.pdf`
    );
  };
  const copyRecordLink = async () => {
    if (!selectedRecordId) return;
    const directLink = `${window.location.origin}/ulpin-registry?record=${encodeURIComponent(selectedRecordId)}`;
    try {
      await navigator.clipboard.writeText(directLink);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = directLink;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
    setShareState("copied");
    window.setTimeout(() => setShareState("idle"), 1800);
  };

  useEffect(() => {
    if (
      !sharedRecordId ||
      selectedRecordId === sharedRecordId ||
      handledSharedRecordRef.current === sharedRecordId
    )
      return;
    const sharedRecord = records.find(
      record => String(record.properties.ulpin ?? "") === sharedRecordId
    );
    if (sharedRecord) {
      handledSharedRecordRef.current = sharedRecordId;
      openRecordDetails(sharedRecord);
    }
  }, [records, selectedRecordId, sharedRecordId]);

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
            <div
              className="registry-summary-panel"
              aria-label="Registry summary"
            >
              <article>
                <span>Total source records</span>
                <strong>{records.length.toLocaleString()}</strong>
                <small>Traceability records · not issued ULPINs</small>
              </article>
              <article>
                <span>Total available footprint area</span>
                <strong>{totalAvailableArea.toLocaleString()} m²</strong>
                <small>Sum of source-provided footprint areas only</small>
              </article>
              <article>
                <span>Personal custom tags</span>
                <strong>{tagSummary.length}</strong>
                <small>Browser-local · non-authoritative</small>
                <div>
                  {tagSummary.length ? (
                    tagSummary.slice(0, 4).map(([tag, count]) => (
                      <i key={tag}>
                        {tag} <b>×{count}</b>
                      </i>
                    ))
                  ) : (
                    <i>No custom tags yet</i>
                  )}
                </div>
              </article>
            </div>
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
                      <option value="favorites">
                        Favorites ({personalFavorites.length})
                      </option>
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
                <button
                  type="button"
                  className="registry-export"
                  disabled={!filteredRecords.length}
                  onClick={exportFilteredRecords}
                >
                  <Download size={13} /> Export {filteredRecords.length} CSV
                </button>
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
                <span>Actions</span>
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
                  const recordId = String(feature.properties.ulpin ?? "");
                  const isFavorite = personalFavorites.includes(recordId);
                  return (
                    <div
                      className="registry-table-row"
                      role="row"
                      key={String(feature.properties.ulpin)}
                    >
                      <button
                        type="button"
                        className="registry-record-focus"
                        onClick={() => focusRecordOnMap(feature)}
                        title="Open the live 3D map focused on this source record"
                      >
                        <b>{name}</b>
                        <small>{String(feature.properties.ulpin)}</small>
                      </button>
                      <span>{area}</span>
                      <span>
                        <i /> Public footprint only
                      </span>
                      <span className="registry-row-actions">
                        <button
                          type="button"
                          className={isFavorite ? "is-favorite" : ""}
                          onClick={() => toggleFavorite(feature)}
                          title={
                            isFavorite
                              ? "Remove browser-local favorite"
                              : "Save browser-local favorite"
                          }
                          aria-label={
                            isFavorite
                              ? `Remove ${name} from favorites`
                              : `Add ${name} to favorites`
                          }
                        >
                          <Star
                            size={14}
                            fill={isFavorite ? "currentColor" : "none"}
                          />
                          Favorite
                        </button>
                        <button
                          type="button"
                          onClick={() => focusRecordOnMap(feature)}
                          title="Fly to this source geometry"
                          aria-label={`Open the 3D map for ${name}`}
                        >
                          <MapPinned size={14} /> Map
                        </button>
                        <button
                          type="button"
                          onClick={() => openRecordDetails(feature)}
                          title="View source record metadata"
                          aria-label={`View details for ${name}`}
                        >
                          <ScanSearch size={14} /> Details
                        </button>
                      </span>
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
      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={open => {
          if (!open) {
            setSelectedRecord(null);
            setTagDraft("");
          }
        }}
      >
        <DialogContent className="registry-detail-dialog">
          <DialogHeader>
            <DialogTitle>
              {recordText(selectedRecord?.properties.name, "Source record")}
            </DialogTitle>
            <DialogDescription>
              Source-record metadata only. This is not an issued vertical ULPIN
              or a legal ownership record.
            </DialogDescription>
          </DialogHeader>
          <section className="registry-detail-section">
            <p>
              <Database size={14} /> Available source metadata
            </p>
            <dl>
              <div>
                <dt>Source record ID</dt>
                <dd>{recordText(selectedRecord?.properties.ulpin)}</dd>
              </div>
              <div>
                <dt>Footprint area</dt>
                <dd>
                  {selectedRecord && footprintArea(selectedRecord) !== null
                    ? `${footprintArea(selectedRecord)?.toLocaleString()} m²`
                    : "Area unavailable"}
                </dd>
              </div>
              <div>
                <dt>Evidence state</dt>
                <dd>Public footprint only</dd>
              </div>
              <div>
                <dt>Source / provenance</dt>
                <dd>{recordText(selectedRecord?.properties.source)}</dd>
              </div>
              <div>
                <dt>Record type</dt>
                <dd>
                  {recordText(
                    selectedRecord?.properties.recordType,
                    "Source-backed geometry"
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <section className="registry-history-note">
            <History size={15} />
            <span>
              <b>History is not available in this source feed.</b>
              <small>
                No revision timeline, ownership history, issue history, or
                authority audit trail is shown because the current source record
                does not expose it.
              </small>
            </span>
          </section>
          <section className="registry-annotation-panel">
            <p>
              <Tag size={14} /> Personal notes & tags
            </p>
            <small>
              Stored only in this browser. These annotations are not official
              ULPIN, ownership, survey, or authority records.
            </small>
            <div className="registry-tag-list" aria-label="Personal tags">
              {selectedAnnotation.tags.length ? (
                selectedAnnotation.tags.map(tag => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() =>
                      updatePersonalAnnotation(selectedRecordId, {
                        tags: selectedAnnotation.tags.filter(
                          currentTag => currentTag !== tag
                        ),
                      })
                    }
                    title={`Remove ${tag}`}
                  >
                    {tag} ×
                  </button>
                ))
              ) : (
                <span>No personal tags yet.</span>
              )}
            </div>
            <div className="registry-add-tag">
              <input
                value={tagDraft}
                onChange={event => setTagDraft(event.target.value)}
                placeholder="Add a personal tag"
                aria-label="Add a personal tag"
                maxLength={48}
              />
              <button
                type="button"
                onClick={() => {
                  const tag = tagDraft.trim();
                  if (!tag || selectedAnnotation.tags.includes(tag)) return;
                  updatePersonalAnnotation(selectedRecordId, {
                    tags: [...selectedAnnotation.tags, tag],
                  });
                  setTagDraft("");
                }}
              >
                Add tag
              </button>
            </div>
            <label>
              <span>Personal note</span>
              <textarea
                value={noteDraft}
                onChange={event => setNoteDraft(event.target.value)}
                onBlur={() =>
                  updatePersonalAnnotation(selectedRecordId, {
                    note: noteDraft.trim(),
                  })
                }
                placeholder="Add an observation for your own workspace…"
                maxLength={1200}
              />
            </label>
          </section>
          <div className="registry-detail-actions">
            <button
              type="button"
              onClick={() => {
                if (selectedRecord) focusRecordOnMap(selectedRecord);
              }}
            >
              <MapPinned size={14} /> Open focused 3D map
            </button>
            <button
              type="button"
              className="registry-detail-pdf"
              onClick={() => {
                if (selectedRecord) void exportRecordPdf(selectedRecord);
              }}
            >
              <Download size={14} /> Download detail PDF
            </button>
            <button
              type="button"
              className="registry-detail-share"
              onClick={() => void copyRecordLink()}
            >
              <Clipboard size={14} />
              {shareState === "copied" ? "Link copied" : "Copy direct link"}
            </button>
            <span>
              <Info size={13} /> Issuance remains evidence-gated
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
