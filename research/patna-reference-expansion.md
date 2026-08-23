# Patna Source-Backed 3D Reference Expansion

## 2026-08-23 — discovery log

The official NIT Patna website identifies the institution as **National Institute of Technology Patna** and gives its address as **Ashok Rajpath, Mahendru, Patna, Bihar 800005**. This establishes institution identity and address context only; it is not building geometry, a campus boundary, a legal parcel, ownership evidence, or an approved height source.

Public OpenStreetMap Nominatim searches for the institution name and its official address returned no direct reference. An OpenStreetMap Overpass query endpoint was unavailable for the browser request. No NIT building footprint, campus boundary, parcel, ownership, or height has been imported from these lookups.

The official IIT Patna website confirms the institution identity and its Bihta-area campus context. The official AIIMS Patna contact page confirms **Phulwarisharif, Patna, Bihar 801507**. These sources establish institution names and location context only. Neither page supplies an openly licensed individual building-footprint collection, a legal campus boundary, a land parcel, ownership, or approved-height evidence.

The OpenStreetMap public search interface returned an attributable **way/1368115899** feature named **Indian Institute of Technology Patna**, described as on Bihta–Lai Road, Bihta, Patna, Bihar 801106. The search display centered near **25.54275, 84.85300**. This is a place-anchor candidate for a radius-bounded Microsoft individual-footprint search, not an adopted campus boundary. The OpenStreetMap search for “Patna University” did not return an exact Patna University feature; it displayed other educational features and the existing Amity reference node instead. It therefore remains unanchored and must not be imported under that name.

An OpenStreetMap search for the abbreviated “AIIMS Patna” returned only roads and therefore was rejected as an anchor. A refined search for the full official name returned **way/688918175**, named **All India Institute of Medical Sciences**, described as a hospital on NH139 in Phulwari, Patna, Bihar 801507. The search display centered near **25.560400, 85.042322**. It is eligible only as a place-anchor candidate for a radius-bounded Microsoft individual-footprint query; the OSM feature must never be published as a legal campus boundary, parcel, ownership link, or source of building geometry.

The search for “Sanjay Gandhi Biological Park Patna” returned no result and is excluded. A public OpenStreetMap search for **Gandhi Maidan, Patna** returned **way/133726967**, a park feature in Rajendra Nagar, Patna, with map-centre context **25.617305, 85.145065**. It qualifies only as a landmark anchor for selecting nearby individual Microsoft detections; no park boundary, parcel, ownership, or building geometry is asserted.

## Import results

On 2026-08-23, the importer streamed the official Microsoft Global ML Building Footprints tiles from the current public index and stored valid individual EPSG:4326 Polygon/MultiPolygon detections within **180 metres** of each verified place anchor. The records retain the exact Microsoft shard URL, CDLA Permissive 2.0 licence, model confidence, centroid distance, anchor reference, and explicit non-cadastral/non-boundary flags. No heights, campus boundaries, parcels, ULPINs, ownership records, floor models, or underground rights were created.

| Source-backed reference area | Microsoft quadkey | Features scanned | Individual detections stored | Nearest detection |
|---|---:|---:|---:|---:|
| IIT Patna | 123133020 | 865,828 | 4 | 106.0 m |
| AIIMS Patna | 123133020 | 865,828 | 18 | 91.7 m |
| Gandhi Maidan Patna | 123133021 | 967,809 | 2 | 160.3 m |

| Candidate | Confirmed source context | Anchor status | Import status |
|---|---|---|---|
| NIT Patna | Official NIT Patna website; Ashok Rajpath, Mahendru, Patna, Bihar 800005 | Needs a verified public spatial reference | Not imported |
| Patna University | Pending source verification | Pending | Not imported |
| IIT Patna | Official IIT Patna contact page; OpenStreetMap way/1368115899 | OpenStreetMap place-anchor context 25.54275, 84.85300 | 4 individual Microsoft detections inside 180 m |
| AIIMS Patna | Official contact page; OpenStreetMap way/688918175 | OpenStreetMap place-anchor context 25.560400, 85.042322 | 18 individual Microsoft detections inside 180 m |
| Gandhi Maidan, Patna | OpenStreetMap way/133726967 | OpenStreetMap landmark-anchor context 25.617305, 85.145065 | 2 individual Microsoft detections inside 180 m |

## Application verification

The current live development server was verified after restart, because an earlier preview proxy pointed to a stale router build without the guarded resolver route. On the current server, desktop search for **IIT Patna** returned 4 live PostGIS footprints totalling **5,535.33 m²**, displayed the actual source footprints in Cesium, and rendered an interactive Three.js footprint plate labelled as height-awaiting-authority approval. A full-name search for **All India Institute of Medical Sciences Patna** was AI-routed only to the lexically eligible **AIIMS Patna reference area** and returned 18 live PostGIS footprints totalling **12,313.55 m²**. The UI explicitly labelled the route as source-backed and retained no approved height or inferred ownership.

The negative control **Unknown tower in Patna** returned no source footprint, no model, and the explicit message that AI routing cannot create missing geometry. A true-mobile Chrome DevTools run at **396 × 857 CSS pixels** confirmed that touch input for the full AIIMS name resolved to the AIIMS reference area, surfaced the 18-footprint source-focus message and AI-route note, and rendered a **340.2 × 188 px** Three.js preview. The same session confirmed the unknown-place no-model fallback.

Visual review of the captured mobile pages confirmed that the AIIMS result keeps the live source-footprint labels, ordered review control, Cesium footprint context, and Three.js plate visible and legible in the touch layout. The unknown query renders a dedicated “No verified 3D building model” panel with no substitute geometry. The temporary preview-host notice visible across the captures is host chrome, not a component in the application’s production layout.

## Sources

1. [NIT Patna — Official website](https://www.nitp.ac.in/)
2. [OpenStreetMap](https://www.openstreetmap.org/)
3. [IIT Patna — Contact page](https://www.iitp.ac.in/contact)
4. [AIIMS Patna — Contact page](https://aiimspatna.edu.in/contact)
5. [OpenStreetMap search — Indian Institute of Technology Patna](https://www.openstreetmap.org/search?query=Indian%20Institute%20of%20Technology%20Patna)
6. [OpenStreetMap search — Patna University](https://www.openstreetmap.org/search?query=Patna%20University)
7. [OpenStreetMap search — AIIMS Patna](https://www.openstreetmap.org/search?query=AIIMS%20Patna)
8. [OpenStreetMap search — All India Institute of Medical Sciences Patna](https://www.openstreetmap.org/search?query=All%20India%20Institute%20of%20Medical%20Sciences%20Patna)
9. [OpenStreetMap search — Gandhi Maidan Patna](https://www.openstreetmap.org/search?query=Gandhi%20Maidan%20Patna)
