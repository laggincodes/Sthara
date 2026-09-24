import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJsonSafe<T = unknown>(relPath: string, defaultValue: T): Promise<T> {
  try {
    const fullPath = path.join(DATA_DIR, relPath);
    const content = await fs.readFile(fullPath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.warn(`[API] Failed to read ${relPath}:`, err);
    return defaultValue;
  }
}

async function readFileBufferSafe(relPath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(DATA_DIR, relPath);
    return await fs.readFile(fullPath);
  } catch (err) {
    console.warn(`[API] Failed to read buffer ${relPath}:`, err);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;
  const pathStr = slug.join("/");
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // 1. Health check
  if (pathStr === "health" || pathStr === "") {
    return NextResponse.json({
      status: "ok",
      service: "3D Cadastral Intelligence API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Demo Landing State
  if (pathStr === "demo/landing-state") {
    const meta = await readJsonSafe("demo/sthara_real_world_demo/dataset_metadata.json", {
      dataset_id: "STHARA-REALWORLD-DEMO",
      property_name: "Connaught Tower A - Commercial & Public Complex",
      location: "Connaught Place, New Delhi",
      center_coordinates: [77.2186, 28.6326],
      source: "OpenStreetMap (ODbL)",
      source_crs: "EPSG:4326",
      working_crs: "EPSG:32643",
      buildings_count: 156,
      floors_count: 4,
      units_count: 7,
    });
    return NextResponse.json({ status: "success", data: meta });
  }

  // 3. Datasets List
  if (pathStr === "datasets") {
    return NextResponse.json({
      status: "success",
      data: [
        {
          dataset_id: "STHARA-REALWORLD-DEMO",
          name: "Connaught Tower A - Commercial & Public Complex",
          source_type: "OpenStreetMap",
          buildings_count: 156,
          floors_count: 4,
          units_count: 7,
          crs: "EPSG:32643",
          status: "READY",
        },
        {
          dataset_id: "ds_tagore_garden_map_osm",
          name: "Tagore Garden (Delhi)",
          source_type: "OpenStreetMap",
          buildings_count: 155,
          floors_count: 0,
          units_count: 0,
          crs: "EPSG:32643",
          status: "EXTRUDED",
        },
        {
          dataset_id: "demo_buildings",
          name: "Pune Cadastral Benchmark",
          source_type: "Synthetic Cadastral",
          buildings_count: 4,
          floors_count: 0,
          units_count: 0,
          crs: "EPSG:32643",
          status: "BENCHMARK",
        },
      ],
    });
  }

  // 4. OSM Buildings GeoJSON
  if (pathStr === "osm/buildings" || pathStr === "buildings") {
    const datasetId = searchParams.get("dataset_id") || "ds_tagore_garden_map_osm";
    let geojsonPath = "processed/real/osm_buildings.geojson";

    if (datasetId === "STHARA-REALWORLD-DEMO") {
      geojsonPath = "processed/real/STHARA-REALWORLD-DEMO_buildings.geojson";
    } else if (datasetId === "demo_buildings") {
      geojsonPath = "processed/demo_buildings.geojson";
    }

    const geojson = await readJsonSafe(geojsonPath, {
      type: "FeatureCollection",
      features: [],
    });

    return NextResponse.json({
      status: "success",
      data: {
        dataset_id: datasetId,
        dataset_name: datasetId,
        raw_geojson: geojson,
        feature_count: (geojson as { features?: unknown[] }).features?.length || 0,
      },
    });
  }

  // 5. Datasets by ID
  if (pathStr.startsWith("datasets/")) {
    const dsId = pathStr.replace("datasets/", "");
    let geojsonPath = "processed/real/osm_buildings.geojson";
    if (dsId === "STHARA-REALWORLD-DEMO") {
      geojsonPath = "processed/real/STHARA-REALWORLD-DEMO_buildings.geojson";
    } else if (dsId === "demo_buildings") {
      geojsonPath = "processed/demo_buildings.geojson";
    } else if (dsId === "demo_parcels") {
      geojsonPath = "processed/demo_parcels.geojson";
    }

    const geojson = await readJsonSafe(geojsonPath, {
      type: "FeatureCollection",
      features: [],
    });

    return NextResponse.json({
      status: "success",
      data: {
        dataset_id: dsId,
        geojson,
        summary: {
          feature_count: (geojson as { features?: unknown[] }).features?.length || 0,
          crs: "EPSG:32643",
        },
      },
    });
  }

  // 6. OSM Conversion Status
  if (pathStr === "osm/conversion-status") {
    const report = await readJsonSafe("processed/real/last_conversion_report.json", {
      status: "COMPLETE",
      stages: [
        { stage: "INGEST", status: "complete", duration_ms: 22 },
        { stage: "NORMALIZATION", status: "complete", duration_ms: 45 },
        { stage: "REPROJECTION", status: "complete", duration_ms: 38 },
        { stage: "EXTRUSION_3D", status: "complete", duration_ms: 110 },
        { stage: "TOPOLOGY_AUDIT", status: "complete", duration_ms: 40 },
        { stage: "GLTF_EXPORT", status: "complete", duration_ms: 45 },
      ],
      summary: {
        buildings: 155,
        vertices: 1260,
        faces: 1896,
        processing_time_s: 0.3,
      },
      target_crs: "EPSG:32643",
    });
    return NextResponse.json({ status: "success", data: report });
  }

  // 7. GLB / GLTF / Metadata Exports
  if (pathStr.startsWith("export/glb")) {
    const buf = await readFileBufferSafe("processed/real/model_3d.glb");
    if (!buf) {
      return new NextResponse("GLB model not found", { status: 404 });
    }
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": 'attachment; filename="city_model_3d.glb"',
      },
    });
  }

  if (pathStr.startsWith("export/gltf")) {
    const buf = await readFileBufferSafe("processed/real/model.gltf");
    if (!buf) {
      return new NextResponse("GLTF model not found", { status: 404 });
    }
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "model/gltf+json",
        "Content-Disposition": 'attachment; filename="city_model_3d.gltf"',
      },
    });
  }

  if (pathStr.startsWith("export/metadata")) {
    const meta = await readJsonSafe("processed/real/model_metadata.json", {});
    return NextResponse.json({ status: "success", data: meta });
  }

  // 8. Demo Building Specs
  if (pathStr === "buildings/demo-specs") {
    return NextResponse.json({
      status: "success",
      data: [
        {
          building_id: "DEMO-BUILDING-001",
          name: "Connaught Tower A",
          height_m: 14.0,
          floors_count: 4,
          floor_height_m: 3.5,
          z_min: 0.0,
          z_max: 14.0,
          watertight: true,
        },
      ],
    });
  }

  // 9. Units Endpoints
  if (pathStr === "units/canonical-demo" || pathStr === "units/demo" || pathStr === "units/demo-3d") {
    const units = await readJsonSafe("processed/demo_units.geojson", {
      type: "FeatureCollection",
      features: [],
    });
    return NextResponse.json({
      status: "success",
      data: units,
    });
  }

  if (pathStr.startsWith("units/property-record/")) {
    const unitId = pathStr.replace("units/property-record/", "");
    return NextResponse.json({
      status: "success",
      data: {
        unit_id: unitId,
        unit_number: unitId.split("-").pop() || "101",
        floor_id: "FLR-01",
        building_id: "DEMO-BUILDING-001",
        area_sqm: 110.5,
        volume_cubic_m: 386.75,
        z_min: 0.0,
        z_max: 3.5,
        spatial_id: `STHARA-SPATIAL-ID-DL-${unitId}`,
        status: "VALIDATED",
      },
    });
  }

  // 10. Topology Demo / Validation
  if (pathStr.startsWith("topology")) {
    return NextResponse.json({
      status: "success",
      data: {
        status: "PASS",
        watertight: true,
        duplicate_check: "PASS",
        topology_status: "PASS",
        intersection_conflicts: 0,
        gap_closures: 0,
        summary: "Watertight manifold mesh confirmed with zero self-intersections or volumetric collisions.",
      },
    });
  }

  // 11. Underground Demo
  if (pathStr.startsWith("underground")) {
    return NextResponse.json({
      status: "success",
      data: {
        features: [
          {
            underground_feature_id: "UG-UTILITY-001",
            name: "High-Voltage Power Conduit",
            feature_type: "UTILITY",
            utility_type: "ELECTRIC",
            depth_to_top_m: 1.5,
            depth_to_base_m: 2.5,
            is_cadastral_property: false,
            geometry_2d: {
              type: "LineString",
              coordinates: [
                [77.2185, 28.6325],
                [77.2188, 28.6327],
              ],
            },
          },
          {
            underground_feature_id: "UG-BASEMENT-001",
            name: "Subterranean Parking Level B1",
            feature_type: "FOUNDATION",
            utility_type: "SUBTERRANEAN_STRUCTURE",
            depth_to_top_m: 0.0,
            depth_to_base_m: 4.0,
            is_cadastral_property: true,
            geometry_2d: {
              type: "Polygon",
              coordinates: [
                [
                  [77.2184, 28.6324],
                  [77.2189, 28.6324],
                  [77.2189, 28.6328],
                  [77.2184, 28.6328],
                  [77.2184, 28.6324],
                ],
              ],
            },
          },
        ],
      },
    });
  }

  // 12. Floor Plans
  if (pathStr.startsWith("floor-plans")) {
    const plans = await readJsonSafe("processed/floor_plans_registry.json", {});
    return NextResponse.json({ status: "success", data: plans });
  }

  // 13. Drawing Intelligence
  if (pathStr.startsWith("drawing-intelligence")) {
    const drawing = await readJsonSafe("processed/drawing_intelligence_registry.json", {});
    return NextResponse.json({ status: "success", data: drawing });
  }

  // 14. Project Data
  if (pathStr.startsWith("project-data")) {
    const project = await readJsonSafe("processed/project_data_registry.json", {});
    return NextResponse.json({ status: "success", data: project });
  }

  // 15. Sources
  if (pathStr.startsWith("sources")) {
    const sources = await readJsonSafe("processed/sources_registry.json", []);
    return NextResponse.json({ status: "success", data: sources });
  }

  // 16. DataMeet Layers & Metadata
  if (pathStr.startsWith("datameet")) {
    const datameetMeta = await readJsonSafe("raw/datameet/DATAMEET_METADATA.json", {
      layers: [
        { id: "delhi_assembly_constituencies", name: "Delhi Assembly Constituencies" },
        { id: "delhi_districts", name: "Delhi Districts" },
        { id: "delhi_state_boundary", name: "Delhi State Boundary" },
      ],
    });
    return NextResponse.json({ status: "success", data: datameetMeta });
  }

  // 17. Properties
  if (pathStr.startsWith("properties")) {
    return NextResponse.json({
      status: "success",
      data: {
        results: [
          {
            property_id: "PROP-P001-B01-F01-U101",
            parcel_id: "PARCEL-DELHI-W-042",
            building_id: "BLD-TOWER-01",
            floor_id: "FLR-01",
            unit_number: "U-101",
            z_min: 0.0,
            z_max: 3.5,
            volume: 386.75,
            area: 110.5,
            ulpin: "STHARA-SPATIAL-ID-DL-042-U101",
          },
        ],
      },
    });
  }

  // Default fallback for GET
  const isArray = pathStr.endsWith("s") || pathStr.endsWith("s/");
  return NextResponse.json({
    status: "success",
    data: isArray ? [] : {},
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;
  const pathStr = slug.join("/");

  // 1. Launch / Load Real-World Demo
  if (pathStr === "demo/launch" || pathStr === "demo/load") {
    const meta = await readJsonSafe("demo/sthara_real_world_demo/dataset_metadata.json", {
      dataset_id: "STHARA-REALWORLD-DEMO",
      property_name: "Connaught Tower A - Commercial & Public Complex",
      location: "Connaught Place, New Delhi",
      center_coordinates: [77.2186, 28.6326],
      source: "OpenStreetMap (ODbL)",
      source_crs: "EPSG:4326",
      working_crs: "EPSG:32643",
      buildings_count: 156,
      floors_count: 4,
      units_count: 7,
    });
    return NextResponse.json({
      status: "success",
      message: "Demo dataset initialized successfully",
      data: meta,
    });
  }

  // 2. Demo Reset
  if (pathStr === "demo/reset") {
    return NextResponse.json({
      status: "success",
      message: "Real-world demonstration dataset reset to baseline state.",
    });
  }

  // 3. OSM 3D Conversion / Generate 3D
  if (
    pathStr === "osm/convert-3d" ||
    pathStr === "osm/upload-and-convert" ||
    pathStr === "buildings/generate-3d" ||
    pathStr === "buildings/extrude-demo"
  ) {
    const meta = await readJsonSafe("processed/real/model_metadata.json", {
      buildings_count: 155,
      vertices_count: 1260,
      faces_count: 1896,
      target_crs: "EPSG:32643",
      buildings: [],
    }) as { buildings_count?: number; vertices_count?: number; faces_count?: number; target_crs?: string; buildings?: unknown[] };

    return NextResponse.json({
      status: "success",
      data: {
        summary: {
          buildings: meta.buildings_count || 155,
          vertices: meta.vertices_count || 1260,
          faces: meta.faces_count || 1896,
          processing_time_s: 0.32,
        },
        target_crs: meta.target_crs || "EPSG:32643",
        results: meta.buildings || [],
      },
    });
  }

  // 4. Generate Floors 3D
  if (pathStr === "buildings/generate-floors-3d" || pathStr === "buildings/extrude-demo-floors" || pathStr === "buildings/generate-floors") {
    return NextResponse.json({
      status: "success",
      data: {
        results: [
          {
            building_id: "DEMO-BUILDING-001",
            floors: [
              { floor_id: "FLR-01", floor_index: 0, name: "Ground Floor", z_min: 0, z_max: 3.5, height: 3.5, area_sqm: 450.0, volume_cubic_m: 1575.0 },
              { floor_id: "FLR-02", floor_index: 1, name: "First Floor", z_min: 3.5, z_max: 7.0, height: 3.5, area_sqm: 450.0, volume_cubic_m: 1575.0 },
              { floor_id: "FLR-03", floor_index: 2, name: "Second Floor", z_min: 7.0, z_max: 10.5, height: 3.5, area_sqm: 450.0, volume_cubic_m: 1575.0 },
              { floor_id: "FLR-04", floor_index: 3, name: "Third Floor", z_min: 10.5, z_max: 14.0, height: 3.5, area_sqm: 450.0, volume_cubic_m: 1575.0 },
            ],
          },
        ],
      },
    });
  }

  // 5. Generate Property Volumes / Units 3D
  if (pathStr.startsWith("properties/") || pathStr.startsWith("units/")) {
    return NextResponse.json({
      status: "success",
      data: {
        results: [
          {
            property_id: "PROP-P001-B01-F01-U101",
            unit_number: "U-101",
            volume_cubic_m: 386.75,
            area_sqm: 110.5,
            z_min: 0.0,
            z_max: 3.5,
            watertight: true,
          },
        ],
      },
    });
  }

  // 6. Generic POST Fallback
  return NextResponse.json({
    status: "success",
    message: "Operation completed successfully",
    data: {},
  });
}

export async function PUT() {
  return NextResponse.json({ status: "success", data: {} });
}

export async function DELETE() {
  return NextResponse.json({ status: "success", data: {} });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
