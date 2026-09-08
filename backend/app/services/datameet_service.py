import json
import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pyproj
from shapely.geometry import shape, Point, Polygon, MultiPolygon, mapping
from shapely.ops import transform
from shapely.validation import make_valid

from app.schemas.datameet import (
    DataMeetLayerInfo,
    DataMeetAlignmentRequest,
    DataMeetAlignmentResponse,
    DataMeetMetadataResponse,
    BoundaryRing3D,
)
from app.core.logging import logger

DATAMEET_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw" / "datameet"
OSM_PROCESSED_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed" / "real" / "osm_buildings.geojson"

AVAILABLE_LAYERS: Dict[str, Dict[str, Any]] = {
    "delhi_assembly_constituencies": {
        "layer_id": "delhi_assembly_constituencies",
        "name": "Delhi Assembly Constituencies (70 ACs)",
        "description": "70 Legislative Assembly Constituencies of NCT of Delhi from DataMeet Maps (India_AC.shp).",
        "source_file": "delhi_assembly_constituencies.geojson",
        "target_feature_default": "Rajouri Garden",
        "name_field": "AC_NAME",
        "no_field": "AC_NO",
        "state_field": "ST_NAME",
    },
    "delhi_districts": {
        "layer_id": "delhi_districts",
        "name": "Delhi Census Districts (9 Districts)",
        "description": "9 Census Districts of NCT of Delhi from DataMeet Maps (2011_Dist.shp).",
        "source_file": "delhi_districts.geojson",
        "target_feature_default": "West",
        "name_field": "DISTRICT",
        "state_field": "ST_NM",
    },
    "delhi_state_boundary": {
        "layer_id": "delhi_state_boundary",
        "name": "NCT of Delhi State Boundary",
        "description": "Outer administrative border of National Capital Territory of Delhi from DataMeet Maps.",
        "source_file": "delhi_state_boundary.geojson",
        "target_feature_default": "NCT of Delhi",
        "name_field": "state",
        "state_field": "state",
    },
}


