# Mock Demo Workflow QA

The responsive workspace remained stable after adding the prototype tools. The Cesium preview continues to occupy its own map section, with the existing measurement controls preserved in the map. The new controls live in the dossier flow and are not placed over the map by default.

The sample asset path is browser-local. Image floor plans and PDF floor plans display in a clearly labeled preview overlay; GLB/GLTF files are passed to a labeled Cesium model entity at a demo anchor. All sample asset states are explicitly marked as demo-only, not georeferenced, not surveyed, or not authoritative.

The mock identity and rights panel requires a selected source record for the mock generation action. Its generated identifier uses a `MOCK-3D-` prefix and is labeled not issued. Ownership and vertical-rights fields use placeholder/demo wording and never represent a real owner or legal right.

Responsive visual checks were completed at 390×844. TypeScript and regression/build validation passed after the implementation.
