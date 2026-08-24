# IIT Patna Building Evidence — Verification Log

**Scope:** Evaluate the user-supplied IWD Academic Zone and residential figures for use in the 3D ULPIN-VPM evidence workflow. This document does not create a parcel link, ULPIN, ownership record, building-height record, or individual geometry match.

## Official-source findings

IIT Patna's public main site links to `https://iwd.iitp.ac.in/` as IWD, and the current main site identifies recent works in Academic Block-6. The official hostel page states that the boys' hostel is an eight-storey structure, has four blocks, and covers **28,849 m²**. It does not provide geometry sufficient to identify a particular live source-footprint record. [1] [2]

The IWD hostname did not resolve in this execution environment. A publicly accessible mirror displays IWD/IIT Patna branding and links to Academic Zone and Residential Zone navigation, but its individual building pages could not be independently located from the mirror. It is therefore **supporting context only**, not the final authority source for assigning data in the app. [3]

## Submitted records — reconciliation status

| Submitted record | Submitted floors / area | Current source status | Geometry-link status | Safe app treatment |
| --- | --- | --- | --- | --- |
| Academic Blocks 3, 4, 6, 9; Admin Block-12; Workshops; Food Court | Floor counts and areas supplied by user | Academic Zone IWD page still requires direct verification | No individual source-footprint match | Do not display as selected-building attributes yet. |
| Boys Hostel | G+7; 27,845.00 m² supplied | Official hostel page reports eight storeys and 28,849 m² | No individual source-footprint match | Treat the supplied record as inconsistent with the independently verified current page; do not attach it. |
| Other residential records | Floor counts and areas supplied by user | Residential IWD page still requires direct verification | No individual source-footprint match | Do not attach or generate floor model. |
| Bihta campus location | Approx. 25.5356° N, 84.8513° E supplied | Official contact page confirms IIT Patna contact/IWD context but did not expose coordinates in extracted text | Current imported IIT reference needs coordinate/source review | Hold as candidate location context only. |

## Evidence decision

The verified hostel page can support an institution-level statement about a boys' hostel building, but it cannot yet support a specific geometry-to-building match or an official vertical ULPIN model. The user-supplied G+ notation is a floor-count claim; it is **not a verified metric building height** and therefore cannot unlock Level 2 Cesium extrusion. Level 3 also remains locked until an authoritative floor plan/BIM and an explicit building-to-geometry reconciliation are available.

## Spatial-reference reconciliation

OpenStreetMap returns `way/1368115899` as the named **Indian Institute of Technology Patna** university feature, with a centre at 25.5424381, 84.8516072 and bounds that include the user-supplied 25.5356, 84.8513 point. The current import anchor at 25.54275, 84.853 is therefore a rounded named-university reference, not an unrelated institution. The user-supplied coordinate reverse-geocodes to a State Bank of India point inside the broader named university bounds, so it is useful as a **candidate local campus point** but does not by itself identify an Academic Block, hostel, or official building footprint. [4] [5]

## Workspace display validation

The workspace now shows the independently verified boys' hostel context only for IIT Patna searches. The panel visibly labels the record as **institution-level context only; not matched to an individual source footprint**, and links to the official IIT Patna hostel page. It does not show for the AIIMS Patna workspace. Desktop and 396×857 mobile reviews confirmed that the panel remains readable alongside the Level 1 source-footprint state.

## Follow-up official-source availability check — 24 August 2026

IIT Patna's primary public website continues to link `https://iwd.iitp.ac.in/` as its Institute Works Department, confirming that IWD is an institute-recognized office. The hostname returned a DNS resolution failure from this validation environment. An indexed third-party mirror exposed only navigation and IWD contact details; it did not expose a named-building plan, coordinates, a source-footprint link, or a downloadable authoritative drawing. Its Academic Zone navigation did not return an underlying building schedule.

The mirror remains supporting context only. It is not sufficient to reconcile Academic Block-4—or any other named IIT building—to the four Microsoft source detections, approve a height, or unlock Level 3 floor-by-floor/vertical ULPIN modelling. A direct official IWD PDF, GIS export, BIM, plan, or building-to-map correspondence is still required.

**Application update decision:** no IIT source-footprint attributes, height records, floor counts, or vertical ULPIN records were added during this check.

## Academic Block-4 source request — pending direct-document validation

The newly supplied information identifies two official-source claims for Academic Block-4: the IWD Academic Zone record reportedly states **G+3** and **6,667.73 m²**, while the official Phase-III project document reportedly labels the building on a campus/site plan. This combination can support an institution-level floor-count and campus-plan relationship once the underlying official page and document are directly accessible and reviewed.

The current IIT Patna website confirms IWD as an official institute office, but the IWD hostname remains unavailable from this environment. The official legacy hostname also did not resolve, and the current official notice archive did not expose archived records in its rendered page. No direct document URL, page image, plan coordinates, or map-to-footprint correspondence was retrieved in this validation pass. Accordingly, the application must not yet attach the claimed G+3/6,667.73 m² values to a Microsoft footprint or imply a GIS geometry match. An approved metre height and official floor plan/BIM remain separate requirements for Level 2/Level 3.

## Source-cited Academic Block-4 record — 24 August 2026

The project user supplied the current IIT Patna IWD Academic Area URL, `https://www.iitp.ac.in/iwd/index.php/academic-area`, and identified the IIT Patna Annual Report 2015–16, page 18, as corroboration. The user reports both identify **Academic Block-4** as a **G+3 storied building** with **6,667.73 m² total floor area**. IIT Patna’s official Annual Reports page independently lists the 2015–16 English report as an institute publication.[6]

At the time of validation, the supplied IWD page and the current annual-report asset path each returned a 404 response, so the project could not independently re-read the claimed page text or page 18. The workspace therefore presents the values as **source-cited institution context**, links to the accessible official Annual Reports index, and explicitly states that the cited asset locations are currently unavailable. It does not assign these values to a Microsoft detection, an exact campus-plan position, a GIS polygon, a metre height, a legal parcel, an owner, or a ULPIN.

The subsequently supplied alternate official asset path, `https://www.iitp.ac.in/images/pdf/IIT_Patna_Annual_Report%202015_16_English.pdf`, was also checked on 24 August 2026 and returned the IIT Patna website’s 404 page. The evidence status therefore remains **source-cited**, not independently verified from a retrievable report page. No further retrieval attempt is required unless IIT Patna restores a document asset or a copy of the original page is supplied.

The separate Academic Block-4 evidence gate now makes the remaining requirements explicit: a verified block-to-footprint match, a surveyed height in metres for Cesium extrusion, and an official floor plan/BIM for floor-by-floor modelling and vertical ULPIN review.

## References

[1] [IIT Patna — Hostels](https://www.iitp.ac.in/hostels)

[2] [IIT Patna — Main site, including IWD link](https://www.iitp.ac.in/)

[3] [IWD IIT Patna public mirror](https://envs.net/~pranjal/iwd-iitp/)

[4] [OpenStreetMap Nominatim — IIT Patna named university feature](https://nominatim.openstreetmap.org/search?format=jsonv2&q=Indian%20Institute%20of%20Technology%20Patna%2C%20Bihta%2C%20Bihar)

[5] [OpenStreetMap Nominatim — user-supplied coordinate](https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=25.5356&lon=84.8513&zoom=18)

[6] [IIT Patna — Annual Reports](https://www.iitp.ac.in/administration/annual-reports)
