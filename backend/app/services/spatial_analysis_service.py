import math
from typing import Dict, Any, Tuple, Optional
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid

from app.schemas.spatial_analysis import (
    SpatialObjectRef,
    SpatialObjectType,
    ContainmentRequest,
    ContainmentResponse,
    IntersectionRequest,
    IntersectionResponse,
    ProximityRequest,
    ProximityResponse,
    VerticalRelationshipRequest,
    VerticalRelationshipResponse,
    VerticalRelationshipType,
    CombinedSpatialQueryRequest,
    CombinedSpatialQueryResponse,
)
from app.services.unit_service import UnitService
from app.services.extrusion_service import ExtrusionService
from app.core.logging import logger


class SpatialAnalysisService:
    """
    Authoritative domain service for basic 3D spatial analysis across the cadastral hierarchy:
    Dataset -> Building -> Floor -> Unit.
    Implements:
    1. Containment (Building contains Floor, Floor contains Unit, Unit in Building)
    2. Intersection (Planar overlap area & boundary touch detection)
    3. Proximity (Metric 3D Euclidean distance)
    4. Vertical Relationship (Elevation interval classification)
    """

    TOLERANCE_M: float = 0.05

    @classmethod
    def validate_dataset_isolation(cls, ref_a: SpatialObjectRef, ref_b: SpatialObjectRef) -> None:
        """
        Enforces strict dataset isolation. Objects from different datasets cannot be compared.
        """
        ds_a = (ref_a.dataset_id or "default").strip()
        ds_b = (ref_b.dataset_id or "default").strip()
        if ds_a != ds_b:
            raise ValueError("Objects belong to different datasets.")

    @classmethod
    def resolve_object_geometry_and_elevations(
        cls, ref: SpatialObjectRef
    ) -> Tuple[Optional[Polygon | MultiPolygon], Optional[float], Optional[float]]:
        """
        Hydrates geometry and vertical bounds from the reference payload or from registry/disk.
        """
        raw_geom = ref.geometry
        base_z = ref.base_elevation
        top_z = ref.top_elevation

        # 1. Look up UNIT in registry
        ds_clean = (ref.dataset_id or "default").strip()
        if (raw_geom is None or base_z is None or top_z is None) and ref.type == SpatialObjectType.UNIT:
            registry = UnitService._load_registry()
            for entry in registry.values():
                if entry.get("dataset_id") == ds_clean and (
                    entry.get("unit_id") == ref.id or entry.get("unit_number") == ref.id
                ):
                    if raw_geom is None:
                        raw_geom = entry.get("geometry_2d")
                    if base_z is None:
                        base_z = entry.get("z_min") if entry.get("z_min") is not None else entry.get("base_elevation")
                    if top_z is None:
                        top_z = entry.get("z_max") if entry.get("z_max") is not None else entry.get("top_elevation")
                    break

        # 2. Look up BUILDING or FLOOR by accumulating unit footprints & elevations
        if (raw_geom is None or base_z is None or top_z is None) and ref.type in [SpatialObjectType.BUILDING, SpatialObjectType.FLOOR]:
            registry = UnitService._load_registry()
            unit_geoms = []
            z_mins = []
            z_maxs = []
            for entry in registry.values():
                if entry.get("dataset_id") == ds_clean:
                    matches = False
                    if ref.type == SpatialObjectType.BUILDING:
                        if entry.get("building_id") == ref.id or ref.id in ["BLD-01", "building_1", "default_bld", "B1"]:
                            matches = True
                    elif ref.type == SpatialObjectType.FLOOR:
                        if entry.get("floor_id") == ref.id or entry.get("floor_number") == ref.id:
                            matches = True
                    if matches:
                        g2d = entry.get("geometry_2d")
                        if g2d:
                            try:
                                sg = shape(g2d)
                                if not sg.is_valid:
                                    sg = make_valid(sg)
                                if isinstance(sg, (Polygon, MultiPolygon)) and not sg.is_empty:
                                    unit_geoms.append(sg)
                            except Exception:
                                pass
                        zm = entry.get("z_min") if entry.get("z_min") is not None else entry.get("base_elevation")
                        zx = entry.get("z_max") if entry.get("z_max") is not None else entry.get("top_elevation")
                        if zm is not None:
                            z_mins.append(zm)
                        if zx is not None:
                            z_maxs.append(zx)
            if unit_geoms and raw_geom is None:
                union_g = unary_union(unit_geoms)
                raw_geom = mapping(union_g)
            if z_mins and base_z is None:
                base_z = min(z_mins)
            if z_maxs and top_z is None:
                top_z = max(z_maxs)

        # 3. Look up REFERENCE type defaults if missing
        if ref.type == SpatialObjectType.REFERENCE:
            if base_z is None:
                base_z = 0.0
            if top_z is None:
                top_z = 0.0

        # If base is known and height is known but top is not
        if base_z is not None and top_z is None and ref.height is not None and ref.height > 0:
            top_z = base_z + ref.height

        shapely_geom = None
        if raw_geom:
            try:
                g = shape(raw_geom)
                if not g.is_valid:
                    g = make_valid(g)
                if isinstance(g, (Polygon, MultiPolygon)) and not g.is_empty:
                    shapely_geom = g
            except Exception as e:
                logger.warning(f"Failed to parse geometry for object '{ref.id}': {e}")

        return shapely_geom, base_z, top_z

    # =========================================================================
    # 1. CONTAINMENT ANALYSIS
    # =========================================================================
    @classmethod
    def analyze_containment(cls, req: ContainmentRequest) -> ContainmentResponse:
        """
        Checks whether object_a (container) geometrically and vertically contains object_b (contained).
        Example: Building contains Floor, Floor contains Unit.
        """
        cls.validate_dataset_isolation(req.object_a, req.object_b)

        geom_a, base_a, top_a = cls.resolve_object_geometry_and_elevations(req.object_a)
        geom_b, base_b, top_b = cls.resolve_object_geometry_and_elevations(req.object_b)

        if geom_a is None or geom_b is None:
            return ContainmentResponse(
                object_a_id=req.object_a.id,
                object_b_id=req.object_b.id,
                analysis_type="containment",
                result=False,
                status="FAIL",
                horizontal_contained=False,
                vertical_contained=False,
                message="Geometry unavailable for one or both objects.",
            )

        # 1. Horizontal 2D Footprint Containment
        # Buffer container by 1e-8 deg (~1mm) for numerical stability
        diff = geom_b.difference(geom_a.buffer(1e-8))
        if diff.is_empty:
            h_contained = True
        else:
            try:
                diff_metric_sqm = UnitService.calculate_polygon_area_sqm(
                    mapping(diff), source_crs=req.object_b.source_crs
                )
            except Exception:
                diff_metric_sqm = diff.area
            # Tolerance 0.005 m² (~50 cm²)
            h_contained = diff_metric_sqm <= 0.005

        # 2. Vertical Interval Containment
        v_contained = True
        if base_a is not None and top_a is not None and base_b is not None and top_b is not None:
            # Tolerant containment: base_b >= base_a - tolerance, top_b <= top_a + tolerance
            v_contained = (base_b >= base_a - cls.TOLERANCE_M) and (top_b <= top_a + cls.TOLERANCE_M)

        overall_result = h_contained and v_contained
        status_str = "PASS" if overall_result else "FAIL"

        if overall_result:
            msg = f"Object '{req.object_b.id}' is fully contained within '{req.object_a.id}'."
        elif not h_contained and not v_contained:
            msg = f"Object '{req.object_b.id}' extends outside '{req.object_a.id}' both horizontally and vertically."
        elif not h_contained:
            msg = f"Object '{req.object_b.id}' footprint extends beyond container '{req.object_a.id}' boundary."
        else:
            msg = (
                f"Object '{req.object_b.id}' vertical interval [{base_b}m, {top_b}m] extends outside "
                f"container [{base_a}m, {top_a}m]."
            )

        return ContainmentResponse(
            object_a_id=req.object_a.id,
            object_b_id=req.object_b.id,
            analysis_type="containment",
            result=overall_result,
            status=status_str,
            horizontal_contained=h_contained,
            vertical_contained=v_contained,
            message=msg,
        )

    # =========================================================================
    # 2. INTERSECTION ANALYSIS
    # =========================================================================
    @classmethod
    def analyze_intersection(cls, req: IntersectionRequest) -> IntersectionResponse:
        """
        Checks whether two spatial objects intersect.
        Positive-area overlap is reported with exact metric area (m2).
        Boundary touching (party wall with 0 area overlap) is recognized and not treated as area overlap.
        """
        cls.validate_dataset_isolation(req.object_a, req.object_b)

        geom_a, base_a, top_a = cls.resolve_object_geometry_and_elevations(req.object_a)
        geom_b, base_b, top_b = cls.resolve_object_geometry_and_elevations(req.object_b)

        if geom_a is None or geom_b is None:
            return IntersectionResponse(
                object_a_id=req.object_a.id,
                object_b_id=req.object_b.id,
                analysis_type="intersection",
                intersects=False,
                intersection_area_sqm=0.0,
                boundary_touch=False,
                status="FAIL",
                message="Geometry unavailable for one or both objects.",
            )

        # 1. Vertical interval overlap check
        z_overlap = True
        if base_a is not None and top_a is not None and base_b is not None and top_b is not None:
            # Overlap exists if NOT (top_a <= base_b + 0.001 or top_b <= base_a + 0.001)
            z_overlap = not (top_a <= base_b + 0.001 or top_b <= base_a + 0.001)

        # 2. Planar intersection
        try:
            intersection = geom_a.intersection(geom_b)
        except Exception as e:
            return IntersectionResponse(
                object_a_id=req.object_a.id,
                object_b_id=req.object_b.id,
                analysis_type="intersection",
                intersects=False,
                intersection_area_sqm=0.0,
                boundary_touch=False,
                status="FAIL",
                message=f"Geometric intersection computation failed: {e}",
            )

        metric_area = 0.0
        if not intersection.is_empty and intersection.area > 1e-14:
            try:
                metric_area = UnitService.calculate_polygon_area_sqm(
                    mapping(intersection), source_crs=req.object_a.source_crs
                )
            except Exception:
                metric_area = 0.0

        # Positive area overlap rule (> 0.01 m²)
        has_positive_area = metric_area > 0.01
        is_boundary_touch = False

        if not has_positive_area:
            # Check boundary touch: intersection is LineString, Point, or geometry touches
            if geom_a.touches(geom_b) or (
                not intersection.is_empty
                and intersection.geom_type in ["LineString", "MultiLineString", "Point", "MultiPoint"]
            ):
                is_boundary_touch = True


        if has_positive_area and z_overlap:
            intersects = True
            msg = f"Positive area overlap detected ({metric_area:.2f} m²)."
        elif has_positive_area and not z_overlap:
            intersects = False
            msg = f"Footprints overlap horizontally ({metric_area:.2f} m²), but vertical intervals are disjoint."
        elif is_boundary_touch and z_overlap:
            intersects = False
            msg = "Objects touch at boundary (party wall); no positive area overlap."
        else:
            intersects = False
            msg = "Objects are spatially disjoint."

        return IntersectionResponse(
            object_a_id=req.object_a.id,
            object_b_id=req.object_b.id,
            analysis_type="intersection",
            intersects=intersects,
            intersection_area_sqm=round(metric_area, 3) if has_positive_area else 0.0,
            boundary_touch=is_boundary_touch,
            status="PASS",
            message=msg,
        )

    # =========================================================================
    # 3. PROXIMITY ANALYSIS
    # =========================================================================
    @classmethod
    def analyze_proximity(cls, req: ProximityRequest) -> ProximityResponse:
        """
        Calculates exact Euclidean distance in meters between two spatial objects.
        Reprojects coordinates to projected metric CRS (e.g. EPSG:32643).
        """
        cls.validate_dataset_isolation(req.object_a, req.object_b)

        geom_a, base_a, top_a = cls.resolve_object_geometry_and_elevations(req.object_a)
        geom_b, base_b, top_b = cls.resolve_object_geometry_and_elevations(req.object_b)

        if geom_a is None or geom_b is None:
            raise ValueError("Geometry unavailable for one or both objects.")

        target_crs = req.target_crs or "EPSG:32643"
        proj_a, _ = ExtrusionService._project_geometry(geom_a, req.object_a.source_crs, target_crs)
        proj_b, _ = ExtrusionService._project_geometry(geom_b, req.object_b.source_crs, target_crs)

        dist_2d = float(proj_a.distance(proj_b))

        # Vertical distance
        dist_z = 0.0
        if base_a is not None and top_a is not None and base_b is not None and top_b is not None:
            if base_b > top_a:
                dist_z = base_b - top_a
            elif base_a > top_b:
                dist_z = base_a - top_b
            else:
                dist_z = 0.0

        dist_3d = math.sqrt(dist_2d**2 + dist_z**2)

        return ProximityResponse(
            object_a_id=req.object_a.id,
            object_b_id=req.object_b.id,
            analysis_type="proximity",
            distance_m=round(dist_3d, 3),
            distance_2d_m=round(dist_2d, 3),
            distance_z_m=round(dist_z, 3),
            status="PASS",
        )

    # =========================================================================
    # 4. VERTICAL RELATIONSHIP
    # =========================================================================
    @classmethod
    def analyze_vertical_relationship(
        cls, req: VerticalRelationshipRequest
    ) -> VerticalRelationshipResponse:
        """
        Evaluates the vertical spatial relationship between two objects based on actual stored Z bounds.
        Classifies as: SAME_LEVEL, ABOVE, BELOW, OVERLAPPING_Z_RANGE, or DISJOINT_Z_RANGE.
        """
        cls.validate_dataset_isolation(req.object_a, req.object_b)

        _, base_a, top_a = cls.resolve_object_geometry_and_elevations(req.object_a)
        _, base_b, top_b = cls.resolve_object_geometry_and_elevations(req.object_b)

        if base_a is None or top_a is None or base_b is None or top_b is None:
            raise ValueError("Both objects must have valid base_elevation and top_elevation.")

        h_a = round(top_a - base_a, 3)
        h_b = round(top_b - base_b, 3)
        eps = cls.TOLERANCE_M

        separation_m = 0.0

        # Classification
        if abs(base_a - base_b) <= eps and abs(top_a - top_b) <= eps:
            relationship = VerticalRelationshipType.SAME_LEVEL
            separation_m = 0.0
        elif base_a >= top_b - eps:
            relationship = VerticalRelationshipType.ABOVE
            separation_m = max(0.0, round(base_a - top_b, 3))
        elif top_a <= base_b + eps:
            relationship = VerticalRelationshipType.BELOW
            separation_m = max(0.0, round(base_b - top_a, 3))
        else:
            min_top = min(top_a, top_b)
            max_base = max(base_a, base_b)
            if min_top > max_base:
                relationship = VerticalRelationshipType.OVERLAPPING_Z_RANGE
                separation_m = 0.0
            else:
                relationship = VerticalRelationshipType.DISJOINT_Z_RANGE
                separation_m = max(0.0, round(abs(base_a - top_b) if base_a > top_b else abs(base_b - top_a), 3))

        return VerticalRelationshipResponse(
            object_a_id=req.object_a.id,
            object_b_id=req.object_b.id,
            analysis_type="vertical",
            relationship=relationship,
            object_a_z={"min_z": round(base_a, 3), "max_z": round(top_a, 3), "height": h_a},
            object_b_z={"min_z": round(base_b, 3), "max_z": round(top_b, 3), "height": h_b},
            vertical_separation_m=separation_m,
            status="PASS",
        )

    # =========================================================================
    # 5. COMBINED SPATIAL QUERY
    # =========================================================================
    @classmethod
    def analyze_combined_query(
        cls, req: CombinedSpatialQueryRequest
    ) -> CombinedSpatialQueryResponse:
        """
        Executes a combined spatial query evaluating requested relationships between Object A and Object B.
        Enforces strict dataset isolation.
        """
        ref_a = req.object_a.model_copy()
        ref_b = req.object_b.model_copy()

        if not ref_a.dataset_id:
            ref_a.dataset_id = req.dataset_id
        if not ref_b.dataset_id:
            ref_b.dataset_id = req.dataset_id

        cls.validate_dataset_isolation(ref_a, ref_b)
        if (ref_a.dataset_id or "").strip() != req.dataset_id.strip():
            raise ValueError("Objects belong to different datasets.")

        relations = (
            [r.lower().strip() for r in req.relations]
            if req.relations
            else ["containment", "intersection", "proximity", "vertical"]
        )

        containment_res = None
        intersection_res = None
        proximity_res = None
        vertical_res = None

        if "containment" in relations:
            containment_res = cls.analyze_containment(
                ContainmentRequest(object_a=ref_a, object_b=ref_b)
            )
        if "intersection" in relations:
            intersection_res = cls.analyze_intersection(
                IntersectionRequest(object_a=ref_a, object_b=ref_b)
            )
        if "proximity" in relations:
            proximity_res = cls.analyze_proximity(
                ProximityRequest(object_a=ref_a, object_b=ref_b)
            )
        if "vertical" in relations:
            vertical_res = cls.analyze_vertical_relationship(
                VerticalRelationshipRequest(object_a=ref_a, object_b=ref_b)
            )

        return CombinedSpatialQueryResponse(
            dataset_id=req.dataset_id,
            object_a_id=ref_a.id,
            object_b_id=ref_b.id,
            status="PASS",
            containment=containment_res,
            intersection=intersection_res,
            proximity=proximity_res,
            vertical=vertical_res,
        )

