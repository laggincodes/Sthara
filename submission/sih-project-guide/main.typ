// 3D ULPIN-VPM SIH project guide — evidence-safe Hindi report

#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "3D ULPIN-VPM: SIH Project Guide",
  author: "Manus AI",
  rhythm: "report",
  running-header: true,
)

#set text(font: ("Noto Sans Devanagari", "DejaVu Sans"), size: 10pt)
#set par(first-line-indent: 0em, leading: 0.9em, spacing: 0.72em)

#let note(body) = block(
  fill: rgb("edf8f7"),
  stroke: (left: 3pt + report-accent),
  inset: 11pt,
  radius: 5pt,
  body,
)

#let warning(body) = block(
  fill: rgb("fff4e7"),
  stroke: (left: 3pt + rgb("c36b20")),
  inset: 11pt,
  radius: 5pt,
  body,
)

// ---------- Title page ----------
#page(margin: (top: 25%, x: 2.2cm), numbering: none, header: none)[
  #align(center)[
    #text(size: 26pt, weight: "bold", fill: report-accent)[3D ULPIN-VPM]
    #v(0.35em)
    #text(size: 17pt, weight: "bold")[3D ULPIN Generation एवं Vertical Property Mapping System]
    #v(0.75em)
    #text(size: 12pt, fill: luma(80))[SIH / DoLR परियोजना मार्गदर्शिका, तकनीकी दस्तावेज़ और Jury Q&A]
    #v(1.6em)
    #line(length: 48%, stroke: 0.5pt + luma(160))
    #v(1.5em)
    #text(size: 10pt)[
      संगठन संदर्भ: Department of Land Resources, Ministry of Rural Development \
      दस्तावेज़ भाषा: हिंदी (English technical terms सहित) \
      तैयारकर्ता: Manus AI \
      दिनांक: #datetime.today().display("[day].[month].[year]")
    ]
  ]
]

// ---------- Table of contents ----------
#page(numbering: none, header: none)[
  #outline(title: [विषय-सूची], indent: 1.5em)
]

#counter(page).update(1)

= संक्षिप्त परिचय

*3D ULPIN-VPM* एक evidence-driven geospatial prototype है। इसका लक्ष्य surface land parcel, multi-storey building, floor/unit, underground utility और vertical rights को एक ही 3D mapping workflow में समझना है। साधारण 2D land record अक्सर केवल जमीन की सतह तक सीमित रहता है; यह project 3D visualization, source-aware search, evidence locks, GIS geometry, plan/GCP workflow और vertical-property readiness को जोड़ता है।

#note[*मुख्य बात:* यह project अनुमानित polygon, height, owner, GNSS point या ULPIN को official नहीं दिखाता। जहाँ government/survey evidence उपलब्ध नहीं है, वहाँ feature को *locked*, *pending* या *synthetic demo* के रूप में दिखाया जाता है।]

Department of Land Resources के अनुसार ULPIN/Bhu-Aadhar 14-digit parcel identifier है, जो longitude–latitude आधारित georeferenced parcel vertices, detailed surveys और georeferenced cadastral maps पर निर्भर करता है। इसलिए इस prototype में “Generate ULPIN” का अर्थ नकली ID बनाना नहीं, बल्कि evidence eligibility को check करना है। [1]

== समस्या क्या है?

शहरों में property केवल flat surface parcel नहीं होती। एक ही स्थान पर apartment floors, basements, parking, utilities, elevated corridor, common areas और air-rights हो सकते हैं। यदि records केवल 2D boundary तक सीमित हों, तो यह समझना मुश्किल होता है कि कौन-सा right किस level पर है, कौन-सा plan approved है, कौन-सा building outline survey-backed है और कौन-सा data केवल visual/reference context है।

#table(
  columns: (1.25fr, 1.6fr, 1.65fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*वर्तमान 2D चुनौती*], [*परिणाम*], [*3D ULPIN-VPM approach*]),
  [एक boundary में कई floors/uses], [Vertical ownership या unit location अस्पष्ट हो सकती है], [Floor, unit, volume और evidence layer को अलग model करने की तैयारी],
  [Map geometry और legal record अलग systems में], [गलत matching या duplicate interpretation का risk], [Source attribution और evidence tier visible],
  [Height या footprint अधूरा], [गलत 3D extrusion/area claim का risk], [Height/geometry lock; approved evidence के बाद ही unlock],
  [Document और map linkage weak], [Plan देखकर exact map polygon मान लेने का खतरा], [GCP/EPSG:4326 validation workflow और non-persistent demo],
)

