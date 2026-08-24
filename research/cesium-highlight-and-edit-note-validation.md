# Cesium Highlight and Edit-Note Validation

The IIT Patna Cesium scene uses licensed World Imagery, OpenStreetMap-derived 3D context, and live Microsoft building-footprint geometry. Selecting a source footprint now highlights it with a cyan material and pale outline and smoothly focuses the camera on that real geometry. This presentation does not assign a name, floor count, height, unit, owner, parcel, ULPIN, or cadastral status to the selected detection.

The IIT-only evidence panel now includes a distinct **Academic Block-4 — authority gate**. It requires a verified block-to-footprint match and an official floor plan/BIM before a floor-by-floor model or vertical ULPIN may be created.

Desktop validation selected `MS-BUILDING-123133020-0a9141a8cdb7dc5c`, showing its Microsoft source, 1,232.73 m² footprint area, and height-awaiting-authority state. A short `editNote` remained inline-invalid, and the recent network log contained zero `postgis.updateFootprint` requests. The true-mobile 390×844 edit-note harness reported `Required: at least 8 characters.` and no `TRPCClientError`. The mobile Cesium harness confirmed IIT Patna reports four live source footprints with imagery and OSM context, while an unknown query reports zero footprints and no verified building model.
