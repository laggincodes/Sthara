# Approved-height, footprint-correction, and layered-area verification

**Verified on 2026-08-23.** The desktop 1280 × 900 command view shows the live Cesium area, 34 live records, a 17,742.41 m² calculated situated-footprint total, the individual-footprint/no-boundary disclaimer, and the new focused 3D-area control. The heading now consistently identifies the Amity University Patna reference area.

**Verified on 2026-08-23.** The mobile 390 × 844 view keeps the layered 3D search input and its touch-sized focus control visible, shows the layer/area/disclaimer summary without horizontal overflow, and retains the map control buttons, property inspector, and layer toggles in a single-column layout.

The viewer currently renders all imported building footprints as individual polygons. It applies extrusion only when an authority supplies and saves an approved height; the absence of height values is intentionally shown as unapproved rather than inferred from ML confidence.

**Interactive check.** The desktop **Show in 3D** control was clicked in the live preview and returned the confirmation “Layered 3D area focused” with the same live building-layer count and calculated area. This confirms the visible area-search action is wired to the Cesium focus command rather than acting as a static control.

**Interactive check.** The touch-accessible **Inspect a live building footprint** control selected a source-traced Microsoft record and exposed its area, distance, unapproved-height status, source license, and explicit no-ownership-link state. Its **Correct & link** action opened the revision form with editable GeoJSON, an approved-height source field, parcel reference, ULPIN record, owner/rights-holder, ownership basis, editor identity, and mandatory revision note. No synthetic ownership or height values were saved during verification.

**Interactive check.** The query-backed area workflow was tested using `cimage`, which deliberately resolves to the Amity University Patna presentation. The browser returned a live PostGIS result of **33 matching individual building footprints** and **17,742.41 m²** of situated footprint area, then filtered the 3D workspace accordingly. During this check, an ambiguous join-column error was detected and corrected by qualifying the PostGIS geometry-query columns; the live map subsequently restored to **34 / 34** records before the search filter was applied.

**Visual check.** The final 1280 × 900 and 390 × 844 screenshots confirm that the real area-search input, result metrics, Cesium workspace, source disclaimers, layer controls, and touch targets remain visible and usable without horizontal overflow. The correction path is restricted at the server to signed-in administrators; because the current preview has no authenticated authority session and no approved height or legal ownership evidence has been supplied, no synthetic save was performed.

**Protected-edit check.** A source-traced imported footprint was selected through the accessible inspector and opened in the correction workflow. The form presented four assisted longitude/latitude vertex pairs, a source-reset control, reviewed GeoJSON, complete ownership-evidence fields, and an explicit **Administrator sign-in required** disabled save control in the unauthenticated preview. Automated tests additionally reject both unauthenticated and non-administrator update calls before they reach PostGIS.

**Full-page workspace check.** The authority editor now uses a fixed, full-viewport overlay above the dashboard navigation, with a separate-tab control and a browser full-screen control in the top-right action cluster. This gives users a reliable escape from the split preview surface before entering authority evidence.

**URL restoration check.** Loading `?editor=MS-BUILDING-123133020-4ccb72e4db684f81` restored the matching source-traced footprint directly into the full-page editor, including its four assisted vertices and administrator-only save state. The mobile capture initially displayed the dashboard while live PostGIS data was still loading; the URL editor opens after that query resolves, as confirmed in the interactive browser flow.

**True mobile check.** The dedicated 390 × 844 browser verification waited for live PostGIS data, then confirmed `editorOpen: true`, the exact selected source record, `formWidth: 390`, and `formLeft: 0`. The captured screen shows the authority editor—not the dashboard—occupying the full mobile viewport with readable, single-column inputs and no split pane.

**User confirmation.** The formerly inactive administrator requirement control was replaced with an enabled **Sign in as administrator** action that retains the selected source-record context before entering secure sign-in. The user confirmed that the repaired action works correctly.

**End-to-end access confirmation.** The user confirmed that, after completing administrator sign-in, the application returned to the same selected footprint’s **Correct live footprint** authority editor. This verifies the resume key and URL-backed context restoration path in the real sign-in flow.

**Dedicated 3D workspace check.** The updated home dashboard presents a 3D cadastral visual hero with live-footprint, layer, and authority-gating metrics. Its **Show in 3D** action navigates to `/workspace?site=Amity%20University%20Patna`, where live PostGIS polygons, map controls, layer switches, a property dossier, and the individual-footprint/no-boundary disclaimer are available in a full-screen reference-inspired spatial layout. The 390 × 844 capture retains the home hero, search action, Cesium controls, dossier, and layer switches without horizontal overflow.