== यह project कैसे काम करता है?

System का working principle है: *search → source match → evidence check → 3D context → authority decision*। User building, parcel, ULPIN reference या place search करता है। System पहले source-backed catalog/PostGIS geometry में direct match खोजता है। केवल approved alias catalog में match मिलने पर AI-assisted routing होता है; AI को building height, owner, floor, parcel boundary या ULPIN invent करने की अनुमति नहीं है।

#table(
  columns: (0.45fr, 1.35fr, 2.5fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Step*], [*Module*], [*क्या होता है?*]),
  [1], [Natural-language search], [User “IIT Patna”, parcel reference या source-backed place search करता है।],
  [2], [Guarded resolver], [Direct geometry match पहले; AI केवल eligible alias catalog से one-to-one routing करता है।],
  [3], [PostGIS / GeoJSON layer], [Available source-backed footprints GeoJSON के रूप में map viewer तक आते हैं।],
  [4], [Cesium + Three.js context], [3D scene, layers, camera controls और geometry review दिखते हैं।],
  [5], [Evidence panel], [Source citation, tier, locks और missing requirement दिखाई जाती है।],
  [6], [Authority workflow], [Admin/survey/record officer verified survey, plan और registration evidence review कर सकता है।],
  [7], [ULPIN eligibility], [सभी required evidence pass होने पर ही authority-issued workflow आगे बढ़ेगा।],
)

== Demo में क्या-क्या दिखाई देता है?

Dashboard में Mission Control, Parcels, Buildings, Property Volumes, ULPIN Registry, Data Ingestion और Processing Queue workspaces हैं। Parcels और Buildings source-aware explorer हैं; Property Volumes evidence ladder दिखाता है; ULPIN Registry available source records और zero-issued vertical ULPIN स्थिति स्पष्ट करता है। यह separation इसलिए है ताकि “map पर दिख रहा” और “legally issued” एक जैसी बात न मानी जाए।

Synthetic GCP demo में user-provided, explicitly non-authoritative points से plan-pixel-to-EPSG:4326 affine transformation दिखाया जाता है। Demo में 2D/3D switch, hover tooltip, simulated drone/LiDAR visual-context layers और “SIMULATION PREVIEW · NOT ISSUED” action है। यह engineering pipeline की testability दिखाता है, लेकिन यह real survey, cadastral boundary, GNSS control या ULPIN issuance नहीं है।

== Technology Stack

#table(
  columns: (1.2fr, 1.35fr, 2.1fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Layer*], [*Technology*], [*Role in project*]),
  [Programming language], [TypeScript], [Frontend और backend दोनों में typed, maintainable codebase],
  [Frontend], [React 19 + Vite + Tailwind CSS], [Responsive dashboard, routing, components और fast client build],
  [UI/interaction], [Radix UI, Framer Motion, Lucide, Wouter], [Accessible controls, dialogs, navigation और micro-interactions],
  [3D / spatial view], [CesiumJS 1.144.0 + Three.js], [Globe/scene, GeoJSON visualization, 3D context और interaction],
  [Backend], [Node.js + Express 4 + tRPC 11], [Typed API procedures, request handling और evidence rules],
  [Validation], [Zod], [Search, upload, geometry edit और admin-input validation],
  [Spatial data], [PostgreSQL/PostGIS via pg], [GeoJSON feature collection, layered-area search और controlled footprint updates],
  [Application data/auth], [Drizzle ORM + MySQL-compatible user layer + OAuth/JWT], [User session, role-aware admin actions और account management],
  [State/data fetching], [TanStack React Query + SuperJSON], [Typed client-server cache/synchronization],
  [Storage], [S3-compatible signed URL helpers], [Evidence-file upload and controlled document access],
  [Testing/build], [Vitest, TypeScript, Prettier, Vite, esbuild], [Regression tests, type-check, formatting और production bundle],
)

== Backend Architecture सरल भाषा में

