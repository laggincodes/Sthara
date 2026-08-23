# IIT Patna 3D presentation evidence assessment

## Sources examined on 2026-08-23

The official IIT Patna website identifies the institution and exposes general campus-life material, including a campus-tour link, but the reviewed public page did not provide an authoritative building-height, floor-plan, or floor-count dataset for the selected source footprints. The current IIT Patna reference anchor is OpenStreetMap way `1368115899`; it is retained only as a named place-location reference and is not converted into a legal parcel, ownership record, or inferred campus boundary.

The existing live source layer contains four individual Microsoft Global ML Building Footprints within 180 m of the IIT Patna location anchor. Their provenance is Microsoft Global ML Building Footprints under CDLA Permissive 2.0, with no approved height or floor attributes. Therefore, they support a footprint-cluster presentation, but not a factual extruded tower, floor plan, unit plan, or floor-count claim.

Cesium’s OSM Buildings product can render global OpenStreetMap-derived 3D building tiles and exposes source metadata. Its documented `cesium#estimatedHeight` may be calculated from levels when explicit height is absent, so it must be labelled as a **non-authoritative visual estimate** and cannot populate the cadastral approved-height, floor/unit, ownership, or rights workflow.

## Permissible product direction

The user’s supplied reference composition can inform the interface style: a recognisable selected-structure presentation with a readable status panel and an ordered evidence review. The IIT view must distinguish the current **source footprint cluster** from an **authority-backed building volume**. Any schematic shown before authoritative height/floor evidence arrives will be labelled as a conceptual structural diagram, not an exact building or floor model.

## References

1. [IIT Patna official website](https://www.iitp.ac.in/)
2. [OpenStreetMap IIT Patna anchor way](https://www.openstreetmap.org/way/1368115899)
3. [Cesium OSM Buildings documentation](https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/)
4. [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints)

## UI verification

The IIT Patna workspace was checked at 1280×720 and 396×857. The matched result reports four live PostGIS footprints and camera focus, while the Three.js inspector renders the selected footprint as a rotatable source geometry. The vertical review sketch now shows **Floor diagram locked** and explains that an approved floor plan is required; it does not invent floor count or units. The optional Cesium OSM context loaded with visible Cesium attribution and is described in the dossier as visual context only. The mobile full-page view keeps the search control, ordered review layers, footprint preview, locked floor sketch, spatial-layer toggles, and evidence disclaimer accessible.

The OSM context layer is controlled by the existing building-layer toggle. It is not used to write `approvedHeightMetres`, floor metadata, ownership, ULPIN, rights, or subsurface records.

References: [Cesium OSM Buildings documentation](https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/); [IIT Patna official website](https://www.iitp.ac.in/).

## Unknown-place regression

After the presentation upgrade, `Unknown tower in Patna` was checked at 1280×720 and 396×857. Both views showed **No verified 3D visual**, zero source-backed footprint area, the empty Three.js state, the ordered review panel, and the OSM visual-context disclaimer. No geometry or floor diagram was fabricated for the unmatched query.
