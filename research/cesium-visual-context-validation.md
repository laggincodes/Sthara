# Cesium Visual Context Validation

The enhanced Cesium stage now loads Cesium World Imagery and OpenStreetMap-derived 3D buildings through the supplied Cesium Ion context. Both are labelled as **visual context only** and are not used as cadastral evidence, legal parcel geometry, ownership, ULPIN, height, floor, utility, conflict, or quality data.

Desktop verification for IIT Patna showed the imagery beneath four live Microsoft footprint detections and displayed the required Cesium/OSM attribution. The inspector surfaced only live geometry record type, Microsoft/OSM provenance, selected reference state, public footprint area, evidence-level state, approved-height count, floor-plan/BIM attachment status, and ownership-link status.

The true-mobile harness reported `imagery + OSM 3D context` for IIT Patna, with the visual-context attribution and source facts present. Its unmatched control reported zero source footprints, an explicit `No verified 3D building model` state, and no fabricated ULPIN, building, floor, height, conflict, or quality record.