Backend Express server पर चलता है और tRPC router API contract देता है। Client को अलग-अलग loosely typed REST endpoints याद रखने की आवश्यकता नहीं होती; TypeScript types backend से frontend तक flow करते हैं। `postgis.geojson`, `postgis.areaSearch`, `postgis.placeFacts`, `postgis.resolveBuilding` और `postgis.syntheticGcpDemo` जैसे procedures spatial experience को support करते हैं। `updateFootprint` केवल admin procedure है और edit note/validation के साथ controlled update करता है।

AI integration server-side है। Selected model structured JSON response के साथ alias resolution या catalog search में उपयोग होता है। System prompt explicitly कहता है कि AI locations, geometry, heights, floors, ownership या ULPIN invent नहीं करेगा। Source-backed match नहीं मिलने पर result “unavailable” लौटता है—AI generated guess नहीं।

== APIs और Services

#table(
  columns: (1.35fr, 1.7fr, 1.6fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*API / service*], [*वर्तमान उपयोग*], [*महत्वपूर्ण control*]),
  [tRPC application API], [React client ↔ Express server typed procedures], [Zod input validation और role-based admin route],
  [PostGIS service], [Source-backed GeoJSON, search और geometry update], [Synthetic GeoJSON को persistent PostGIS write से block किया गया है],
  [CesiumJS / Cesium Ion (optional)], [3D globe, imagery/building visual context], [Visual context को legal geometry या survey evidence नहीं माना जाता],
  [Built-in LLM gateway], [Source alias/catalog routing and structured JSON], [AI has a no-invention policy and fallback to unavailable],
  [S3-compatible storage], [Evidence document upload और signed access], [File metadata/validation before evidence review],
  [OAuth/JWT], [Session and admin access control], [Authority edits are role-restricted],
  [Official public portals], [Reference and authority workflow links], [Project-specific record तभी valid जब exact public/authorized result available हो],
)

== Data और References कहाँ से लिए गए हैं?

इस project में data source को “visual convenience” नहीं बल्कि “evidence level” के आधार पर देखा गया है। नीचे दिए गए references project की authority-data strategy बनाते हैं।

#table(
  columns: (1.25fr, 1.8fr, 1.55fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Source*], [*क्या support करता है?*], [*इस project में safe use*]),
  [DoLR ULPIN / Bhu-Aadhar], [14-digit parcel identity, georeferenced vertices और survey/cadastral-map dependency], [ULPIN eligibility principle और no-fabrication rule],
  [Bihar RERA record], [KUSUM SURESH ENCLAVE, G+4, Plot 808 P, Digha/Patna Sadar, stated areas], [Authority-backed attribute panel; endpoint marker only],
  [Bihar BhuNaksha], [District–Sub Div–Circle–Mauza–survey/map-sheet–plot workflow], [Official parcel lookup; no Plot 808 P polygon imported],
  [BiharBhumi], [Jamabandi, LPC, Bhu-Naksha and public service navigation], [Revenue-record discovery path; no ownership claim auto-imported],
  [Patna AutoMAP], [Building permit, documents, plan approval and status workflow], [Approved-plan/permit authority workflow reference],
  [Survey of India CORS], [CORS registration, DGNSS, NRTK, VRS and post-processing SOPs], [Survey-grade GCP workflow reference; no synthetic point becomes GNSS evidence],
)

== Bihar RERA Case Study: KUSUM SURESH ENCLAVE

The Bihar RERA QR record identifies KUSUM SURESH ENCLAVE as a G+4 approved residential building at New Mithila Colony, Digha, Patna, with Plot 808 P, land area 1,313.80 sq m, covered area 808.85 sq m and total built-up area 3,273.85 sq m. The public record labels 25.63366, 85.071159 as the *end point of the plot*; therefore the application uses it only as a reference marker, not as a polygon centroid or cadastral boundary. [2]

#warning[*Evidence decision:* The public QR page renders the “Height of Building (Mtr.)” field blank. The project therefore does not display 14.90 m as a verified demo fact and does not create a real Cesium extrusion. The sanctioned-plan sheet is local plan-space evidence; without WGS84 control, coordinate schedule or a defensible source-footprint match it cannot become an official EPSG:4326 polygon.]

== यह existing systems से बेहतर कैसे है?

