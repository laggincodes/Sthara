# Bihar RERA — KUSUM SURESH ENCLAVE Authority Evidence

## Source checked

The official Bihar Real Estate Regulatory Authority project-registration page for `RERAP125201800396-5` was retrieved on 24 August 2026: [Bihar RERA project record](https://rera.bihar.gov.in/Filanprint.aspx?id=RERAP125201800396-5).

## Explicitly published project fields

| Field                     | Published value                                                      | Application use                                                                                                    |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Project                   | KUSUM SURESH ENCLAVE                                                 | Authority-record label only                                                                                        |
| Project description       | G+4 approved residential building in New Mithila Colony, Patna       | Preserve the original `G+4` value; render as five storeys only as an explanatory interpretation, never as geometry |
| Location                  | New Mithila Colony, Digha, Patna                                     | Institutional/project location context                                                                             |
| Khesra/Plot               | 808 P                                                                | RERA project-location reference; not an independently asserted parcel geometry in this application                 |
| Mauza / Anchal            | Digha / Patna Sadar                                                  | RERA project-location reference                                                                                    |
| Height of Building        | 14.90 m                                                              | Authority-backed height evidence, eligible for Level 2 only after a defensible building-footprint match            |
| Coverage area             | 808.85 m²                                                            | Published coverage measure; not treated as a GIS polygon or source-footprint area                                  |
| Total built-up area       | 3,273.85 m²                                                          | Published project measure; not treated as a footprint or parcel area                                               |
| Total land area           | 1,313.80 m²                                                          | Published project measure; not treated as a cadastral boundary                                                     |
| Coordinate label          | Latitude/longitude **of end point of the plot**: 25.63366, 85.071159 | A reference point only; never a centroid, footprint, or parcel boundary                                            |
| Sanctioned building count | 1                                                                    | Authority-record fact only                                                                                         |

The record contains links to land and supporting records, including mutation-correction slip, sale deed/khatiyan, online Jamabandi, LPC, current revenue receipt, non-encumbrance certificate, and development agreement. This check did not establish an authoritative closed building or parcel polygon from those links. The RERA page itself labels the supplied coordinate as an endpoint, so it is not enough to map or extrude a live polygon.

## Evidence decision

The project record can populate a distinct **authority-backed, geometry-pending test record**. It provides source-cited floors, height, coverage, and project/plot context. It does **not** approve a live Cesium extrusion unless the record is matched to a sourced or sanctioned building footprint. It also does not meet Level 3 because a reviewed official floor plan/BIM tied to an exact footprint and an approved vertical-property record have not been established.

## Sanctioned-plan retrieval investigation

The user requested retrieval of the KUSUM SURESH ENCLAVE sanctioned building/layout plan from the official RERA document section. The browser was able to extract the project record but returned an abbreviated document table showing land-record links; the page subsequently closed the browser connection. Text extraction of the same official URL also ended before the full document table. Therefore, a document-list label alone has not been used as footprint evidence.

For document-path discovery only, the related—but distinct—official RERA record `RERAP125201800396-3` was reviewed. It exposes its own project documents under the official path format `https://rera.bihar.gov.in/All_Document/RERAP125201800396RERAP125201800396-3<document-name>.pdf`. This establishes a filename convention but supplies **no geometry, fact, or plan evidence** for KUSUM SURESH ENCLAVE. Only the `-5` project-specific official files may be retrieved or assessed for the current record.

On 24 August 2026, the project-specific candidate `RERAP125201800396RERAP125201800396-5SanctionedBuildingPlan.pdf` was attempted through three non-invasive retrieval methods. The RERA host returned TLS/connection-closed failures through direct retrieval, no extractable document content through text retrieval, and `ERR_CONNECTION_CLOSED` in the browser. No plan PDF or image was obtained, and no candidate filename was treated as proof that the file exists. The dashboard therefore continues to show the RERA endpoint as a reference marker only, with footprint, extrusion, floor-model, and vertical ULPIN locks retained.

## User-supplied sanctioned-plan PDF review

The user then supplied the project-specific sanctioned layout and building-plan PDFs. Both are one-page, image-based plan sheets; no embedded text layer was available. Dense-plan review began without reopening the supplied screenshot image.

The first two ordered layout-plan tiles visibly establish a titled **site plan**, **ground floor plan**, and **first-to-fourth floor plan** for a proposed G+4 residential building. The site-plan drawing depicts a closed plotted extent and a proposed building outline, with dimensions shown in metres. The visible plan annotations include a 16.26 m top plot dimension and a 61.29 m side plot dimension; these must remain plan-space dimensions unless a survey-control/georeferencing basis is confirmed. The area table identifies total plot area as 1,313.80 m², first-to-fourth floor built-up areas as 808.85 m² each, and total built-up area as 3,273.85 m². It also names the proposal as KUSUM SURESH ENCLAVE, G+4, for survey plot 808(P), khata 1869, mauza Digha, district Patna.

No WGS84 coordinate grid, coordinate table, or surveyed control point is visible in these first two tiles. Therefore, the drawing is authority evidence for its stated project and dimensions, but it is not yet a georeferenced GIS footprint.

The final two ordered layout-plan tiles show that the site fronts a labelled 12.19 m-wide road and include a schematic location plan referencing Kasturba Path and Digha Bridge Link Road. They also show sections and elevations, a scale of 1:100, and the note that all dimensions are in metres. The title/approval region visibly contains professional/authority signatures and a municipal building-plan approval annotation. This supports the plan’s evidentiary origin and its local drawing dimensions.

However, the location plan is schematic: it contains neither a latitude/longitude grid nor multiple surveyed control points for a repeatable transformation into EPSG:4326. The closed site and proposed-building outlines therefore remain **plan-space geometry**. The plan provides a credible basis to calculate/trace a local outline, but does not by itself support inserting an authoritative WGS84/PostGIS polygon or matching one of the live Microsoft detections.

The first two ordered tiles of the user-supplied sanctioned building-plan PDF show the same site-plan, ground-floor, first-to-fourth-floor, elevation, scale, and area-calculation content at the reviewed positions. Both supplied PDFs are therefore currently treated as two plan-file submissions that corroborate the same local-plan evidence, not as two independently georeferenced datasets. The building-plan tiles again show a local closed site/proposed-building drawing and the G+4/area evidence, but no WGS84 grid or surveyed control-point table.

The final two ordered building-plan tiles also match the layout-plan review: a schematic road-context/location drawing, 1:100 metric drawing scale, elevations, plan-space outline, and professional/municipal approval annotations are visible. No tile provides a coordinate grid, a coordinate schedule, a benchmark, a GNSS/CORS control point, or another repeatable map-registration control. The user-supplied PDFs therefore improve the authority evidence chain and confirm local drawing geometry, but they do not change the finding that an exact WGS84 footprint cannot be derived from the plans alone.

## QR-code record corroboration

The user supplied the official Bihar RERA QR-code page for the same identifier on 24 August 2026: [Bihar RERA QR-code record](https://rera.bihar.gov.in/QRCODE.aspx?id=RERAP125201800396-5). The page explicitly corroborates the project name, its G+4 approved-residential description, New Mithila Colony/Digha/Patna location, Plot 808 P, Mauza Digha, Patna Sadar administrative context, one sanctioned building/wing, and the published land, covered, and total built-up areas of 1,313.80 m², 808.85 m², and 3,273.85 m² respectively. It also repeats the coordinate label as the **endpoint of the plot** at 25.63366, 85.071159.

The QR-code rendering leaves its `Height of Building (Mtr.)` and `Coverage Area (Sqr. Mtr.)` fields blank. It therefore does **not** independently corroborate the separate 14.90 m value already retained from the original project-record review. This QR source does not add a coordinate schedule, a closed GIS boundary, or surveyed ground-control points. It cannot be used to create a GeoJSON feature, to reconcile an EPSG:4326 footprint, or to unlock the 14.90 m extrusion. The project continues to require user-supplied, validated non-collinear GCPs and Plot 808 P reconciliation before any Level 2 geometry action.

## SIH demonstration evidence decision

On 24 August 2026, the user directed that the current SIH demonstration retain only the explicit RERA project, location/plot context, G+4 source value, and published land, covered, and built-up measures. The previously recorded 14.90 m value is retained solely as an **unverified audit value** and is no longer displayed as a verified SIH fact or an extrusion input. This supersedes any prior statement that the value was eligible for Level 2.

The current demo must keep the GCP-validation, authoritative GeoJSON footprint, Plot 808 P reconciliation, Cesium extrusion, floor-by-floor model, and vertical ULPIN states locked. The endpoint coordinate remains a reference marker only; it cannot be reused as a surrogate GCP, centroid, parcel boundary, or building footprint.
