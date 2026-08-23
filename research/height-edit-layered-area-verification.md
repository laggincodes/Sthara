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
