# SIH Methodology: Evidence-Gated 3D ULPIN and Vertical Property Mapping

**Project:** 3D ULPIN-VPM  
**Purpose:** Prevent unsupported spatial, legal, and vertical-property metadata from being represented as verified cadastral information.

## 1. Methodological principle

The project follows a simple rule: **a visual or metadata field is enabled only when the evidence required for that field is present and tied to the exact spatial record.** An AI search result, satellite/imagery context, public footprint detection, institution-level report, floor count, or built-up-area figure does not on its own establish ownership, legal parcel identity, height, individual floor boundaries, or a vertical ULPIN.

This approach is intended to make the demonstrator useful for progressive evidence intake while avoiding false precision in urban and vertical cadastral workflows.

## 2. Evidence ladder

| Level   | Permitted output                                                           | Required evidence                                                                                                                      | Explicit exclusions                                                                         |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Level 1 | A source-attributed building-footprint outline and measured footprint area | Public/open source footprint geometry, retained provenance, and live PostGIS record                                                    | Legal parcel, campus boundary, ownership, height, floors, units, ULPIN, and vertical rights |
| Level 2 | A Cesium building extrusion                                                | The Level 1 footprint plus a positive verified height in metres and its authority/source reference                                     | Floor segmentation, units, title, ownership, and vertical ULPIN unless separately evidenced |
| Level 3 | Floor-aware 3D review and vertical-ULPIN eligibility state                 | Exact building-to-footprint reconciliation, official floor plan/BIM, approved floor count, and vertical-property registration evidence | Any unregistered vertical identifier or assumed unit boundary                               |

> A stated floor count such as **G+3** is not converted into a metre height. A total floor area is not treated as a footprint area, building volume, parcel area, or GIS polygon.

## 3. Lock controls for unverified metadata

| Metadata class                  | Lock applied by the project                                                  | Unlock condition                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Building height                 | No `approvedHeightMetres` value is persisted or rendered as extrusion        | Authority-approved/surveyed metre value and source reference linked to the exact footprint |
| GIS polygon / building identity | A named institution record is kept separate from public footprint detections | Verified spatial cross-reference, authoritative GIS export, or survey match                |
| Floors / unit geometry          | The interface shows a floor-model lock; no storeys or units are simulated    | Official floor plan/BIM and approved floor count tied to the exact building                |
| Vertical ULPIN                  | No vertical identifier, air-right, or unit-right volume is generated         | Approved vertical-property registration plus the Level 3 evidence chain                    |
| Ownership / parcel links        | Source footprints show “no inferred ownership”                               | Official parcel/ULPIN and ownership basis attached by an authorized operator               |

## 4. AI and public-data safeguards

AI is used only for **guarded natural-language routing** to a bounded catalog of existing source-backed areas. It cannot create geometry, infer a building name, assign a height, manufacture a floor plan, or generate cadastral/ownership facts. A request that does not match a lexically anchored source area returns an explicit unavailable state rather than a synthetic building model.

Microsoft Global ML Building Footprints and OpenStreetMap-derived Cesium context are displayed with source/provenance language. They provide visual and Level 1 spatial context only; they are not treated as legal parcels, campus boundaries, building ownership, precise height surveys, or ULPIN registrations.

## 5. Authority and audit workflow

Changes to geometry, approved height, and ownership links are protected by an administrator-only server procedure. The workflow requires a meaningful revision note, preserves the original geometry on first correction, increments the geometry revision, and records the editor and audit note. Client-side validation supplements, but does not replace, server-side controls.

The workflow is intentionally conservative: a correction interface does not make a proposed edit authoritative. A saved authority record must still contain the evidence required by its claimed level.

## 6. Application to Academic Block-4

Academic Block-4 currently remains an institution-level, source-cited record. Its stated G+3 and 6,667.73 m² total floor-area values are not attached to an IIT footprint detection. Therefore, the application maintains the following safe result: **no metre-height extrusion, no named GIS polygon, no floor-by-floor model, and no vertical ULPIN**.