**Navigation check.** The home **Show in 3D** control was clicked and entered the dedicated spatial workspace with the Amity query preserved. The **Data ingestion** navigation also opened the usable evidence-intake dialog with GeoJSON and floor-plan branches, a drop zone, validation feedback, and a close control.

**Home control matrix.** Sidebar **3D workspace**, **Buildings**, and **Property volumes** enter the dedicated live spatial workspace; **Parcels** and **ULPIN registry** open the intelligence search with a focused query; **Data ingestion** and **Processing queue** open the evidence-intake workflow. Resource pills route to their matching upload branch or to an operational configuration panel. The parcel action was interactively checked and opened the search dialog with the query “Find parcel records.”

**Return-navigation check.** Loading the dedicated-workspace return route `?workspace=ULPIN%20registry` opened the home intelligence dialog and populated it with “Find a 3D ULPIN record,” confirming that back-navigation parameters now resolve to an actionable dashboard destination.

**Operational-panel check.** The settings route now opens a dedicated **Workspace settings** panel with current PostGIS/layer status and an **Enable all layers** action; the action was exercised successfully. Audit, conflict, GNSS/CORS, DEM/DSM, and operator controls likewise show feature-specific status and route to live inspection or 3D review rather than relying on a generic placeholder message.

**Conflict navigation check.** The **Conflict workspace** panel was opened and its **Open 3D review** action was clicked. It routed to the dedicated `/workspace` view with the Amity University Patna site query preserved and the live building-layer dossier visible.

**Coordinate resource check.** The home **GNSS / CORS** resource opened the specific **GNSS / CORS alignment** panel, showed its EPSG:4326 reference-point guidance, and exposed an **Open 3D review** route for inspecting individual live footprints against the verified location reference.

**Operator check.** The **Operator account** route opened a specific authority-access panel with the authenticated account’s current role, edit requirements, source-geometry guardrail, and an **Open live records** action. That action was clicked and returned to the dedicated Amity live 3D workspace.

**Audit source-layer check.** The **View audit trail** control opened a specific cadastral audit panel. Its **Inspect source layer** action selected `MS-BUILDING-123133020-4ccb72e4db684f81` in the live PostGIS inspector and opened the traceability detail with area, height, distance, attribution, and no-inferred-ownership disclosures.

**Project-home visual check.** The home dashboard now foregrounds the 3D ULPIN-VPM project instead of the Amity site name. It uses the project team’s supplied 3D workspace screenshot as the hero visual, presents the ULPIN/vertical-rights/underground-assets/evidence narrative, and retains the live 3D workspace call to action. Desktop and 390 × 844 mobile captures show readable project copy, the visual treatment, and touch-sized controls without horizontal overflow.

**Search-to-structure check.** Searching `cimage` in the dedicated workspace returned 33 matched PostGIS building footprints and the camera settled on the source geometry. Searching an unmapped place returned an explicit **No verified 3D visual** state, zero visible footprints, and a prompt to search a mapped site, ULPIN, parcel, or building record; no unverified building model was invented.

**Mobile structure-panel check.** At 390 × 844, the dedicated workspace shows the source-backed structure inspector with an illustrative vertical preview, touch-sized scene controls, and either a matched-geometry focus state or a clear unavailable-visual message. The preview is labelled as a guide; only approved heights are rendered as real Cesium extrusion.

**Second screenshot treatment.** The second project-team screenshot is embedded within the home structure-preview panel as a labelled reference composition. Desktop and full-page 390 × 844 mobile captures show it alongside the live Cesium source-geometry view, the inspector, search controls, and visible source-status wording; it does not intercept any controls or replace the live geometry layer.

**Control clearance confirmation.** The desktop dashboard retained its visible area-search input and **Show in 3D** action, all three Cesium map controls, and live source-status labels after the screenshot was added. The **Zoom in** control was clicked successfully, confirming the screenshot is confined to the inspector preview and does not cover the interactive map.

**True-mobile control confirmation.** In a 390 × 844 browser session, the home search input accepted `cimage` and the visible **Show in 3D** action opened `/workspace?site=cimage`. The dedicated workspace retained the live 33-footprint source-backed view, searchable control, zoom/reset controls, and source-status labels. This confirms the second screenshot did not obstruct mobile search, controls, or status information.

