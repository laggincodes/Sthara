import math
from typing import Dict, Any, List, Tuple, Optional
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.validation import make_valid

from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    GeometryType,
    Bounds3D,
    Mesh3D,
    Mesh3DCollection,
    BatchSummary3D,
)
from app.schemas.property_volume import (
    VolumeType,
    FloorIntervalSpec,
    BuildingFloors3DRequest,
    BatchBuildingFloors3DRequest,
    Floor3DResult,
    BuildingFloors3DResult,
    GenerateFloors3DResponse,
    PropertyVolumeRequest,
    BatchPropertyVolumeRequest,
    PropertyVolumeResult,
    GeneratePropertyVolumeResponse,
)
from app.services.extrusion_service import ExtrusionService


class FloorVolumeService:
    """
    Authoritative domain service for 3D Floor and Property Volume extrusion,
    conforming strictly to the 3D Geometry Contract (v1.0).
    Enforces the cadastral hierarchy:
        PARCEL -> BUILDING -> FLOOR -> PROPERTY_VOLUME
    """

    MIN_FLOOR_HEIGHT_M: float = 0.1
    MAX_FLOOR_HEIGHT_M: float = 20.0
    TOLERANCE_M: float = 0.05

    @classmethod
    def resolve_floor_intervals(
        cls, req: BuildingFloors3DRequest
    ) -> Tuple[List[FloorIntervalSpec], Optional[float], Optional[float], Optional[float], str, List[str]]:
        """
        Applies strict floor source priority order:
        1. Explicit floor base/top elevations (req.floors with base_elevation and top_elevation)
        2. Explicit floor heights (req.floors with floor_height, or req.floor_height)
        3. Known floor count + building height (or roof - ground)
        4. Unavailable
        """
        warnings: List[str] = []
        base_z = req.ground_elevation

        if base_z is None or not math.isfinite(base_z):
            return [], None, None, None, "UNAVAILABLE", ["Missing or non-finite ground elevation."]

        # --- Priority 1: Explicit Floor Intervals ---
        if req.floors and len(req.floors) > 0:
            has_explicit_elevations = all(
                f.base_elevation is not None and f.top_elevation is not None
                and math.isfinite(f.base_elevation) and math.isfinite(f.top_elevation)
                and f.top_elevation > f.base_elevation
                for f in req.floors
            )
            has_explicit_heights = all(
                fl.floor_height is not None and math.isfinite(fl.floor_height) and fl.floor_height > 0
                for fl in req.floors
            )

            if has_explicit_elevations:
                # Sort by floor_index, or by base_elevation if equal
                sorted_floors = sorted(req.floors, key=lambda f: (f.floor_index, f.base_elevation if f.base_elevation is not None else 0))
                
                # Validate intervals
                for idx, fl in enumerate(sorted_floors):
                    if fl.top_elevation is None or fl.base_elevation is None or fl.top_elevation <= fl.base_elevation:
                        warnings.append(
                            f"Floor '{fl.floor_id}' top elevation ({fl.top_elevation}m) must be strictly greater than base ({fl.base_elevation}m)."
                        )
                        return [], None, None, None, "INVALID", warnings
                    
                    fl_height = round(fl.top_elevation - fl.base_elevation, 3)
                    if fl_height < cls.MIN_FLOOR_HEIGHT_M:
                        warnings.append(
                            f"Floor '{fl.floor_id}' height ({fl_height}m) is below minimum sanity threshold ({cls.MIN_FLOOR_HEIGHT_M}m)."
                        )
                        return [], None, None, None, "INVALID", warnings
                    
                    # Overlap check with previous floor
                    if idx > 0:
                        prev = sorted_floors[idx - 1]
                        if prev.top_elevation is not None and fl.base_elevation < prev.top_elevation - 0.01:
                            warnings.append(
                                f"Floor interval overlap detected between floor '{prev.floor_id}' (top {prev.top_elevation}m) and '{fl.floor_id}' (base {fl.base_elevation}m)."
                            )
                            return [], None, None, None, "INVALID", warnings

                overall_base = sorted_floors[0].base_elevation
                overall_top = sorted_floors[-1].top_elevation
                total_h = round(overall_top - overall_base, 3) if (overall_top is not None and overall_base is not None) else None

                # Check against building vertical span if roof provided
                if req.roof_elevation is not None and overall_top is not None and overall_top > req.roof_elevation + cls.TOLERANCE_M:
                    warnings.append(
                        f"Floors exceed building roof elevation ({overall_top}m > {req.roof_elevation}m)."
                    )
                    return [], None, None, None, "INVALID", warnings

                return sorted_floors, overall_base, overall_top, total_h, "EXPLICIT_ELEVATIONS", warnings

            elif has_explicit_heights:
                computed_floors: List[FloorIntervalSpec] = []
                curr_base = base_z
                for fl in req.floors:
                    h = fl.floor_height or 3.0
                    curr_top = round(curr_base + h, 3)
                    computed_floors.append(
                        FloorIntervalSpec(
                            floor_id=fl.floor_id,
                            floor_index=fl.floor_index,
                            floor_name=fl.floor_name,
                            base_elevation=round(curr_base, 3),
                            top_elevation=curr_top,
                            floor_height=round(h, 3),
                        )
                    )
                    curr_base = curr_top
                overall_top = curr_base
                total_h = round(overall_top - base_z, 3)
                return computed_floors, base_z, overall_top, total_h, "EXPLICIT_FLOOR_HEIGHTS", warnings

            elif any(f.top_elevation is not None and f.base_elevation is not None and f.top_elevation <= f.base_elevation for f in req.floors):
                # Inverted elevations and no valid heights
                for fl in req.floors:
                    if fl.top_elevation is not None and fl.base_elevation is not None and fl.top_elevation <= fl.base_elevation:
                        warnings.append(
                            f"Floor '{fl.floor_id}' top elevation ({fl.top_elevation}m) must be strictly greater than base ({fl.base_elevation}m)."
                        )
                return [], None, None, None, "INVALID", warnings

        # --- Priority 3: Known Floor Count + Building Height ---
        # Resolve total height
        bld_height: Optional[float] = None
        if req.building_height is not None and math.isfinite(req.building_height) and req.building_height > 0:
            bld_height = req.building_height
        elif req.roof_elevation is not None and math.isfinite(req.roof_elevation) and req.roof_elevation > base_z:
            bld_height = req.roof_elevation - base_z

        floor_cnt = req.number_of_floors
        if floor_cnt is not None and floor_cnt > 0 and bld_height is not None and bld_height > 0:
            h_fl = round(bld_height / floor_cnt, 3)
            computed_floors = []
            for i in range(floor_cnt):
                fl_base = round(base_z + (i * h_fl), 3)
                fl_top = round(base_z + ((i + 1) * h_fl), 3) if i < floor_cnt - 1 else round(base_z + bld_height, 3)
                fl_name = "Ground Floor" if i == 0 else f"Floor {i}"
                fl_id = f"{req.building_id}-FL{str(i).zfill(2)}"
                computed_floors.append(
                    FloorIntervalSpec(
                        floor_id=fl_id,
                        floor_index=i,
                        floor_name=fl_name,
                        base_elevation=fl_base,
                        top_elevation=fl_top,
                        floor_height=round(fl_top - fl_base, 3),
                    )
                )
            overall_top = round(base_z + bld_height, 3)
            return computed_floors, base_z, overall_top, round(bld_height, 3), "EQUAL_SLICING", warnings

        # --- Priority 3b: Floor Count + Single Floor Height ---
        if floor_cnt is not None and floor_cnt > 0 and req.floor_height is not None and req.floor_height > 0:
            h_fl = req.floor_height
            computed_floors = []
            for i in range(floor_cnt):
                fl_base = round(base_z + (i * h_fl), 3)
                fl_top = round(base_z + ((i + 1) * h_fl), 3)
                fl_name = "Ground Floor" if i == 0 else f"Floor {i}"
                fl_id = f"{req.building_id}-FL{str(i).zfill(2)}"
                computed_floors.append(
                    FloorIntervalSpec(
                        floor_id=fl_id,
                        floor_index=i,
                        floor_name=fl_name,
                        base_elevation=fl_base,
                        top_elevation=fl_top,
                        floor_height=round(fl_top - fl_base, 3),
                    )
                )
            overall_top = round(base_z + (floor_cnt * h_fl), 3)
            return computed_floors, base_z, overall_top, round(floor_cnt * h_fl, 3), "COUNT_AND_UNIFORM_HEIGHT", warnings

        # --- Priority 4: Unavailable ---
        warnings.append(
            "Insufficient floor elevation information: specify explicit floor intervals, explicit floor heights, or building height with floor count."
        )
        return [], base_z, None, None, "UNAVAILABLE", warnings

    @classmethod
    def extrude_floor_solid(
        cls,
        polygons: List[Polygon],
        floor_spec: FloorIntervalSpec,
        origin: Tuple[float, float, float],
        target_crs: str,
        source_crs: str,
        building_id: str,
        parcel_id: Optional[str] = None,
    ) -> Floor3DResult:
        """
        Extrudes a single floor interval across given metric polygon(s) into a watertight Floor3DResult.
        """
        floor_parts: List[Mesh3D] = []
        total_volume = 0.0
        total_surface_area = 0.0
        all_vertices_x: List[float] = []
        all_vertices_y: List[float] = []
        all_vertices_z: List[float] = []
        warnings: List[str] = []

        fl_base = floor_spec.base_elevation
        fl_top = floor_spec.top_elevation
        fl_height = round(fl_top - fl_base, 3)

        for p_idx, poly in enumerate(polygons):
            part_id = f"{floor_spec.floor_id}_part_{p_idx}" if len(polygons) > 1 else floor_spec.floor_id
            part_mesh = ExtrusionService._extrude_single_polygon(
                poly=poly,
                base_z=fl_base,
                top_z=fl_top,
                origin=origin,
                feature_id=part_id,
                horizontal_crs=target_crs,
                source_crs=source_crs,
                feature_type=FeatureType.FLOOR,
            )

            # Audit solid watertightness and CCW orientation
            audit = ExtrusionService.validate_mesh(part_mesh)
            if not audit.valid:
                warnings.extend(audit.errors)

            floor_parts.append(part_mesh)
            total_volume += part_mesh.volume_cubic_m
            total_surface_area += part_mesh.surface_area_sqm

            for v in part_mesh.vertices:
                all_vertices_x.append(v[0])
                all_vertices_y.append(v[1])
                all_vertices_z.append(v[2])

        min_bounds = [
            round(min(all_vertices_x), 3),
            round(min(all_vertices_y), 3),
            round(min(all_vertices_z), 3),
        ]
        max_bounds = [
            round(max(all_vertices_x), 3),
            round(max(all_vertices_y), 3),
            round(max(all_vertices_z), 3),
        ]

        # Verify mathematical volume agreement (sum(poly.area) * height)
        expected_volume = round(sum(p.area for p in polygons) * fl_height, 3)
        if abs(total_volume - expected_volume) > 0.05:
            warnings.append(
                f"Volume discrepancy: mesh enclosed volume ({total_volume} m3) differs from mathematical area * height ({expected_volume} m3)."
            )

        collection = Mesh3DCollection(
            feature_id=floor_spec.floor_id,
            feature_type=FeatureType.FLOOR,
            geometry_type=GeometryType.SOLID_COLLECTION,
            parts=floor_parts,
            bounds=Bounds3D(min=min_bounds, max=max_bounds),
            total_volume_cubic_m=round(total_volume, 3),
            total_surface_area_sqm=round(total_surface_area, 3),
        )

        status = Geometry3DStatus.VALID if not warnings else Geometry3DStatus.INVALID

        return Floor3DResult(
            floor_id=floor_spec.floor_id,
            building_id=building_id,
            parcel_id=parcel_id,
            floor_index=floor_spec.floor_index,
            floor_name=floor_spec.floor_name,
            volume_type=VolumeType.FLOOR,
            base_elevation=fl_base,
            top_elevation=fl_top,
            height=fl_height,
            volume_cubic_m=round(total_volume, 3),
            surface_area_sqm=round(total_surface_area, 3),
            geometry_status=status,
            geometry=collection,
            warnings=warnings,
        )

    @classmethod
    def generate_building_floors(
        cls,
        req: BuildingFloors3DRequest,
        shared_origin: Optional[Tuple[float, float, float]] = None,
    ) -> BuildingFloors3DResult:
        """
        Extrudes all floor solids for a building footprint.
        """
        # 1. Resolve floor elevation intervals
        floors_spec, base_z, top_z, total_h, method, warnings = cls.resolve_floor_intervals(req)

        if not floors_spec:
            status = Geometry3DStatus.UNAVAILABLE if method == "UNAVAILABLE" else Geometry3DStatus.INVALID
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=0,
                floors=[],
                geometry_status=status,
                warnings=warnings,
            )

        # 2. Footprint Geometry Parsing & Reprojection
        try:
            raw_geom = shape(req.footprint_geometry)
            if not raw_geom.is_valid:
                raw_geom = make_valid(raw_geom)
        except Exception as e:
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=len(floors_spec),
                floors=[],
                geometry_status=Geometry3DStatus.INVALID,
                warnings=[f"Failed to parse GeoJSON footprint: {str(e)}"],
            )

        if raw_geom.is_empty:
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=len(floors_spec),
                floors=[],
                geometry_status=Geometry3DStatus.INVALID,
                warnings=["Footprint geometry is empty."],
            )

        target_crs = req.target_crs or "EPSG:32643"
        try:
            metric_geom, _ = ExtrusionService._project_geometry(raw_geom, req.source_crs, target_crs)
        except Exception as e:
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=len(floors_spec),
                floors=[],
                geometry_status=Geometry3DStatus.INVALID,
                warnings=[f"CRS reprojection to {target_crs} failed: {str(e)}"],
            )

        polygons: List[Polygon] = []
        if isinstance(metric_geom, Polygon):
            polygons.append(metric_geom)
        elif isinstance(metric_geom, MultiPolygon):
            polygons.extend(metric_geom.geoms)
        else:
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=len(floors_spec),
                floors=[],
                geometry_status=Geometry3DStatus.INVALID,
                warnings=[f"Unsupported geometry type '{metric_geom.geom_type}'."],
            )

        # Degenerate area check
        if metric_geom.area < 1.0:
            return BuildingFloors3DResult(
                building_id=req.building_id,
                parcel_id=req.parcel_id,
                base_elevation=base_z,
                top_elevation=top_z,
                height=total_h,
                floor_count=len(floors_spec),
                floors=[],
                geometry_status=Geometry3DStatus.INVALID,
                warnings=[f"Footprint metric area ({metric_geom.area:.2f} m2) is degenerate (< 1.0 m2)."],
            )

        # 3. Determine Viewer Origin Offset
        if req.scene_origin and len(req.scene_origin) >= 3:
            origin = (req.scene_origin[0], req.scene_origin[1], req.scene_origin[2])
        elif shared_origin:
            origin = shared_origin
        else:
            centroid = metric_geom.centroid
            origin = (centroid.x, centroid.y, base_z)

        # 4. Generate each floor solid
        floor_results: List[Floor3DResult] = []
        has_failure = False

        assumed_footprint_warning = (
            "FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING: Floor footprint geometry is assumed from building "
            "footprint envelope; floor-specific architectural boundaries are not specified."
        )
        warnings.append(assumed_footprint_warning)

        for fl_spec in floors_spec:
            fl_res = cls.extrude_floor_solid(
                polygons=polygons,
                floor_spec=fl_spec,
                origin=origin,
                target_crs=target_crs,
                source_crs=req.source_crs,
                building_id=req.building_id,
                parcel_id=req.parcel_id,
            )
            fl_res.warnings.append(assumed_footprint_warning)
            if fl_res.geometry_status != Geometry3DStatus.VALID:
                has_failure = True
            floor_results.append(fl_res)

        overall_status = Geometry3DStatus.INVALID if has_failure else Geometry3DStatus.VALID

        return BuildingFloors3DResult(
            building_id=req.building_id,
            parcel_id=req.parcel_id,
            base_elevation=base_z,
            top_elevation=top_z,
            height=total_h,
            floor_count=len(floor_results),
            floors=floor_results,
            geometry_status=overall_status,
            warnings=warnings,
        )

    @classmethod
    def generate_floors_batch(cls, batch_req: BatchBuildingFloors3DRequest) -> GenerateFloors3DResponse:
        """
        Batch processing for multi-building 3D floor extrusion.
        """
        if not batch_req.buildings:
            return GenerateFloors3DResponse(
                schema_version=SCHEMA_VERSION,
                results=[],
                summary=BatchSummary3D(requested=0, successful=0, failed=0),
            )

        # Compute shared origin if requested
        shared_origin: Optional[Tuple[float, float, float]] = None
        target_crs = batch_req.target_crs or "EPSG:32643"

        if batch_req.compute_shared_origin:
            centroids_x: List[float] = []
            centroids_y: List[float] = []
            elevations_z: List[float] = []

            for bld in batch_req.buildings:
                try:
                    raw_geom = shape(bld.footprint_geometry)
                    m_geom, _ = ExtrusionService._project_geometry(raw_geom, bld.source_crs, target_crs)
                    c = m_geom.centroid
                    centroids_x.append(c.x)
                    centroids_y.append(c.y)
                    if bld.ground_elevation is not None:
                        elevations_z.append(bld.ground_elevation)
                except Exception:
                    pass

            if centroids_x and centroids_y:
                avg_x = sum(centroids_x) / len(centroids_x)
                avg_y = sum(centroids_y) / len(centroids_y)
                avg_z = sum(elevations_z) / len(elevations_z) if elevations_z else 0.0
                shared_origin = (avg_x, avg_y, avg_z)

        results: List[BuildingFloors3DResult] = []
        successful = 0
        failed = 0

        for bld_req in batch_req.buildings:
            b_res = cls.generate_building_floors(bld_req, shared_origin=shared_origin)
            if b_res.geometry_status == Geometry3DStatus.VALID:
                successful += 1
            else:
                failed += 1
            results.append(b_res)

        return GenerateFloors3DResponse(
            schema_version=SCHEMA_VERSION,
            results=results,
            summary=BatchSummary3D(
                requested=len(batch_req.buildings),
                successful=successful,
                failed=failed,
            ),
        )

    # --- Property Volume Services ---

    @classmethod
    def generate_property_volume(
        cls,
        req: PropertyVolumeRequest,
        building_floors_map: Dict[str, BuildingFloors3DResult],
    ) -> PropertyVolumeResult:
        """
        Deterministically constructs a 3D Property Volume from referenced building and floor solids.
        Validates hierarchy:
            PARCEL -> BUILDING -> FLOOR -> PROPERTY_VOLUME
        """
        warnings: List[str] = []

        # 1. Resolve Target Building(s)
        target_building_ids: List[str] = []
        if req.building_ids:
            target_building_ids = list(req.building_ids)
        elif req.building_id:
            target_building_ids = [req.building_id]

        primary_bid = target_building_ids[0] if target_building_ids else req.building_id

        if not target_building_ids:
            return PropertyVolumeResult(
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=None,
                building_ids=[],
                floor_ids=req.floor_ids,
                volume_type=req.volume_type,
                unit_name=req.unit_name,
                geometry_status=Geometry3DStatus.UNAVAILABLE,
                warnings=["No parent building ID or building IDs specified for property volume."],
            )

        # 2. Validate Building existence and Parcel relationship
        for bid in target_building_ids:
            bld_floors = building_floors_map.get(bid)
            if not bld_floors:
                return PropertyVolumeResult(
                    property_id=req.property_id,
                    parcel_id=req.parcel_id,
                    building_id=primary_bid,
                    building_ids=target_building_ids,
                    floor_ids=req.floor_ids,
                    volume_type=req.volume_type,
                    unit_name=req.unit_name,
                    geometry_status=Geometry3DStatus.UNAVAILABLE,
                    warnings=[f"Parent building '{bid}' not found in generated 3D floor models."],
                )

            if bld_floors.parcel_id and bld_floors.parcel_id != req.parcel_id:
                warnings.append(
                    f"Parcel mismatch: requested parcel '{req.parcel_id}' differs from building '{bid}' associated parcel '{bld_floors.parcel_id}'."
                )
                return PropertyVolumeResult(
                    property_id=req.property_id,
                    parcel_id=req.parcel_id,
                    building_id=primary_bid,
                    building_ids=target_building_ids,
                    floor_ids=req.floor_ids,
                    volume_type=req.volume_type,
                    unit_name=req.unit_name,
                    geometry_status=Geometry3DStatus.INVALID,
                    warnings=warnings,
                )

        # 3. Match constituent floors & Check Duplicate Components
        if req.floor_ids and len(req.floor_ids) != len(set(req.floor_ids)):
            dups = [fid for fid in set(req.floor_ids) if req.floor_ids.count(fid) > 1]
            warnings.append(f"DUPLICATE_COMPONENT: Duplicate floor components detected in property request: {dups}")
            return PropertyVolumeResult(
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=primary_bid,
                building_ids=target_building_ids,
                floor_ids=req.floor_ids,
                volume_type=req.volume_type,
                unit_name=req.unit_name,
                geometry_status=Geometry3DStatus.INVALID,
                warnings=warnings,
            )

        matched_floors: List[Floor3DResult] = []
        all_bld_floors_lookup: Dict[str, Floor3DResult] = {}
        for bid in target_building_ids:
            bld_res = building_floors_map[bid]
            for f in bld_res.floors:
                all_bld_floors_lookup[f.floor_id] = f

        if req.floor_ids:
            for fid in req.floor_ids:
                fl = all_bld_floors_lookup.get(fid)
                if not fl:
                    warnings.append(
                        f"PROPERTY_VOLUME_INCOMPLETE_COMPONENTS: Floor '{fid}' does not belong to parent building(s) {target_building_ids}."
                    )
                    return PropertyVolumeResult(
                        property_id=req.property_id,
                        parcel_id=req.parcel_id,
                        building_id=primary_bid,
                        building_ids=target_building_ids,
                        floor_ids=req.floor_ids,
                        volume_type=req.volume_type,
                        unit_name=req.unit_name,
                        geometry_status=Geometry3DStatus.UNAVAILABLE,
                        warnings=warnings,
                    )
                if fl.geometry_status == Geometry3DStatus.UNAVAILABLE or fl.geometry is None:
                    warnings.append(
                        f"PROPERTY_VOLUME_INCOMPLETE_COMPONENTS: Component floor '{fid}' is UNAVAILABLE. Partial property volume cannot be marked VALID."
                    )
                    return PropertyVolumeResult(
                        property_id=req.property_id,
                        parcel_id=req.parcel_id,
                        building_id=primary_bid,
                        building_ids=target_building_ids,
                        floor_ids=req.floor_ids,
                        volume_type=req.volume_type,
                        unit_name=req.unit_name,
                        geometry_status=Geometry3DStatus.UNAVAILABLE,
                        warnings=warnings,
                    )
                if fl.geometry_status == Geometry3DStatus.INVALID:
                    warnings.append(
                        f"PROPERTY_VOLUME_INCOMPLETE_COMPONENTS: Component floor '{fid}' is INVALID."
                    )
                    return PropertyVolumeResult(
                        property_id=req.property_id,
                        parcel_id=req.parcel_id,
                        building_id=primary_bid,
                        building_ids=target_building_ids,
                        floor_ids=req.floor_ids,
                        volume_type=req.volume_type,
                        unit_name=req.unit_name,
                        geometry_status=Geometry3DStatus.INVALID,
                        warnings=warnings,
                    )
                matched_floors.append(fl)
        else:
            # Prototype default: union of all validated floors of associated building(s)
            for bid in target_building_ids:
                bld_res = building_floors_map[bid]
                if bld_res.geometry_status != Geometry3DStatus.VALID or not bld_res.floors:
                    return PropertyVolumeResult(
                        property_id=req.property_id,
                        parcel_id=req.parcel_id,
                        building_id=primary_bid,
                        building_ids=target_building_ids,
                        floor_ids=[],
                        volume_type=req.volume_type,
                        unit_name=req.unit_name,
                        geometry_status=Geometry3DStatus.UNAVAILABLE,
                        warnings=[f"Building '{bid}' has no validated floor geometry."],
                    )
                matched_floors.extend(bld_res.floors)

        if not matched_floors:
            return PropertyVolumeResult(
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=primary_bid,
                building_ids=target_building_ids,
                floor_ids=[],
                volume_type=req.volume_type,
                unit_name=req.unit_name,
                geometry_status=Geometry3DStatus.UNAVAILABLE,
                warnings=["No constituent floors available for property volume."],
            )

        # 4. Check for improper positive-volume floor interval overlaps per building
        for bid in target_building_ids:
            bld_floors_list = [f for f in matched_floors if f.building_id == bid]
            sorted_bld_floors = sorted(bld_floors_list, key=lambda f: (f.base_elevation, f.top_elevation))
            for idx in range(1, len(sorted_bld_floors)):
                prev = sorted_bld_floors[idx - 1]
                curr = sorted_bld_floors[idx]
                if curr.base_elevation < prev.top_elevation - cls.TOLERANCE_M:
                    warnings.append(
                        f"POSITIVE_VOLUME_OVERLAP: Vertical interval overlap detected between floor '{prev.floor_id}' "
                        f"[{prev.base_elevation}m - {prev.top_elevation}m] and '{curr.floor_id}' "
                        f"[{curr.base_elevation}m - {curr.top_elevation}m] in building '{bid}'."
                    )
                    return PropertyVolumeResult(
                        property_id=req.property_id,
                        parcel_id=req.parcel_id,
                        building_id=primary_bid,
                        building_ids=target_building_ids,
                        floor_ids=[f.floor_id for f in matched_floors],
                        volume_type=req.volume_type,
                        unit_name=req.unit_name,
                        geometry_status=Geometry3DStatus.INVALID,
                        warnings=warnings,
                    )

        # 5. Deterministic Component Ordering
        matched_floors = sorted(
            matched_floors,
            key=lambda f: (f.building_id, f.floor_index, f.base_elevation, f.floor_id)
        )

        # 6. Construct composite Mesh3DCollection of independent valid Mesh3D solids
        property_parts: List[Mesh3D] = []
        total_vol = 0.0
        total_area = 0.0
        all_vx: List[float] = []
        all_vy: List[float] = []
        all_vz: List[float] = []

        part_counter = 0
        for fl in matched_floors:
            if not fl.geometry:
                continue
            for part in fl.geometry.parts:
                # Clone part with property feature_type
                prop_part = Mesh3D(
                    feature_id=f"{req.property_id}_part_{part_counter}",
                    feature_type=FeatureType.PROPERTY_VOLUME,
                    geometry_type=GeometryType.SOLID,
                    vertices=part.vertices,
                    faces=part.faces,
                    coordinate_reference=part.coordinate_reference,
                    units=part.units,
                    bounds=part.bounds,
                    winding=part.winding,
                    surface_area_sqm=part.surface_area_sqm,
                    volume_cubic_m=part.volume_cubic_m,
                    metadata={"floor_id": fl.floor_id, "building_id": fl.building_id, "property_id": req.property_id},
                )
                property_parts.append(prop_part)
                total_vol += part.volume_cubic_m
                total_area += part.surface_area_sqm
                for v in part.vertices:
                    all_vx.append(v[0])
                    all_vy.append(v[1])
                    all_vz.append(v[2])
                part_counter += 1

        min_bounds = [round(min(all_vx), 3), round(min(all_vy), 3), round(min(all_vz), 3)]
        max_bounds = [round(max(all_vx), 3), round(max(all_vy), 3), round(max(all_vz), 3)]

        # 6. Verify total volume equals sum of component volumes within numerical tolerance
        sum_floor_vols = sum(f.volume_cubic_m for f in matched_floors)
        if abs(total_vol - sum_floor_vols) > 0.05:
            warnings.append(
                f"Volume discrepancy: component sum ({sum_floor_vols:.2f} m3) differs from mesh total ({total_vol:.2f} m3)."
            )
            return PropertyVolumeResult(
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=primary_bid,
                building_ids=target_building_ids,
                floor_ids=[f.floor_id for f in matched_floors],
                volume_type=req.volume_type,
                unit_name=req.unit_name,
                geometry_status=Geometry3DStatus.INVALID,
                warnings=warnings,
            )

        collection = Mesh3DCollection(
            feature_id=req.property_id,
            feature_type=FeatureType.PROPERTY_VOLUME,
            geometry_type=GeometryType.SOLID_COLLECTION,
            parts=property_parts,
            bounds=Bounds3D(min=min_bounds, max=max_bounds),
            total_volume_cubic_m=round(total_vol, 3),
            total_surface_area_sqm=round(total_area, 3),
        )

        base_elev = min(f.base_elevation for f in matched_floors)
        top_elev = max(f.top_elevation for f in matched_floors)
        total_h = round(top_elev - base_elev, 3)

        # 7. Explicit Provenance and Neutral Terminology Disclaimers
        warnings.append(
            "DERIVED_SPATIAL_EXTENT: 3D property-volume representation derived from available spatial evidence (not a legal determination of ownership)."
        )
        if any("FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING" in w for fl in matched_floors for w in fl.warnings):
            warnings.append(
                "FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING: Floor footprint geometry is assumed from building footprint envelope; floor-specific architectural boundaries are not specified."
            )

        return PropertyVolumeResult(
            property_id=req.property_id,
            parcel_id=req.parcel_id,
            building_id=primary_bid,
            building_ids=target_building_ids,
            floor_ids=[f.floor_id for f in matched_floors],
            volume_type=req.volume_type,
            unit_name=req.unit_name,
            base_elevation=base_elev,
            top_elevation=top_elev,
            total_height=total_h,
            volume_cubic_m=round(total_vol, 3),
            surface_area_sqm=round(total_area, 3),
            geometry_status=Geometry3DStatus.VALID,
            geometry=collection,
            warnings=warnings,
        )

    @classmethod
    def generate_properties_batch(
        cls,
        batch_req: BatchPropertyVolumeRequest,
        building_floors_map: Dict[str, BuildingFloors3DResult],
    ) -> GeneratePropertyVolumeResponse:
        """
        Batch processing for multi-property 3D volume generation.
        """
        results: List[PropertyVolumeResult] = []
        successful = 0
        failed = 0

        for prop_req in batch_req.properties:
            res = cls.generate_property_volume(prop_req, building_floors_map)
            if res.geometry_status == Geometry3DStatus.VALID:
                successful += 1
            else:
                failed += 1
            results.append(res)

        return GeneratePropertyVolumeResponse(
            schema_version=SCHEMA_VERSION,
            results=results,
            summary=BatchSummary3D(
                requested=len(batch_req.properties),
                successful=successful,
                failed=failed,
            ),
        )
