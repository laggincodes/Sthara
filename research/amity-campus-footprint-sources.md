# Amity University Patna — Campus Geometry Source Review

## Verified location reference

OpenStreetMap Nominatim returned `amity university patna` as OSM node `12597547717` at **25.6124294, 85.0547790**. The OSM API confirms the same name and coordinates, with the `office=educational_institution` tag. This is a point reference only; it is not a campus boundary or building footprint.

- Nominatim source: https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=5&q=Amity%20University%20Patna%2C%20Bihar%2C%20India
- OSM node API: https://api.openstreetmap.org/api/0.6/node/12597547717.json
- OSM source licence: ODbL 1.0

An Overpass query for `building=*` ways within 70 metres of the OSM location returned no features, so OpenStreetMap cannot currently supply a verified campus perimeter at this location.

- Overpass query: https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bway%28around%3A70%2C25.6124294%2C85.0547790%29%5Bbuilding%5D%3Bout%20geom%3B

## Reusable building-footprint candidates

Microsoft Global ML Building Footprints covers India and is licensed under **CDLA Permissive 2.0**. Its Amity location tile is quadkey `123133020`, advertised at 74.9 MB. Direct retrieval exceeded the sandbox runtime/memory limit, so it has not been treated as validated geometry.

- Dataset documentation: https://github.com/microsoft/GlobalMLBuildingFootprints
- Tile index: https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv
- Identified shard: https://bfppub.z5.web.core.windows.net/2026-08-13/global-buildings.geojsonl/RegionName=India/quadkey=123133020/part-00000-110f5303-ff85-4c71-a2bf-c6070024fec8.c000.csv.gz

Google Open Buildings V3 also covers India. It provides building polygons inferred from high-resolution imagery and supports CC-BY-4.0 or ODbL licensing. Its direct country/tile files can be large; access through Google Earth Engine requires an Earth Engine account or a user-provided approved export.

- Dataset documentation: https://sites.research.google/gr/open-buildings/
- Earth Engine catalog: https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings_v3_polygons

## Import decision

The dashboard currently stores the OSM point as an attributed **location reference**, not as a footprint. An actual campus polygon must come from one of the listed reusable datasets, an official GIS file, or a user-approved GeoJSON/KML export before it is imported into Neon PostGIS.