**True-mobile map-control confirmation.** The mobile dedicated workspace’s visible **Reset north** and **Zoom in** Cesium controls were used after the second screenshot integration. Reset showed the full 33-footprint source cluster; Zoom in retained its source-backed labels and visibly enlarged that cluster, confirming that the screenshot does not cover mobile Cesium controls.

**Measured mobile camera comparison.** Two captured 390 × 844 map-stage images were evaluated inside the map-only crop. The reset state’s teal footprint cluster measured **230 × 225 px** (51,750 px² bounding box; 6,054 cyan source pixels), while the post-zoom state measured **281 × 277 px** (77,837 px² bounding box; 9,317 cyan source pixels). The larger post-zoom footprint envelope provides an independently reproducible confirmation that the camera view changed after the mobile control action.

**Navigation-audit progress.** The home **Drone imagery** resource opened the data-ingestion workflow with the GeoJSON evidence branch. Within that workflow, the **Floor plan** branch switched the accepted intake type to PDF, PNG, or JPG floor plans. Both routes expose the same validation-and-queue action rather than a passive placeholder.

**Default-review-route repair.** The GNSS / CORS panel correctly exposed its coordinate-control guidance and a 3D-review action, but audit found that an empty home search produced `/workspace?site=`. The route now falls back to the verified Amity University Patna reference area. Retesting confirmed `/workspace?site=Amity%20University%20Patna`, 33 matched PostGIS footprints, and the 17,742.41 m² source-backed footprint area.

**Terrain-route check.** The **DEM / DSM** resource opens its terrain-evidence workspace, which explicitly preserves the approval safeguard for elevation-derived heights. Its **Open 3D review** control was tested with an empty home search and reached the same verified Amity reference route with 33 matched source footprints.

**Settings-route check.** The topbar **Settings** control opens the specific Workspace settings panel, displays the active-layer and PostGIS-refresh context, and its **Enable all layers** action was exercised. The panel retained the expected four-layer enabled state.

**Map-header action check.** The map-header **Spatial layers** action opened the four-layer panel and its **Focus live layers** action returned to the interactive Cesium scene. The adjacent **Inspect a live building footprint** action selected `MS-BUILDING-123133020-4ccb72e4db684f81`, opened the source-traced dossier, and displayed its 65.51 m² footprint area, no-approved-height status, Microsoft attribution, CDLA Permissive 2.0 license, and no-inferred-ownership disclosure.

**Parcel-navigation check.** The **Parcels** rail entry opened the intelligence dialog with “Find parcel records.” Submitting that query returned the registered-catalog result set for parcel `P-0421`, including three stored ULPIN records and an **Open property information** action; the response explicitly stated that it did not infer data beyond the supplied catalog.

**ULPIN-registry check.** The **ULPIN registry** rail entry opened the same intelligence workflow with “Find a 3D ULPIN record.” Its result resolved the stored `KA-29-105-0421-B11-F07-008` record, including its documented floor, elevation band, and registered air-rights boundary, followed by an **Open property information** action.

**Volume-workspace route check.** The **Buildings** and **Property volumes** rail entries were each clicked. Both opened `/workspace?site=Amity%20University%20Patna` when the home query was empty, where the live scene presented the 33 matched individual source footprints and 17,742.41 m² footprint-area total.

**Evidence-navigation check.** The **Data ingestion** and **Processing queue** rail entries were each clicked. Both open the evidence-intake station with GeoJSON and floor-plan categories, a type-constrained file drop zone, and the **Validate & add to queue** action. This shared workflow is deliberate: queue admission follows the same validation gate as direct evidence ingestion.

**Operator-route check.** The Operator account handler was verified to open the authority-operator panel, which correctly identifies the signed-in user role and restates the administrator requirement for approved edits. Its **Open live records** action reached `/workspace?site=Amity%20University%20Patna`, retaining the 33 matched source footprints. The initial low-screen automated click did not trigger the visible panel; direct activation of the same interactive control confirmed the application handler itself is functioning.

**Audit-trail check.** The **View audit trail** action opened the named cadastral audit workspace with the topology, LiDAR, and utility-depth context. Its **Inspect source layer** action selected `MS-BUILDING-123133020-4ccb72e4db684f81` and opened the source-traced footprint dossier with the same 65.51 m², attribution, and no-ownership-inference disclosures.

**Conflict-route check.** The **Open conflict workspace** action opened the named topology-resolution panel. Its **Open 3D review** control reached `/workspace?site=Amity%20University%20Patna`, showing the 33 matched source footprints and the live source-backed 3D status.
