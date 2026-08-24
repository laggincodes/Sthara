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
