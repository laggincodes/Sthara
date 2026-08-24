---
name: evidence-safe-campus-intelligence
description: Build or audit campus/place intelligence features that combine AI search, public building footprints, institutional evidence, and 3D dashboards. Use when adding campus building search, evidence badges, source-cited institutional records, footprint-area summaries, or height/floor/vertical-ULPIN locks without fabricating cadastral or survey facts.
---

# Evidence-Safe Campus Intelligence

Use this workflow when a product must answer natural-language place queries while keeping public geometry, institution-level records, surveyed dimensions, and cadastral rights strictly separate.

## Evidence decision table

| Evidence available | Allowed output | Keep locked |
| --- | --- | --- |
| Source-attributed public footprint | Outline, footprint area, count, provenance | Building identity, parcel, owner, height, floors, ULPIN |
| Official institution page/report with building figures | Source-cited institution record | Exact live-footprint match, GIS polygon, height, floor geometry, legal identity |
| Exact footprint match plus approved metre height | Height-based extrusion | Floor/unit model, vertical ULPIN, ownership unless separately evidenced |
| Official floor plan/BIM plus approved count and registration evidence | Floor-aware review / vertical-ULPIN eligibility | Any unregistered right or inferred unit boundary |

Never convert floor counts to metres. Never convert total floor area or built-up area to footprint, parcel, campus, or volume area. Never use imagery or AI output as cadastral evidence.

## Workflow

1. **Classify the evidence.** Keep provenance, source URL, availability at validation, evidence tier, and explicit non-claims for every fact.
2. **Resolve place search safely.** Search exact live records first. Permit LLM routing only to a bounded alias catalog with lexical anchors and confidence gating. Return an unavailable state for all other searches.
3. **Compute only geometry-backed metrics.** For matched source footprints, expose count and summed footprint area with a notice that the total is not a legal parcel, campus, property, floor, or building area.
4. **Show evidence locks.** Use distinct badge states: `Officially verified`, `Source-cited`, `Public footprint only`, and `Evidence locked`. Place the required unlock condition beside each locked metric.
5. **Keep institution records separate.** Render named institutional facts from structured JSON or a reviewed record, but do not attach them to a live footprint until a verified building-to-geometry match exists.
6. **Protect authority writes.** Require server-side authorization, a meaningful edit note, revision history, and source references before persisting geometry, height, ownership, or rights changes.
7. **Validate negative states.** Test a matched location, an unmatched college/restaurant/park query, and a source-cited institution record. Confirm no unsupported height, floor, ownership, or ULPIN is displayed.

## AI integration rules

Call LLMs on the server only. Prefer structured JSON output. Give the model only the allowed alias catalog and instruct it to return `none` for unsupported queries. The model may route a user to existing data; it must not generate geometry, estimates, heights, floor counts, property areas, or cadastral facts.

If the user asks for an estimate, label it as a non-cadastral planning hypothesis and keep it out of verified records, evidence badges, Cesium extrusion, ULPIN generation, and property-rights views. Prefer an explicit unavailable state when no licensed or official source supports the request.

## JSON-backed institution record shape

Use a record with these minimum fields:

```json
{
  "displayLabel": "Academic Block-4",
  "evidenceTier": "source_cited_official_record_not_independently_retrievable",
  "statedInstitutionalFacts": {
    "storeys": "G+3 stated",
    "totalFloorAreaSquareMetres": 6667.73
  },
  "officialSourceCitations": [{"label": "Official report", "url": "https://example.gov/report.pdf", "availabilityAtValidation": "retrieved"}],
  "notEstablished": ["exact GIS footprint", "surveyed metre height", "vertical ULPIN"],
  "activeLocks": {"cesiumMetreHeightExtrusion": "Locked pending surveyed height"}
}
```

Do not label a record `independently_verified` unless the cited document was retrieved and its exact claim was reviewed. If an official URL returns 404 or cannot be accessed, record that limitation and use `source-cited` status.

## Completion checks

- Add unit tests for evidence-tier labels and lock behavior.
- Test desktop and true mobile layouts for badge readability.
- Confirm unsupported search queries show unavailable facts rather than estimates.
- Run typecheck, tests, formatter, and production build.
- Save a checkpoint and synchronize the relevant source, evidence payload, tests, and documentation.