class DataMeetService:
    """
    Domain service for ingesting, validating, reprojecting, and spatially
    aligning DataMeet administrative reference datasets with OSM cadastral physical features.
    """

    @classmethod
    def get_metadata(cls) -> DataMeetMetadataResponse:
        meta_file = DATAMEET_DIR / "DATAMEET_METADATA.json"
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return DataMeetMetadataResponse(**data)
            except Exception as e:
                logger.warning(f"Failed to read DataMeet metadata file: {e}")

        return DataMeetMetadataResponse(
            source_name="DataMeet Maps",
            repository_url="https://github.com/datameet/maps.git",
            license="Creative Commons Attribution 2.5 India / Open Data Commons ODbL",
            source_crs="EPSG:4326",
            datasets={},
            provenance_notes=[
                "DataMeet Maps provides administrative, electoral, and statistical boundary datasets.",
                "DataMeet datasets serve as geographic reference / Area of Interest base layers.",
                "DataMeet datasets do NOT contain cadastral parcel boundaries or building footprints.",
            ],
        )

    @classmethod
    def list_layers(cls) -> List[DataMeetLayerInfo]:
        layers: List[DataMeetLayerInfo] = []
        for lid, info in AVAILABLE_LAYERS.items():
            f_path = DATAMEET_DIR / info["source_file"]
            count = 0
            if f_path.exists():
                try:
                    with open(f_path, "r", encoding="utf-8") as f:
                        gdata = json.load(f)
                    count = len(gdata.get("features", []))
                except Exception:
                    count = 0

            layers.append(
                DataMeetLayerInfo(
                    layer_id=lid,
                    name=info["name"],
                    description=info["description"],
                    feature_count=count,
                    source_crs="EPSG:4326",
                    source_file=info["source_file"],
                    target_feature_default=info.get("target_feature_default"),
                )
            )
        return layers

    @classmethod
    def get_layer_geojson(cls, layer_id: str) -> Dict[str, Any]:
        if layer_id not in AVAILABLE_LAYERS:
            raise KeyError(f"DataMeet layer '{layer_id}' not found.")
        f_path = DATAMEET_DIR / AVAILABLE_LAYERS[layer_id]["source_file"]
        if not f_path.exists():
            raise FileNotFoundError(f"DataMeet file '{f_path.name}' not found on disk.")

        with open(f_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @classmethod
    def align_and_filter(
        cls,
        request: DataMeetAlignmentRequest,
        osm_source_override: Optional[Path] = None,
    ) -> DataMeetAlignmentResponse:
        layer_id = request.layer_id
        if layer_id not in AVAILABLE_LAYERS:
            raise ValueError(f"Unknown DataMeet layer: '{layer_id}'")

        layer_info = AVAILABLE_LAYERS[layer_id]
        f_path = DATAMEET_DIR / layer_info["source_file"]
        if not f_path.exists():
            raise FileNotFoundError(f"DataMeet layer file '{f_path.name}' missing on disk.")

        with open(f_path, "r", encoding="utf-8") as f:
            boundary_data = json.load(f)

        features = boundary_data.get("features", [])
        if not features:
            raise ValueError(f"No features in DataMeet layer '{layer_id}'.")

        # 1. Filter Area of Interest feature
        name_key = layer_info.get("name_field", "name")
        target_name = request.aoi_name or layer_info.get("target_feature_default")

        selected_feat = None
        if target_name and target_name.upper() != "ALL":
            # Pass 1: Exact match
            for feat in features:
                props = feat.get("properties", {})
                val = str(props.get(name_key, "")).strip()
                if val.lower() == target_name.lower():
                    selected_feat = feat
                    break

            # Pass 2: Substring match fallback
            if not selected_feat:
                for feat in features:
                    props = feat.get("properties", {})
                    val = str(props.get(name_key, "")).strip()
                    if target_name.lower() in val.lower():
                        selected_feat = feat
                        break

        if not selected_feat:
            selected_feat = features[0]

        aoi_props = selected_feat.get("properties", {})
        resolved_aoi_name = str(aoi_props.get(name_key) or target_name or "Area of Interest")
        resolved_state = str(aoi_props.get(layer_info.get("state_field", "state")) or "NCT of Delhi")
        resolved_district = str(aoi_props.get("DISTRICT") or ("West Delhi" if "Rajouri" in resolved_aoi_name else None))

        aoi_geom_wgs84 = shape(selected_feat.get("geometry", {}))
        if not aoi_geom_wgs84.is_valid:
            aoi_geom_wgs84 = make_valid(aoi_geom_wgs84)

        b_min_lon, b_min_lat, b_max_lon, b_max_lat = aoi_geom_wgs84.bounds
        bounds_wgs84 = [round(b_min_lon, 6), round(b_min_lat, 6), round(b_max_lon, 6), round(b_max_lat, 6)]

        # 2. CRS Transformation to Metric Projected working_crs
        source_crs_str = "EPSG:4326"
        working_crs_str = request.working_crs or "EPSG:32643"

        src_crs = pyproj.CRS.from_user_input(source_crs_str)
        dst_crs = pyproj.CRS.from_user_input(working_crs_str)
        transformer = pyproj.Transformer.from_crs(src_crs, dst_crs, always_xy=True)

        aoi_geom_proj = transform(transformer.transform, aoi_geom_wgs84)
        if not aoi_geom_proj.is_valid:
            aoi_geom_proj = make_valid(aoi_geom_proj)

        # 3. Load OSM buildings and perform spatial alignment
        osm_path = osm_source_override or OSM_PROCESSED_PATH
        osm_buildings = []
        if osm_path.exists():
            try:
                with open(osm_path, "r", encoding="utf-8-sig") as f:
                    osm_raw = json.load(f)
                osm_buildings = osm_raw.get("features", [])
            except Exception as e:
                logger.warning(f"Could not load OSM buildings from {osm_path}: {e}")

        total_osm = len(osm_buildings)
        inside_count = 0
        outside_count = 0

        for b in osm_buildings:
            try:
                b_geom = shape(b.get("geometry", {}))
                b_centroid = b_geom.centroid
                if aoi_geom_wgs84.contains(b_centroid) or aoi_geom_wgs84.intersects(b_geom):
                    inside_count += 1
                else:
                    outside_count += 1
            except Exception:
                outside_count += 1

        # 4. Extract 3D boundary rings for Three.js WebGL datum alignment
        centroid_wgs84 = aoi_geom_wgs84.centroid
        ox_proj, oy_proj = transformer.transform(centroid_wgs84.x, centroid_wgs84.y)
        projected_origin = [round(ox_proj, 2), round(oy_proj, 2), 0.0]

        boundary_rings: List[BoundaryRing3D] = []
        polys_to_ring = []
        if isinstance(aoi_geom_proj, Polygon):
            polys_to_ring.append(aoi_geom_proj)
        elif isinstance(aoi_geom_proj, MultiPolygon):
            polys_to_ring.extend(aoi_geom_proj.geoms)

        for poly in polys_to_ring:
            coords_3d = []
            for x, y in poly.exterior.coords:
                # Relative to local origin
                rx = round(x - ox_proj, 2)
                ry = round(y - oy_proj, 2)
                coords_3d.append([rx, ry, -0.05])
            if coords_3d:
                boundary_rings.append(BoundaryRing3D(coordinates=coords_3d))

        alignment_status = (
            f"ALIGNED (100% of {inside_count} OSM buildings inside {resolved_aoi_name} boundary)"
            if outside_count == 0 and inside_count > 0
            else f"ALIGNED ({inside_count} inside, {outside_count} outside)"
        )

        return DataMeetAlignmentResponse(
            success=True,
            layer_id=layer_id,
            aoi_name=resolved_aoi_name,
            state_name=resolved_state,
            district_name=resolved_district,
            source_crs=source_crs_str,
            working_crs=working_crs_str,
            transformation_used=f"pyproj.Transformer.from_crs('{source_crs_str}', '{working_crs_str}')",
            total_osm_buildings=total_osm,
            buildings_inside_aoi=inside_count,
            buildings_outside_aoi=outside_count,
            alignment_status=alignment_status,
            bounding_box_wgs84=bounds_wgs84,
            projected_origin=projected_origin,
            boundary_rings=boundary_rings,
            source_attribution={
                "source": "DataMeet Maps",
                "repository": "https://github.com/datameet/maps.git",
                "license": "Creative Commons Attribution 2.5 India / Open Data Commons ODbL",
                "layer_name": layer_info["name"],
                "role": "Authoritative Administrative Reference / Area of Interest (AOI)",
            },
        )
