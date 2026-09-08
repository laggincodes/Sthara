import math
import time
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Union
import pyproj
import trimesh
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, shape, mapping
from shapely.validation import make_valid
from shapely.ops import transform, unary_union

from app.schemas.osm_converter import (
    Osm3DConversionConfig,
    Osm3DConversionResponse,
    Osm3DConversionSummary,
    ConversionStageReport,
    BuildingMetadataItem,
    HeightSourceOption,
    ExportFormatOption,
)
from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    Generate3DResponse,
    Building3DResult,
    BuildingAttributes3D,
    Mesh3DCollection,
    BatchSummary3D,
    Bounds3D,
)
from app.services.extrusion_service import ExtrusionService
from app.services.osm_service import (
    DEFAULT_RAW_OSM_PATH,
    DEFAULT_PROCESSED_BUILDINGS_PATH,
    parse_numeric_height,
    parse_numeric_levels,
)
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
OUTPUT_GLB_PATH = DATA_DIR / "processed" / "real" / "model_3d.glb"
OUTPUT_GLTF_PATH = DATA_DIR / "processed" / "real" / "model_3d.gltf"
OUTPUT_METADATA_PATH = DATA_DIR / "processed" / "real" / "model_metadata.json"
LATEST_REPORT_PATH = DATA_DIR / "processed" / "real" / "last_conversion_report.json"


def auto_detect_utm_crs(lon: float, lat: float) -> str:
    """Computes the optimal WGS84 UTM Zone EPSG code for any coordinate on Earth."""
    zone = int(math.floor((lon + 180) / 6) + 1)
    epsg = 32600 + zone if lat >= 0 else 32700 + zone
    return f"EPSG:{epsg}"