यह project किसी portal को replace करने का दावा नहीं करता। इसका strength अलग-अलग systems के बीच *evidence-aware orchestration* है। Conventional GIS viewer geometry दिखा सकता है, पर यह नहीं बताता कि geometry survey-backed है, plan-derived है, public footprint है या synthetic test data। Conventional document workflow plan दिखा सकता है, पर map match/transform quality स्पष्ट नहीं करता। यह prototype इन gaps को visible, auditable और workflow-ready बनाता है।

#table(
  columns: (1.4fr, 1.45fr, 1.9fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Comparison*], [*Typical approach*], [*3D ULPIN-VPM distinction*]),
  [2D parcel viewer], [Surface polygon and attributes], [Vertical/evidence layers और 3D readiness visible],
  [Generic 3D viewer], [Attractive extrusion may be shown without proof], [Height, footprint, floor model और ULPIN are independently gated],
  [AI property search], [Answer may be guessed from web text], [AI only routes to source-backed aliases; unavailable stays unavailable],
  [Plan upload tool], [File is stored, but map linkage may be assumed], [GCP bounds, non-collinearity, EPSG:4326 demo और non-persistence explicit],
  [Single-department portal], [Focused on one record type], [Interoperable path across cadastral, RERA, plan approval, survey और 3D context],
)

== Real-world में उपयोग कहाँ होगा?

*Apartment / vertical property:* A flat, parking slot, common corridor और roof/terrace right को floor और evidence level के साथ review किया जा सकता है।

*Urban planning:* Building permit plans, existing parcel records, utilities और terrain को एक spatial context में review किया जा सकता है—बिना किसी image outline को legal boundary मानने के।

*Infrastructure:* Underground cable, water pipeline, sewer या metro corridor को dedicated layer और evidence record के साथ represent करने की तैयारी है।

*Disaster planning:* 3D context evacuation, access planning और risk mapping में उपयोगी है; legal/survey validity अलग से marked रहती है।

*Citizen service और dispute prevention:* Future verified workflow parcel, approved map, plan, ownership evidence और authorized identifier का clearer relationship बना सकता है।

== Evidence Ladder और Data Governance

यह project तीन practical levels में सोचता है:

#table(
  columns: (0.65fr, 1.5fr, 2.6fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Level*], [*Evidence*], [*Allowed output*]),
  [1], [Public/OSM/source-linked footprint or reference geometry], [Building outline / visual source context only],
  [2], [Verified height + defensible exact footprint], [Controlled 3D extrusion with source citation],
  [3], [Official floor plan/BIM, vertical rights/registration and approved records], [Floor-by-floor 3D representation and vertical ULPIN eligibility],
)

Level 1 geometry से Level 2/3 facts infer नहीं होते। Level 2 height से ownership या vertical right prove नहीं होता। Level 3 registration और authority review के बिना vertical ULPIN issue नहीं होता। यही “locks” approach system को attractive but misleading 3D demo बनने से बचाती है।

== Security, Privacy और Reliability

Sensitive ownership, survey, plan और identity data public map layer में automatically expose नहीं किए जाते। Admin footprint edits role-gated हैं; input Zod validation से गुजरता है; upload workflow file type/metadata validation करता है; storage signed URLs से controlled access दे सकता है। Natural-language AI service backend पर controlled prompt/schema के साथ चलता है।

Production deployment में Cesium runtime dependency भी important engineering point है। 3D library, CSS, worker/base URL और runtime script को public domain पर reliably load होना चाहिए। इसलिए current codebase में pinned Cesium CDN runtime application bundle से पहले load किया जाता है; production validation में public-domain smoke test शामिल होना चाहिए, केवल local Vite preview नहीं।

== Hackathon Demo Script (लगभग 3 मिनट)

*0:00–0:25 — Problem:* “आज land records surface parcel तक सीमित हैं। Multi-storey apartment, basement parking, utilities और air-rights के लिए 3D evidence workflow चाहिए।”

*0:25–0:55 — Dashboard:* Mission Control दिखाएँ और कहें कि system Parcels, Buildings, Property Volumes और ULPIN Registry को अलग रखता है ताकि data type और legal status mix न हों।

*0:55–1:25 — Search + map:* Source-aware building/place search चलाएँ। दिखाएँ कि direct source match होने पर GeoJSON/Cesium context खुलता है और no-match पर AI guessing नहीं करता।

