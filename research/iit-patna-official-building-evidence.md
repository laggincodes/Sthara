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

## References

[1] [IIT Patna — Hostels](https://www.iitp.ac.in/hostels)

[2] [IIT Patna — Main site, including IWD link](https://www.iitp.ac.in/)

[3] [IWD IIT Patna public mirror](https://envs.net/~pranjal/iwd-iitp/)

[4] [OpenStreetMap Nominatim — IIT Patna named university feature](https://nominatim.openstreetmap.org/search?format=jsonv2&q=Indian%20Institute%20of%20Technology%20Patna%2C%20Bihta%2C%20Bihar)

[5] [OpenStreetMap Nominatim — user-supplied coordinate](https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=25.5356&lon=84.8513&zoom=18)