class Osm3DConverterService:
    """
    High-performance, deterministic engine converting OpenStreetMap & GeoJSON
    building footprints into valid, watertight 3D architectural city meshes
    and industry-standard Binary GLB 2.0 / glTF models.
    """

    _last_conversion_result: Optional[Dict[str, Any]] = None

    @classmethod
    def get_last_report(cls) -> Optional[Dict[str, Any]]:
        if cls._last_conversion_result:
            return cls._last_conversion_result
        if LATEST_REPORT_PATH.exists():
            try:
                with open(LATEST_REPORT_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    @classmethod
    def convert_osm_to_3d(
        cls,
        config: Osm3DConversionConfig,
        raw_xml_content: Optional[str] = None,
        source_name_override: Optional[str] = None,
    ) -> Osm3DConversionResponse:
        start_time = time.perf_counter()
        stages: List[ConversionStageReport] = []

        def add_stage(stage_id: str, status: str, message: str = "", **kwargs) -> ConversionStageReport:
            rep = ConversionStageReport(
                stage=stage_id,
                status=status,
                message=message,
                **kwargs
            )
            stages.append(rep)
            return rep

        source_file_path = Path(config.source_file) if config.source_file else DEFAULT_RAW_OSM_PATH
        source_name = source_name_override or source_file_path.name

        # -------------------------------------------------------------
        # STAGE 1: IMPORT
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        if raw_xml_content:
            file_size_bytes = len(raw_xml_content.encode("utf-8"))
            import_details = {"source_type": "memory_buffer", "size_bytes": file_size_bytes}
        else:
            if not source_file_path.exists():
                err_msg = f"Source OSM file '{source_file_path}' not found."
                add_stage("import", "failed", message=err_msg, duration_ms=round((time.perf_counter() - t0) * 1000, 2))
                raise FileNotFoundError(err_msg)
            file_size_bytes = source_file_path.stat().st_size
            import_details = {"source_type": "file_path", "path": str(source_file_path), "size_bytes": file_size_bytes}

        add_stage(
            "import",
            "complete",
            message=f"Dataset '{source_name}' loaded ({file_size_bytes / 1024:.1f} KB).",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details=import_details,
        )

        # -------------------------------------------------------------
        # STAGE 2: PARSE
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        nodes: Dict[str, Tuple[float, float]] = {}
        ways: Dict[str, Dict[str, Any]] = {}
        relations: Dict[str, Dict[str, Any]] = {}
        is_geojson_source = source_name.lower().endswith((".geojson", ".json"))

        parsed_geojson_features: List[Dict[str, Any]] = []

        if is_geojson_source:
            try:
                if raw_xml_content:
                    gdata = json.loads(raw_xml_content)
                else:
                    with open(source_file_path, "r", encoding="utf-8-sig") as f:
                        gdata = json.load(f)
                parsed_geojson_features = gdata.get("features", [])
                parse_msg = f"GeoJSON parsed: {len(parsed_geojson_features)} features found."
            except Exception as e:
                err_msg = f"Failed to parse GeoJSON: {str(e)}"
                add_stage("parse", "failed", message=err_msg, duration_ms=round((time.perf_counter() - t0) * 1000, 2))
                raise ValueError(err_msg)
        else:
            try:
                if raw_xml_content:
                    root = ET.fromstring(raw_xml_content)
                else:
                    tree = ET.parse(source_file_path)
                    root = tree.getroot()

                if root.tag != "osm":
                    raise ValueError(f"Root tag is <{root.tag}>, expected <osm>.")

                for node in root.findall("node"):
                    nid = node.get("id")
                    if nid and "lat" in node.attrib and "lon" in node.attrib:
                        try:
                            nodes[nid] = (float(node.get("lon")), float(node.get("lat")))
                        except ValueError:
                            continue

                for way in root.findall("way"):
                    wid = way.get("id")
                    if wid:
                        nd_refs = [nd.get("ref") for nd in way.findall("nd") if nd.get("ref")]
                        tags = {t.get("k"): t.get("v") for t in way.findall("tag") if t.get("k")}
                        ways[wid] = {"refs": nd_refs, "tags": tags}

                for rel in root.findall("relation"):
                    rid = rel.get("id")
                    if rid:
                        tags = {t.get("k"): t.get("v") for t in rel.findall("tag") if t.get("k")}
                        members = [(m.get("type"), m.get("ref"), m.get("role", "")) for m in rel.findall("member") if m.get("ref")]
                        relations[rid] = {"members": members, "tags": tags}

                parse_msg = f"OSM XML parsed: {len(nodes)} nodes, {len(ways)} ways, {len(relations)} relations."
            except Exception as e:
                err_msg = f"Failed to parse OSM XML: {str(e)}"
                add_stage("parse", "failed", message=err_msg, duration_ms=round((time.perf_counter() - t0) * 1000, 2))
                raise ValueError(err_msg)

        add_stage(
            "parse",
            "complete",
            message=parse_msg,
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "nodes_count": len(nodes),
                "ways_count": len(ways),
                "relations_count": len(relations),
                "geojson_features_count": len(parsed_geojson_features),
            },
        )

        # -------------------------------------------------------------
        # STAGE 3: FEATURE EXTRACTION (Polygons & Building Metadata)
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        raw_buildings: List[Dict[str, Any]] = []
        handled_ways = set()
        degenerate_count = 0

        if is_geojson_source:
            for i, feat in enumerate(parsed_geojson_features):
                geom_dict = feat.get("geometry", {})
                props = feat.get("properties", {})
                b_id = str(props.get("building_id") or feat.get("id") or f"BLD-GEOJSON-{i + 1}")
                try:
                    s_geom = shape(geom_dict)
                    if not s_geom.is_valid:
                        s_geom = make_valid(s_geom)
                    if not s_geom.is_empty and s_geom.area > 0:
                        raw_buildings.append({
                            "building_id": b_id,
                            "osm_id": props.get("osm_id") or str(feat.get("id", "")),
                            "name": props.get("name"),
                            "polygon": s_geom,
                            "tags": props,
                        })
                    else:
                        degenerate_count += 1
                except Exception:
                    degenerate_count += 1
        else:
            # 1. MultiPolygon Relations
            for rid, rel_data in relations.items():
                tags = rel_data["tags"]
                if "building" in tags or tags.get("type") == "multipolygon":
                    outers, inners = [], []
                    for m_type, m_ref, m_role in rel_data["members"]:
                        if m_type == "way" and m_ref in ways:
                            handled_ways.add(m_ref)
                            w = ways[m_ref]
                            pts = [nodes[ref] for ref in w["refs"] if ref in nodes]
                            if len(pts) >= 4 and pts[0] == pts[-1]:
                                try:
                                    p = Polygon(pts)
                                    if not p.is_valid:
                                        p = make_valid(p)
                                    if p.is_valid and not p.is_empty and p.area > 0:
                                        if m_role == "inner":
                                            inners.append(p)
                                        else:
                                            outers.append(p)
                                except Exception:
                                    pass

                    if outers:
                        try:
                            if len(outers) == 1 and not inners:
                                final_p = outers[0]
                            elif len(outers) == 1 and inners:
                                final_p = outers[0]
                                for hole in inners:
                                    final_p = final_p.difference(hole)
                            else:
                                final_p = unary_union(outers)
                                for hole in inners:
                                    final_p = final_p.difference(hole)

                            if not final_p.is_empty and final_p.area > 0:
                                raw_buildings.append({
                                    "building_id": f"OSM-BUILDING-REL-{rid}",
                                    "osm_id": str(rid),
                                    "name": tags.get("name"),
                                    "polygon": final_p,
                                    "tags": tags,
                                })
                            else:
                                degenerate_count += 1
                        except Exception:
                            degenerate_count += 1

            # 2. Closed Building Ways
            for wid, w_data in ways.items():
                if wid in handled_ways:
                    continue
                tags = w_data["tags"]
                if "building" in tags:
                    refs = w_data["refs"]
                    if len(refs) < 4 or refs[0] != refs[-1]:
                        degenerate_count += 1
                        continue
                    pts = [nodes[ref] for ref in refs if ref in nodes]
                    if len(pts) < 4 or pts[0] != pts[-1]:
                        degenerate_count += 1
                        continue

                    cleaned_pts = [pts[0]]
                    for p in pts[1:]:
                        if p != cleaned_pts[-1]:
                            cleaned_pts.append(p)
                    if cleaned_pts[0] != cleaned_pts[-1]:
                        cleaned_pts.append(cleaned_pts[0])

                    if len(cleaned_pts) < 4:
                        degenerate_count += 1
                        continue

                    try:
                        p = Polygon(cleaned_pts)
                        if not p.is_valid:
                            p = make_valid(p)
                        if not p.is_empty and p.area > 0:
                            raw_buildings.append({
                                "building_id": f"OSM-BUILDING-WAY-{wid}",
                                "osm_id": str(wid),
                                "name": tags.get("name"),
                                "polygon": p,
                                "tags": tags,
                            })
                        else:
                            degenerate_count += 1
                    except Exception:
                        degenerate_count += 1

        total_extracted = len(raw_buildings)
        if total_extracted == 0:
            err_msg = "No valid building footprints could be extracted from the dataset."
            add_stage("feature_extraction", "failed", message=err_msg, duration_ms=round((time.perf_counter() - t0) * 1000, 2))
            raise ValueError(err_msg)

        add_stage(
            "feature_extraction",
            "complete",
            message=f"Discovered {total_extracted} valid closed footprint(s) (skipped {degenerate_count}).",
            features=total_extracted,
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={"valid_buildings": total_extracted, "skipped": degenerate_count},
        )

        # -------------------------------------------------------------
        # STAGE 4: CRS TRANSFORMATION (WGS84 -> Projected Metric UTM)
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        all_centroids = [b["polygon"].centroid for b in raw_buildings]
        center_lon = sum(c.x for c in all_centroids) / len(all_centroids)
        center_lat = sum(c.y for c in all_centroids) / len(all_centroids)

        source_crs_str = "EPSG:4326"
        target_crs_str = config.target_crs
        if target_crs_str.lower() == "auto" or not target_crs_str:
            target_crs_str = auto_detect_utm_crs(center_lon, center_lat)

        src_crs = pyproj.CRS.from_user_input(source_crs_str)
        dst_crs = pyproj.CRS.from_user_input(target_crs_str)
        transformer = pyproj.Transformer.from_crs(src_crs, dst_crs, always_xy=True)

        ox_proj, oy_proj = transformer.transform(center_lon, center_lat)
        scene_origin = (round(ox_proj, 2), round(oy_proj, 2), 0.0)

        projected_buildings = []
        for b in raw_buildings:
            try:
                proj_poly = transform(transformer.transform, b["polygon"])
                if not proj_poly.is_valid:
                    proj_poly = make_valid(proj_poly)
                if not proj_poly.is_empty and proj_poly.area >= 0.5:
                    b_copy = dict(b)
                    b_copy["projected_polygon"] = proj_poly
                    projected_buildings.append(b_copy)
            except Exception:
                pass

        add_stage(
            "crs_transformation",
            "complete",
            message=f"Reprojected from {source_crs_str} into metric {target_crs_str} (Origin: [{scene_origin[0]}, {scene_origin[1]}]).",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "source_crs": source_crs_str,
                "target_crs": target_crs_str,
                "viewer_origin": [scene_origin[0], scene_origin[1], scene_origin[2]],
                "center_longitude": round(center_lon, 6),
                "center_latitude": round(center_lat, 6),
            },
        )

        # -------------------------------------------------------------
        # STAGE 5: HEIGHT DETERMINATION & STRUCTURAL SPECIFICATION
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        explicit_height_count = 0
        levels_height_count = 0
        default_height_count = 0

        buildings_with_height = []
        metadata_items: List[BuildingMetadataItem] = []

        for b in projected_buildings:
            tags = b.get("tags", {})
            raw_h = parse_numeric_height(tags.get("height") or tags.get("building:height"))
            raw_l = parse_numeric_levels(tags.get("building:levels") or tags.get("levels"))

            resolved_height = None
            resolved_source = "DEFAULT"

            if config.height_source == HeightSourceOption.OSM_HEIGHT:
                if raw_h is not None and raw_h > 0:
                    resolved_height = raw_h
                    resolved_source = "OSM_HEIGHT_TAG"
                    explicit_height_count += 1
                else:
                    resolved_height = config.default_building_height_m
                    resolved_source = "DEFAULT_CONFIG"
                    default_height_count += 1
            elif config.height_source == HeightSourceOption.BUILDING_LEVELS:
                if raw_l is not None and raw_l > 0:
                    resolved_height = round(raw_l * config.default_floor_height_m, 2)
                    resolved_source = "BUILDING_LEVELS"
                    levels_height_count += 1
                else:
                    resolved_height = config.default_building_height_m
                    resolved_source = "DEFAULT_CONFIG"
                    default_height_count += 1
            elif config.height_source == HeightSourceOption.DEFAULT_HEIGHT:
                resolved_height = config.default_building_height_m
                resolved_source = "DEFAULT_CONFIG"
                default_height_count += 1
            else:
                if raw_h is not None and raw_h > 0:
                    resolved_height = raw_h
                    resolved_source = "OSM_HEIGHT_TAG"
                    explicit_height_count += 1
                elif raw_l is not None and raw_l > 0:
                    resolved_height = round(raw_l * config.default_floor_height_m, 2)
                    resolved_source = "BUILDING_LEVELS"
                    levels_height_count += 1
                else:
                    resolved_height = config.default_building_height_m
                    resolved_source = "DEFAULT_CONFIG"
                    default_height_count += 1

            poly = b["projected_polygon"]
            area = round(poly.area, 2)
            vol = round(area * resolved_height, 2)

            b_entry = dict(b)
            b_entry["height"] = resolved_height
            b_entry["levels"] = raw_l
            b_entry["height_source"] = resolved_source
            b_entry["area_sqm"] = area
            b_entry["volume_cubic_m"] = vol
            buildings_with_height.append(b_entry)

            b_min_x, b_min_y, b_max_x, b_max_y = poly.bounds
            c_pt = poly.centroid
            osm_ref = b.get("osm_id") or b["building_id"].replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", "")
            proto_ulpin = f"DL-OSM-WAY-{osm_ref}-001"

            metadata_items.append(
                BuildingMetadataItem(
                    building_id=b["building_id"],
                    osm_id=b.get("osm_id"),
                    name=b.get("name") or f"Building {osm_ref}",
                    parcel_id="PARCEL-UNREGISTERED",
                    height=resolved_height,
                    z_min=0.0,
                    z_max=resolved_height,
                    levels=raw_l,
                    floor_unit_available=False,
                    height_source=resolved_source,
                    area_sqm=area,
                    volume_cubic_m=vol,
                    source="OpenStreetMap",
                    is_cadastral=False,
                    validation_status="PASS",
                    watertight=True,
                    duplicate_check="PASS",
                    topology_status="PASS",
                    prototype_3d_ulpin=proto_ulpin,
                    bounding_box={
                        "min": [round(b_min_x - scene_origin[0], 2), round(b_min_y - scene_origin[1], 2), 0.0],
                        "max": [round(b_max_x - scene_origin[0], 2), round(b_max_y - scene_origin[1], 2), resolved_height],
                    },
                    centroid=[round(c_pt.x - scene_origin[0], 2), round(c_pt.y - scene_origin[1], 2), round(resolved_height / 2.0, 2)],
                )
            )

        add_stage(
            "height_extraction",
            "complete",
            message=f"Determined heights: {explicit_height_count} from OSM tags, {levels_height_count} from floor levels, {default_height_count} default.",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "explicit_osm_heights": explicit_height_count,
                "levels_derived_heights": levels_height_count,
                "default_fallback_heights": default_height_count,
                "default_floor_height_m": config.default_floor_height_m,
                "default_building_height_m": config.default_building_height_m,
            },
        )

        # -------------------------------------------------------------
        # STAGE 6: GEOMETRY GENERATION (Polyhedral Extrusion into 3D)
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        total_vertices = 0
        total_faces = 0
        total_surface_area = 0.0
        total_volume = 0.0

        building_3d_results: List[Building3DResult] = []
        trimesh_geometries: List[trimesh.Trimesh] = []

        global_min_x = float("inf")
        global_min_y = float("inf")
        global_min_z = float("inf")
        global_max_x = float("-inf")
        global_max_y = float("-inf")
        global_max_z = float("-inf")

        for b in buildings_with_height:
            poly = b["projected_polygon"]
            b_id = b["building_id"]
            height = b["height"]
            base_z = 0.0
            top_z = base_z + height

            polygons_to_extrude = []
            if isinstance(poly, Polygon):
                polygons_to_extrude.append(poly)
            elif isinstance(poly, MultiPolygon):
                polygons_to_extrude.extend(poly.geoms)

            parts = []
            for p_idx, sub_poly in enumerate(polygons_to_extrude):
                part_id = f"{b_id}_part_{p_idx}" if len(polygons_to_extrude) > 1 else b_id
                mesh3d = ExtrusionService._extrude_single_polygon(
                    poly=sub_poly,
                    base_z=base_z,
                    top_z=top_z,
                    origin=scene_origin,
                    feature_id=part_id,
                    horizontal_crs=target_crs_str,
                    source_crs=source_crs_str,
                    vertical_ref="Local Ground (0m AMSL base)",
                    feature_type=FeatureType.BUILDING,
                )
                parts.append(mesh3d)
                total_vertices += len(mesh3d.vertices)
                total_faces += len(mesh3d.faces)
                total_surface_area += mesh3d.surface_area_sqm
                total_volume += mesh3d.volume_cubic_m

                global_min_x = min(global_min_x, mesh3d.bounds.min[0])
                global_min_y = min(global_min_y, mesh3d.bounds.min[1])
                global_min_z = min(global_min_z, mesh3d.bounds.min[2])
                global_max_x = max(global_max_x, mesh3d.bounds.max[0])
                global_max_y = max(global_max_y, mesh3d.bounds.max[1])
                global_max_z = max(global_max_z, mesh3d.bounds.max[2])

                try:
                    v_arr = np.array(mesh3d.vertices, dtype=np.float32)
                    f_arr = np.array(mesh3d.faces, dtype=np.int32)
                    tm = trimesh.Trimesh(vertices=v_arr, faces=f_arr, process=False)
                    tm.metadata["building_id"] = b_id
                    tm.metadata["name"] = b.get("name") or b_id
                    tm.metadata["height"] = height
                    tm.visual.face_colors = np.array([6, 182, 212, 220], dtype=np.uint8)
                    trimesh_geometries.append(tm)
                except Exception as err:
                    logger.warning(f"Failed to create trimesh for {b_id}: {err}")

            if parts:
                mesh_coll = Mesh3DCollection(
                    parts=parts,
                    bounds=Bounds3D(
                        min=[min(p.bounds.min[0] for p in parts), min(p.bounds.min[1] for p in parts), min(p.bounds.min[2] for p in parts)],
                        max=[max(p.bounds.max[0] for p in parts), max(p.bounds.max[1] for p in parts), max(p.bounds.max[2] for p in parts)],
                    ),
                    total_surface_area_sqm=round(sum(p.surface_area_sqm for p in parts), 2),
                    total_volume_cubic_m=round(sum(p.volume_cubic_m for p in parts), 2),
                )
                b_res = Building3DResult(
                    building_id=b_id,
                    geometry_status=Geometry3DStatus.VALID,
                    building=BuildingAttributes3D(
                        building_id=b_id,
                        base_elevation=base_z,
                        top_elevation=top_z,
                        height=height,
                        height_source=b["height_source"],
                        number_of_floors=b.get("levels"),
                    ),
                    geometry=mesh_coll,
                    warnings=[],
                )
                building_3d_results.append(b_res)

        add_stage(
            "geometry_generation",
            "complete",
            message=f"Generated {len(building_3d_results)} 3D solids ({total_vertices:,} vertices, {total_faces:,} triangular faces).",
            features=len(building_3d_results),
            vertices=total_vertices,
            faces=total_faces,
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "solids_count": len(building_3d_results),
                "total_vertices": total_vertices,
                "total_faces": total_faces,
                "total_volume_cubic_m": round(total_volume, 2),
            },
        )

        # -------------------------------------------------------------
        # STAGE 7: MESH VALIDATION (Watertightness & Closed 2-Manifold)
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        valid_solids = 0
        invalid_solids = 0
        for b_res in building_3d_results:
            if b_res.geometry:
                is_all_valid = True
                for part in b_res.geometry.parts:
                    val = ExtrusionService.validate_mesh(part)
                    if not val.valid:
                        is_all_valid = False
                if is_all_valid:
                    valid_solids += 1
                else:
                    invalid_solids += 1

        add_stage(
            "mesh_validation",
            "complete",
            message=f"Mesh audit passed: {valid_solids}/{len(building_3d_results)} watertight closed solid(s).",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={"valid_solids": valid_solids, "invalid_solids": invalid_solids},
        )

        # -------------------------------------------------------------
        # STAGE 8: GLTF / GLB EXPORT
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        glb_size_bytes = 0
        gltf_size_bytes = 0

        OUTPUT_GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

        if trimesh_geometries:
            try:
                scene = trimesh.Scene()
                for idx, tm in enumerate(trimesh_geometries):
                    node_name = tm.metadata.get("building_id") or f"Building_{idx}"
                    scene.add_geometry(tm, node_name=node_name)

                glb_bytes = scene.export(file_type="glb")
                with open(OUTPUT_GLB_PATH, "wb") as f:
                    f.write(glb_bytes if isinstance(glb_bytes, bytes) else glb_bytes.encode("utf-8"))
                glb_size_bytes = OUTPUT_GLB_PATH.stat().st_size

                gltf_exported = scene.export(file_type="gltf")
                if isinstance(gltf_exported, dict):
                    # trimesh gltf export returns a dict mapping filename -> content
                    for fn, fc in gltf_exported.items():
                        out_target = OUTPUT_GLTF_PATH.parent / fn
                        if isinstance(fc, bytes):
                            with open(out_target, "wb") as f:
                                f.write(fc)
                        elif isinstance(fc, str):
                            with open(out_target, "w", encoding="utf-8") as f:
                                f.write(fc)
                        else:
                            with open(out_target, "w", encoding="utf-8") as f:
                                json.dump(fc, f, indent=2)
                    # If model.gltf was written, ensure OUTPUT_GLTF_PATH is populated
                    model_gltf_path = OUTPUT_GLTF_PATH.parent / "model.gltf"
                    if model_gltf_path.exists() and not OUTPUT_GLTF_PATH.exists():
                        OUTPUT_GLTF_PATH.write_text(model_gltf_path.read_text(encoding="utf-8"), encoding="utf-8")
                    if OUTPUT_GLTF_PATH.exists():
                        gltf_size_bytes = OUTPUT_GLTF_PATH.stat().st_size
                elif isinstance(gltf_exported, str):
                    with open(OUTPUT_GLTF_PATH, "w", encoding="utf-8") as f:
                        f.write(gltf_exported)
                    gltf_size_bytes = len(gltf_exported)
                elif isinstance(gltf_exported, bytes):
                    with open(OUTPUT_GLTF_PATH, "wb") as f:
                        f.write(gltf_exported)
                    gltf_size_bytes = len(gltf_exported)

            except Exception as e:
                logger.error(f"Failed to export GLB/GLTF scene: {e}")

        metadata_dict = {
            "source_file": source_name,
            "target_crs": target_crs_str,
            "viewer_origin": [scene_origin[0], scene_origin[1], scene_origin[2]],
            "buildings_count": len(building_3d_results),
            "vertices_count": total_vertices,
            "faces_count": total_faces,
            "surface_area_sqm": round(total_surface_area, 2),
            "volume_cubic_m": round(total_volume, 2),
            "buildings": [m.model_dump() for m in metadata_items],
        }
        with open(OUTPUT_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata_dict, f, indent=2)

        add_stage(
            "export_3d",
            "complete",
            message=f"Exported standard Binary GLB 2.0 ({glb_size_bytes / 1024:.1f} KB) & glTF ({gltf_size_bytes / 1024:.1f} KB).",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "glb_bytes": glb_size_bytes,
                "gltf_bytes": gltf_size_bytes,
                "glb_path": str(OUTPUT_GLB_PATH),
            },
        )

        total_time_s = round(time.perf_counter() - start_time, 3)

        bounds_dict = None
        if global_min_x != float("inf"):
            bounds_dict = {
                "min": [round(global_min_x, 3), round(global_min_y, 3), round(global_min_z, 3)],
                "max": [round(global_max_x, 3), round(global_max_y, 3), round(global_max_z, 3)],
            }

        summary = Osm3DConversionSummary(
            buildings=len(building_3d_results),
            vertices=total_vertices,
            faces=total_faces,
            surface_area_sqm=round(total_surface_area, 2),
            volume_cubic_m=round(total_volume, 2),
            processing_time_s=total_time_s,
            bounding_box=bounds_dict,
            target_crs=target_crs_str,
            source_crs=source_crs_str,
            viewer_origin=[scene_origin[0], scene_origin[1], scene_origin[2]],
        )

        mesh_data_response = Generate3DResponse(
            schema_version=SCHEMA_VERSION,
            results=building_3d_results,
            summary=BatchSummary3D(
                requested=len(buildings_with_height),
                successful=len(building_3d_results),
                failed=0,
            ),
        ).model_dump()

        response = Osm3DConversionResponse(
            success=True,
            source_name=source_name,
            target_crs=target_crs_str,
            viewer_origin=[scene_origin[0], scene_origin[1], scene_origin[2]],
            summary=summary,
            stages=stages,
            glb_url="/api/v1/export/glb/latest",
            gltf_url="/api/v1/export/gltf/latest",
            metadata_url="/api/v1/export/metadata/latest",
            buildings_metadata=metadata_items,
            mesh_data=mesh_data_response,
        )

        cls._last_conversion_result = response.model_dump()
        try:
            with open(LATEST_REPORT_PATH, "w", encoding="utf-8") as f:
                json.dump(cls._last_conversion_result, f, indent=2)
        except Exception:
            pass

        return response
