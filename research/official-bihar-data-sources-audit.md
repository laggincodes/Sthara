# Official Bihar Data-Source Access Audit

**Purpose.** This audit records only what was directly observable from official portals during the current source review. It does not assert a parcel boundary, owner, land right, approved building footprint, height, GCP, or ULPIN for any project record.

## Bihar BhuNaksha

The official [BhuNaksha Bihar portal](https://bhunaksha.bihar.gov.in/10/indexmain.jsp) was reached successfully on 24 August 2026. Its public interface exposes location selectors for **District**, **Sub Div**, **Circle**, **Mauza**, **Survey Type**, **Map Instance**, and **Sheet No**, plus a **Plot Info** panel and plot-number input. This establishes that a selected-record workflow is available.

The public selector sequence did reach **Patna** → **Patna Sadar** subdivision → **Patna Rural** circle → **Digha / दीघा (0161)** mauza → **RS Map 07** → sheet **00**. The portal therefore corroborates the availability of a Digha mapping context; it does not by itself reconcile the RERA’s stated **Anchal Patna Sadar** with the portal’s displayed **Patna Rural** circle. That administrative-label difference remains unresolved.

An official Plot Info lookup was attempted for `808` in that selected Digha context. It remained in a loading state and returned no visible plot attributes, geometry, area, holder, or download within the review session. A parcel boundary cannot be retrieved responsibly until the official response returns a specific Plot 808 P record. No BhuNaksha geometry, plot number, owner, or ULPIN was imported.

## BiharBhumi

The official [BiharBhumi portal](https://biharbhumi.bihar.gov.in/Biharbhumi/) was reached successfully on 24 August 2026. It visibly links to public-facing services including **View Jamabandi Register**, **Online LPC application**, **LPC status**, **Bhu-Manchitra**, **e-Mapi**, and land-record/directory services. The page also distinguishes citizen login and application workflows.

This confirms the portal is an authoritative navigation source for Bihar revenue records. It does not itself establish a project-specific ownership or Jamabandi result. No private ownership information will be collected, displayed, or linked without a clearly public, project-specific government record and a separate legal/evidence review.

## Patna Municipal Corporation AutoMAP

The official [Patna Municipal Corporation AutoMAP](https://automap.bihar.gov.in/PATNABPASPORTAL/Home) public content was retrieved on 24 August 2026 after its interactive page initially returned a connection-closed error. It describes an online building-permit system with an application-status function, citizen accounts, property search, application dashboards, supporting-document uploads, technical-person workflow, and building-permit/occupancy processes.

Its official [application guidance](https://automap.bihar.gov.in/PATNABPASPORTAL/Portal/HowToApply) states that an applicant adds land/plot details, assigns a registered technical person, uploads a secured APZ file and scanned documents, and submits the application with payment. The publicly retrieved guidance does not expose a project-specific approved plan, application result, plot geometry, or GIS footprint. Consequently, AutoMAP may be cited as the authority workflow for such material, but it does not yet provide an importable record for this dashboard.

## Survey of India CORS

The official [Survey of India CORS page](https://surveyofindia.gov.in/pages/continuously-operating-reference-stations-cors-) was reached successfully on 24 August 2026. It publishes standard operating procedure links for **CORS registration and data downloading**, **DGNSS survey using the CORS network**, **NRTK survey**, **online post-processing**, and **VRS data downloading**, and links to the CORS web application.

This establishes CORS as a structured GNSS survey and data-access workflow; it does not supply a project-specific GCP, nor can it make the RERA endpoint coordinate or plan-space points into a survey control set. Any GCP used by this project must be produced or supplied through an authorized survey workflow and tied to the exact plan/image coordinate basis.

## Immediate evidence state

| Source               | Directly reached               | Specific project record retrieved | Safe current use                                                                                                      |
| -------------------- | ------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Bihar BhuNaksha      | Yes                            | No                                | Link to selected-plot workflow only                                                                                   |
| BiharBhumi           | Yes                            | No                                | Link to public revenue-service navigation only                                                                        |
| Patna AutoMAP        | Yes — public workflow guidance | No                                | Authority-workflow citation only; project record requires a public application/approval result or authorized evidence |
| Survey of India CORS | Yes                            | No                                | Survey workflow reference only; no control point or coordinate claim                                                  |

> A government portal’s existence does not turn unselected or inaccessible data into a verified project record. Exact parcel geometry, ownership, GNSS control, approved height, floor geometry, and vertical ULPIN remain evidence-gated.