*1:25–1:55 — Evidence panel:* RERA evidence panel दिखाएँ। Explain करें कि G+4 और area source-backed attributes हैं, लेकिन endpoint coordinate को polygon नहीं बनाया गया।

*1:55–2:25 — Synthetic GCP lab:* Demo points, EPSG:4326 transform, 2D/3D mode और simulated LiDAR/drone layers दिखाएँ। DEMO / NON-AUTHORITATIVE label point out करें।

*2:25–3:00 — ULPIN gate:* Generate ULPIN action खोलें और बताएं कि identifier issue नहीं होता। Real workflow में surveyed GCPs, authoritative footprint, approved height/floor evidence और vertical registration चाहिए। यही solution का trust advantage है।

== Hackathon Jury Q&A

=== 1. ULPIN क्या है और आप क्यों generate नहीं कर रहे?

ULPIN एक government-defined 14-digit parcel identity framework है, जो detailed survey और georeferenced cadastral parcel vertices पर आधारित होता है। [1] हमारा prototype false ULPIN नहीं बनाता; पहले evidence eligibility assess करता है। Random coordinates या image outline से ULPIN बनाना legally गलत और technically unreliable होगा।

=== 2. आपने 3D में building को कैसे show किया?

CesiumJS और Three.js visual/spatial context देते हैं। Source-backed footprint उपलब्ध होने पर map geometry render होती है। Verified height होने पर ही controlled extrusion unlock होगी। Synthetic demo geometry अलग label में है और real data store में write नहीं होती।

=== 3. AI का role क्या है? क्या AI data fabricate करता है?

नहीं। AI केवल source-backed alias catalog में language-to-record routing करता है। Backend prompt और JSON schema explicitly false location, owner, height, floor, ULPIN और geometry ban करते हैं। Match न मिलने पर system “unavailable” कहता है।

=== 4. Drone और LiDAR layers real हैं क्या?

Current synthetic-map controls *simulated visual-context layers* हैं। वे real drone imagery या LiDAR survey dataset होने का दावा नहीं करते। Real use में licensed/authorized imagery, point cloud metadata, acquisition date, accuracy, CRS और quality control अनिवार्य होंगे।

=== 5. RERA endpoint coordinate से polygon क्यों नहीं बनाया?

Record में coordinate “end point of the plot” के रूप में labelled है। [2] एक point से closed parcel boundary derive करना fabrication होगा। Exact footprint के लिए cadastral geometry, approved georeferenced plan या surveyed GCP-based match चाहिए।

=== 6. Plan PDF होने पर भी footprint lock क्यों है?

PDF/local drawing में dimensions हो सकती हैं, पर WGS84 grid, benchmark, coordinate schedule या independent control points न होने पर plan-space outline को map-space polygon नहीं कहा जा सकता। Project GCP validation workflow देता है, लेकिन real controls के बिना output authoritative नहीं बनता।

=== 7. Government systems के साथ integrate कैसे होगा?

Proposed path: Bihar BhuNaksha से selected cadastral record, BiharBhumi से applicable public revenue workflow, AutoMAP से approved-plan/permit reference, Survey of India CORS/GNSS survey controls और DoLR ULPIN standards के अनुसार authority review। Public portal access को automatic legal data import नहीं माना जाएगा। [1] [3] [4] [5] [6]

=== 8. Scale करने पर architecture कैसे चलेगा?

React/Vite frontend CDN/cache friendly है; Node/Express+tRPC backend stateless procedures के रूप में scale हो सकता है; PostGIS spatial indexing/search handle करेगा; S3 evidence files handle करेगा; background ingestion/QA queue future scale-out point होगा। High-resolution LiDAR/mesh के लिए tiling, metadata catalog, asynchronous processing और authorization boundary आवश्यक होंगे।

=== 9. आपके measurable outputs क्या हैं?

Source-attributed search, interactive 3D spatial context, evidence locks, authority source-access panel, GCP transform validation, non-persistent synthetic GeoJSON, admin-gated footprint edit path, responsive interface और automated tests। Current validation baseline: TypeScript check, production build और 24 Vitest files / 58 tests passed during the current development cycle।

