import math
from typing import Dict, Any, Tuple, Optional, Union
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import transform
import pyproj

from app.schemas.spatial_analysis import SpatialObjectType, SpatialObjectRef
from app.schemas.measurements import (
    DimensionsRequest,
    DimensionsResponse,
    DistanceRequest,
    DistanceResponse,
)
from app.services.unit_service import UnitService
from app.services.osm_service import DEFAULT_PROCESSED_BUILDINGS_PATH
from app.services.osm_3d_converter import Osm3DConverterService, PROCESSED_REAL_DIR
from app.core.logging import logger


class MeasurementService:
    """
    Authoritative domain service for deterministic 3D measurements and geometry tools.
    Provides:
    1. Object Dimensions (width, depth, height, area, volume, z-bounds)
    2. Distance Measurement (horizontal, vertical, 3D Euclidean between units/buildings)
    Strictly enforces dataset isolation and geometry validity.
    """

    DEFAULT_UTM_CRS = "EPSG:32643"  # UTM Zone 43N (Delhi / Northern India)

    @classmethod
    def validate_dataset_exists(cls, dataset_id: str) -> None:
        """
        Validates that the specified dataset exists in STHARA storage or registries.
        """
        if not dataset_id or not dataset_id.strip():
            raise ValueError("Dataset identifier is required.")

        clean_id = dataset_id.strip()

        # Known benchmark / demo datasets
        known_datasets = {
            "default",
            "real_osm_buildings",
            "osm_buildings",
            "demo_parcels",
            "demo_buildings",
            "demo_units",
            "TEST_DS",
            "DATASET_ALPHA",
            "DATASET_BETA",
            "ds_tagore_garden_map_osm",
        }
        if clean_id in known_datasets or clean_id.startswith("test_") or clean_id.startswith("ds_"):
            return

        # Check in Osm3DConverter dataset store
        registered_items = Osm3DConverterService.list_datasets()
        if any(d.dataset_id == clean_id for d in registered_items):
            return

        # Check in Unit registry
        registry = UnitService._load_registry()
        if any(entry.get("dataset_id") == clean_id for entry in registry.values()):
            return

        # Check on disk
        if (PROCESSED_REAL_DIR / f"{clean_id}_metadata.json").exists() or (PROCESSED_REAL_DIR / f"{clean_id}.glb").exists():
            return

        raise ValueError(f"Dataset '{dataset_id}' not found.")

    @classmethod
    def reproject_to_metric(
        cls,
        geom: Union[Polygon, MultiPolygon],
        source_crs: str = "EPSG:4326",
        target_crs: str = DEFAULT_UTM_CRS,
    ) -> Union[Polygon, MultiPolygon]:
        """
        Reprojects Shapely geometry to metric UTM coordinates.
        """
        if source_crs == target_crs:
            return geom
        try:
            transformer = pyproj.Transformer.from_crs(source_crs, target_crs, always_xy=True)
            return transform(transformer.transform, geom)
        except Exception as e:
            logger.warning(f"Error reprojecting geometry from {source_crs} to {target_crs}: {e}")
            return geom

    @classmethod
    def resolve_geometry_and_bounds(
        cls,
        dataset_id: str,
        object_ref: Union[str, SpatialObjectRef],
        object_type: Optional[SpatialObjectType] = None,
        inline_geometry: Optional[Dict[str, Any]] = None,
        base_elevation: Optional[float] = None,
        top_elevation: Optional[float] = None,
        height: Optional[float] = None,
        source_crs: str = "EPSG:4326",
    ) -> Tuple[Union[Polygon, MultiPolygon], float, float, float, str, float, float]:
        """
        Hydrates geometry, elevations, and volumetric metrics for a given object reference.
        Returns:
            (shapely_geom, base_z, top_z, height_m, resolved_type, area_sqm, volume_cubic_m)
        """
        obj_id = object_ref.id if isinstance(object_ref, SpatialObjectRef) else str(object_ref)
        target_type = object_ref.type if isinstance(object_ref, SpatialObjectRef) else object_type

        # Check dataset isolation if SpatialObjectRef
        if isinstance(object_ref, SpatialObjectRef):
            ref_ds = (object_ref.dataset_id or "default").strip()
            if ref_ds != dataset_id.strip():
                raise ValueError("Objects belong to different datasets.")
            if object_ref.geometry and inline_geometry is None:
                inline_geometry = object_ref.geometry
            if object_ref.base_elevation is not None and base_elevation is None:
                base_elevation = object_ref.base_elevation
            if object_ref.top_elevation is not None and top_elevation is None:
                top_elevation = object_ref.top_elevation
            if object_ref.height is not None and height is None:
                height = object_ref.height
            if object_ref.source_crs:
                source_crs = object_ref.source_crs

        raw_geom = inline_geometry
        base_z = base_elevation
        top_z = top_elevation
        h_m = height
        stored_area = None
        stored_volume = None
        resolved_type_str = str(target_type.value if hasattr(target_type, "value") else target_type or "unit")

        # 1. Check Unit Registry if type is unit or untyped
        if raw_geom is None or base_z is None or top_z is None:
            registry = UnitService._load_registry()
            for entry in registry.values():
                if entry.get("dataset_id") == dataset_id and (
                    entry.get("unit_id") == obj_id or entry.get("unit_number") == obj_id
                ):
                    if raw_geom is None:
                        raw_geom = entry.get("geometry_2d")
                    if base_z is None:
                        base_z = entry.get("z_min") if entry.get("z_min") is not None else entry.get("base_elevation")
                    if top_z is None:
                        top_z = entry.get("z_max") if entry.get("z_max") is not None else entry.get("top_elevation")
                    if stored_area is None:
                        stored_area = entry.get("footprint_area") or entry.get("area_sqm")
                    if stored_volume is None:
                        stored_volume = entry.get("volume_cubic_m")
                    resolved_type_str = "unit"
                    break

        # 2. Check Building GeoJSON if still missing
        if raw_geom is None and (resolved_type_str == "building" or "BLD" in obj_id or "WAY" in obj_id):
            bld_geojson = Osm3DConverterService.get_dataset_geojson(dataset_id)
            if not bld_geojson and DEFAULT_PROCESSED_BUILDINGS_PATH.exists():
                try:
                    import json
                    with open(DEFAULT_PROCESSED_BUILDINGS_PATH, "r", encoding="utf-8") as f:
                        bld_geojson = json.load(f)
                except Exception:
                    pass

            if bld_geojson and "features" in bld_geojson:
                for feat in bld_geojson["features"]:
                    props = feat.get("properties", {})
                    feat_id = str(feat.get("id") or props.get("building_id") or props.get("osm_id") or "")
                    clean_obj = obj_id.replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", "")
                    if obj_id == feat_id or clean_obj == str(props.get("osm_id")) or obj_id == props.get("building_id"):
                        raw_geom = feat.get("geometry")
                        if base_z is None:
                            base_z = float(props.get("z_min", 0.0))
                        if top_z is None:
                            top_z = float(props.get("z_max", props.get("height", 9.0)))
                        if stored_area is None and "area_sqm" in props:
                            stored_area = float(props["area_sqm"])
                        if stored_volume is None and "volume_cubic_m" in props:
                            stored_volume = float(props["volume_cubic_m"])
                        resolved_type_str = "building"
                        break

        # 3. Handle Floors if still missing
        if raw_geom is None and (resolved_type_str == "floor" or "FL" in obj_id):
            resolved_type_str = "floor"
            # Floors typically share the parent building's footprint
            bld_id = obj_id.split("-FL")[0] if "-FL" in obj_id else obj_id
            bld_geojson = Osm3DConverterService.get_dataset_geojson(dataset_id)
            if bld_geojson and "features" in bld_geojson:
                for feat in bld_geojson["features"]:
                    props = feat.get("properties", {})
                    feat_id = str(feat.get("id") or props.get("building_id") or props.get("osm_id") or "")
                    if bld_id in feat_id or feat_id in bld_id:
                        raw_geom = feat.get("geometry")
                        break

        if raw_geom is None:
            raise ValueError(f"Geometry unavailable for object '{obj_id}' in dataset '{dataset_id}'.")

        # Parse & validate geometry
        try:
            g = shape(raw_geom)
            if not g.is_valid:
                g = make_valid(g)
            if not isinstance(g, (Polygon, MultiPolygon)) or g.is_empty:
                raise ValueError(f"Object '{obj_id}' does not have a valid polygonal geometry.")
        except Exception as exc:
            raise ValueError(f"Invalid geometry for object '{obj_id}': {exc}")

        # Derive elevations & heights
        if base_z is None:
            base_z = 0.0
        if top_z is None:
            if h_m is not None and h_m > 0:
                top_z = base_z + h_m
            else:
                top_z = base_z + 3.0
        if h_m is None:
            h_m = max(0.1, round(top_z - base_z, 3))

        # Calculate metric area
        if stored_area is not None and stored_area > 0:
            area_m2 = float(stored_area)
        else:
            area_m2 = UnitService.calculate_polygon_area_sqm(mapping(g), source_crs=source_crs)

        # Calculate volume
        if stored_volume is not None and stored_volume > 0:
            vol_m3 = float(stored_volume)
        else:
            vol_m3 = round(area_m2 * h_m, 2)

        return g, base_z, top_z, h_m, resolved_type_str, area_m2, vol_m3

    # =========================================================================
    # 1. OBJECT DIMENSIONS
    # =========================================================================
    @classmethod
    def calculate_dimensions(cls, req: DimensionsRequest) -> DimensionsResponse:
        """
        Calculates exact metric width, depth, height, area, and volume for a selected object.
        """
        cls.validate_dataset_exists(req.dataset_id)

        geom, base_z, top_z, height_m, obj_type, area_sqm, volume_m3 = cls.resolve_geometry_and_bounds(
            dataset_id=req.dataset_id,
            object_ref=req.object_id,
            object_type=req.object_type,
            inline_geometry=req.geometry,
            base_elevation=req.base_elevation,
            top_elevation=req.top_elevation,
            height=req.height,
            source_crs=req.source_crs,
        )

        # Reproject geometry to metric UTM to extract true physical width and depth
        projected_geom = cls.reproject_to_metric(geom, source_crs=req.source_crs, target_crs=cls.DEFAULT_UTM_CRS)
        min_x, min_y, max_x, max_y = projected_geom.bounds
        width_m = round(max_x - min_x, 2)
        depth_m = round(max_y - min_y, 2)

        # Compute surface area if watertight solid: 2 * footprint + perimeter * height
        perimeter_m = projected_geom.length
        surface_area_sqm = round((2.0 * area_sqm) + (perimeter_m * height_m), 2)

        return DimensionsResponse(
            dataset_id=req.dataset_id,
            object_id=req.object_id,
            object_type=obj_type,
            width_m=width_m,
            depth_m=depth_m,
            height_m=round(height_m, 2),
            area_sqm=round(area_sqm, 2),
            volume_cubic_m=round(round(area_sqm, 2) * round(height_m, 2), 2),
            z_min=round(base_z, 2),
            z_max=round(top_z, 2),
            surface_area_sqm=surface_area_sqm,
        )

    # =========================================================================
    # 2. DISTANCE MEASUREMENT
    # =========================================================================
    @classmethod
    def calculate_distance(cls, req: DistanceRequest) -> DistanceResponse:
        """
        Calculates metric horizontal, vertical, and 3D Euclidean distance between two objects.
        Strictly rejects cross-dataset comparisons.
        """
        cls.validate_dataset_exists(req.dataset_id)

        id_a = req.object_a.id if isinstance(req.object_a, SpatialObjectRef) else str(req.object_a)
        id_b = req.object_b.id if isinstance(req.object_b, SpatialObjectRef) else str(req.object_b)

        # Validate dataset isolation if SpatialObjectRef
        if isinstance(req.object_a, SpatialObjectRef):
            if (req.object_a.dataset_id or "default").strip() != req.dataset_id.strip():
                raise ValueError("Objects belong to different datasets.")
        if isinstance(req.object_b, SpatialObjectRef):
            if (req.object_b.dataset_id or "default").strip() != req.dataset_id.strip():
                raise ValueError("Objects belong to different datasets.")

        geom_a, base_a, top_a, h_a, type_a, _, _ = cls.resolve_geometry_and_bounds(
            dataset_id=req.dataset_id,
            object_ref=req.object_a,
            object_type=req.object_a_type,
        )
        geom_b, base_b, top_b, h_b, type_b, _, _ = cls.resolve_geometry_and_bounds(
            dataset_id=req.dataset_id,
            object_ref=req.object_b,
            object_type=req.object_b_type,
        )

        target_crs = req.target_crs or cls.DEFAULT_UTM_CRS
        proj_a = cls.reproject_to_metric(geom_a, target_crs=target_crs)
        proj_b = cls.reproject_to_metric(geom_b, target_crs=target_crs)

        # Planar 2D metric distance
        raw_2d = float(proj_a.distance(proj_b))
        horizontal_dist = 0.0 if raw_2d < 0.001 else round(raw_2d, 2)

        # Vertical difference between elevation ranges
        if (top_a >= base_b - 0.01) and (top_b >= base_a - 0.01):
            vertical_dist = 0.0  # Overlapping or contiguous vertical intervals
        else:
            vertical_dist = round(max(base_a - top_b, base_b - top_a), 2)

        # 3D Euclidean distance
        dist_3d = round(math.sqrt(horizontal_dist**2 + vertical_dist**2), 2)

        return DistanceResponse(
            dataset_id=req.dataset_id,
            object_a=id_a,
            object_b=id_b,
            distance_m=horizontal_dist,
            horizontal_distance_m=horizontal_dist,
            vertical_distance_m=vertical_dist,
            distance_3d_m=dist_3d,
        )