=== 10. आपकी सबसे बड़ी limitation क्या है?

The largest limitation is intentionally strict: without authority-backed polygon, survey control, verified metre height और vertical registration, the system will not present a legal 3D cadastre or issued vertical ULPIN. यह demo completeness की limitation है, पर trust, auditability और future government adoption की strength भी है।

== Future Roadmap

#table(
  columns: (1fr, 2.35fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Phase*], [*Next work*]),
  [Pilot], [Partner authority provides one approved cadastral parcel, plan, survey control set and written data-use approval],
  [Survey integration], [Import CORS/RTK observations with CRS, date, instrument, accuracy and surveyor metadata],
  [Plan/BIM pipeline], [Georeference approved floor plans; validate topology; model floors, units and common areas],
  [3D cadastre], [Represent volumetric rights, underground assets, air-rights और conflict checks],
  [Authority issuance], [Implement standards-aligned identifier generation only inside authorized DoLR/state workflow],
  [Operations], [Audit trail, approvals, versioned geometries, QA dashboards और citizen/official access roles],
)

== Glossary

#table(
  columns: (1.25fr, 2.8fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Term*], [*अर्थ*]),
  [ULPIN], [Unique Land Parcel Identification Number; DoLR-linked parcel identity framework.],
  [VPM], [Vertical Property Mapping—floors, units, volumes और rights को vertical dimension में map करने की approach.],
  [PostGIS], [PostgreSQL extension for spatial geometry, spatial query और GIS workflows.],
  [GeoJSON], [Map geometry और attributes share करने का standard JSON format.],
  [GCP], [Ground Control Point; plan/image coordinate को real-world coordinate system से link करने वाला surveyed reference.],
  [EPSG:4326], [WGS84 latitude/longitude coordinate reference system.],
  [CORS], [Continuously Operating Reference Station; GNSS/RTK positioning workflow support.],
  [LiDAR], [Laser-based 3D point-cloud capture technology.],
  [BIM], [Building Information Modeling—building elements/floors/units का structured digital model.],
  [Evidence lock], [A rule that prevents a claim/output until its required authority/survey evidence is present.],
)

== निष्कर्ष

3D ULPIN-VPM का objective केवल “beautiful 3D building” बनाना नहीं है। इसका objective trustworthy digital land governance के लिए ऐसी architecture बनाना है जिसमें every geometry, height, floor, owner reference और identifier की evidence status visible हो। Project दिखाता है कि 3D visualization, AI assistance और GIS automation useful हैं, लेकिन authority evidence और survey discipline के बिना वे legal truth नहीं बनते। यही approach hackathon prototype को real-world government workflow के लिए safer और more scalable बनाती है।

== References

[1] Department of Land Resources, Government of India. #link("https://dolr.gov.in/en/ulpin/")[Bhu-Aadhar: Unique Land Parcel Identification Number (ULPIN)]. Accessed 24 August 2026.

[2] Bihar Real Estate Regulatory Authority. #link("https://rera.bihar.gov.in/QRCODE.aspx?id=RERAP125201800396-5")[KUSUM SURESH ENCLAVE project record]. Accessed 24 August 2026.

[3] Bihar BhuNaksha. #link("https://bhunaksha.bihar.gov.in/index.jsp")[Official cadastral-map portal]. Accessed 24 August 2026.

[4] Revenue and Land Reforms Department, Government of Bihar. #link("https://biharbhumi.bihar.gov.in/Biharbhumi/")[BiharBhumi online services]. Accessed 24 August 2026.

[5] Patna Municipal Corporation. #link("https://automap.bihar.gov.in/PATNABPASPORTAL/Home")[AutoMAP Building Plan Approval System]. Accessed 24 August 2026.

[6] Survey of India. #link("https://surveyofindia.gov.in/pages/continuously-operating-reference-stations-cors-")[Continuously Operating Reference Stations (CORS) SOPs]. Accessed 24 August 2026.

[7] Project source: `server/routers.ts`, `shared/syntheticGcpDemo.ts`, `client/src/components/CesiumSpatialViewer.tsx`, `submission/kusum-suresh-enclave-rera-evidence.json`, `research/official-bihar-data-sources-audit.md`, and `package.json` in the 3D ULPIN-VPM repository. Internal implementation review, August 2026.
