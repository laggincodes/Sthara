import math
from typing import List, Optional, Dict, Any, Tuple
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, GeometryCollection
from shapely.validation import explain_validity, make_valid
from shapely.ops import transform
import pyproj

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
from app.schemas.unit import (
    Unit,
    UnitStatus,
    UnitType,
    UnitSourceType,
    UnitValidationResult,
    UnitBatchValidationResponse,
    UnitPropertyRecord,
    Unit3DRequest,
    BatchUnit3DRequest,
    Unit3DResult,
    GenerateUnits3DResponse,
)
from app.services.extrusion_service import ExtrusionService
from app.core.logging import logger


class UnitService:
    """
    Authoritative domain service for validating, indexing, and modeling Unit / Apartment entities.
    Enforces strict cadastral containment, non-overlap, and vertical interval integrity.
    """

    @staticmethod
    def generate_unit_id(building_id: str, floor_id: str, unit_number: str) -> str:
        """
        Deterministically constructs a stable internal unit identifier.
        Example: BLD-DEMO-002-FL05-U501
        """
        # Extract clean floor token (e.g. FL05 from BLD-DEMO-002-FL05 or 05)
        floor_token = floor_id.split("-")[-1] if "-" in floor_id else f"FL{floor_id}"
        if not floor_token.startswith("FL"):
            floor_token = f"FL{floor_token}"
        clean_unit_num = str(unit_number).strip().replace(" ", "")
        return f"{building_id}-{floor_token}-U{clean_unit_num}"

    @classmethod
    def calculate_polygon_area_sqm(
        cls,
        geom_dict: Dict[str, Any],
        source_crs: str = "EPSG:4326"
    ) -> float:
        """
        Calculates exact metric area (m2) of a 2D geometry, reprojecting from geographic coords if needed.
        """
        try:
            poly = shape(geom_dict)
            if not poly.is_valid:
                poly = poly.buffer(0)

            if source_crs == "EPSG:4326":
                # Compute centroid latitude to pick UTM zone or use local UTM
                centroid = poly.centroid
                utm_zone = int(math.floor((centroid.x + 180) / 6) + 1)
                is_northern = centroid.y >= 0
                utm_epsg = f"EPSG:{32600 + utm_zone if is_northern else 32700 + utm_zone}"

                project = pyproj.Transformer.from_crs(
                    source_crs, utm_epsg, always_xy=True
                ).transform
                projected_poly = transform(project, poly)
                return float(projected_poly.area)
            else:
                return float(poly.area)
        except Exception as e:
            logger.warning(f"Error calculating metric area for unit geometry: {e}")
            return 0.0

    @classmethod
    def validate_unit(
        cls,
        unit: Unit,
        parent_floor: Optional[Dict[str, Any]] = None,
        parent_building: Optional[Dict[str, Any]] = None,
        parent_parcel: Optional[Dict[str, Any]] = None,
        sibling_units: Optional[List[Unit]] = None,
    ) -> UnitValidationResult:
        """
        Validates a single unit entity against domain rules:
        - Structural references & existence
        - Vertical extent & floor interval containment
        - 2D footprint validity & parent footprint containment
        - Sibling non-overlap (touching allowed, positive area overlap forbidden)
        """
        errors: List[str] = []
        warnings: List[str] = []
        details: Dict[str, Any] = {}

        # 1. Structural Identifiers & Labels
        if not unit.unit_id or not unit.unit_id.strip():
            errors.append("Unit identifier 'unit_id' cannot be empty.")
        if not unit.unit_number or not str(unit.unit_number).strip():
            errors.append("Unit designation 'unit_number' cannot be empty.")
        if not unit.floor_id or not unit.floor_id.strip():
            errors.append("Parent reference 'floor_id' cannot be empty.")
        if not unit.building_id or not unit.building_id.strip():
            errors.append("Parent reference 'building_id' cannot be empty.")
        if not unit.parcel_id or not unit.parcel_id.strip():
            errors.append("Parent reference 'parcel_id' cannot be empty.")

        # 2. Hierarchy Cross-Validation
        if parent_floor:
            pf_id = parent_floor.get("floor_id")
            if pf_id and pf_id != unit.floor_id:
                errors.append(f"Mismatched parent floor: unit references '{unit.floor_id}', but parent_floor is '{pf_id}'.")
            pf_bld = parent_floor.get("building_id")
            if pf_bld and pf_bld != unit.building_id:
                errors.append(f"Parent floor '{unit.floor_id}' belongs to building '{pf_bld}', but unit specifies building '{unit.building_id}'.")

        if parent_building:
            pb_id = parent_building.get("building_id")
            if pb_id and pb_id != unit.building_id:
                errors.append(f"Mismatched parent building: unit references '{unit.building_id}', but parent_building is '{pb_id}'.")
            pb_parcel = parent_building.get("parcel_id")
            if pb_parcel and pb_parcel != unit.parcel_id:
                errors.append(f"Parent building '{unit.building_id}' belongs to parcel '{pb_parcel}', but unit specifies parcel '{unit.parcel_id}'.")

        if parent_parcel:
            pp_id = parent_parcel.get("parcel_id")
            if pp_id and pp_id != unit.parcel_id:
                errors.append(f"Mismatched parent parcel: unit references '{unit.parcel_id}', but parent_parcel is '{pp_id}'.")

        # 3. Vertical Extent Validation
        has_vertical = unit.base_elevation is not None and unit.top_elevation is not None
        if not has_vertical:
            if unit.geometry_2d:
                errors.append("Missing vertical extent: both base_elevation and top_elevation must be provided for 3D unit modeling.")
            else:
                warnings.append("No vertical elevations provided for unit.")
        else:
            base_z = float(unit.base_elevation) # type: ignore
            top_z = float(unit.top_elevation) # type: ignore
            if top_z <= base_z:
                errors.append(f"Invalid vertical extent: top_elevation ({top_z:.2f}m) must be strictly greater than base_elevation ({base_z:.2f}m).")
            else:
                computed_h = round(top_z - base_z, 3)
                if unit.height is not None and abs(unit.height - computed_h) > 0.05:
                    warnings.append(f"Specified height ({unit.height}m) differs from computed (top - base = {computed_h}m). Using computed height.")
                details["computed_height"] = computed_h

            # Check vertical containment inside parent floor
            if parent_floor:
                pf_base = parent_floor.get("base_elevation")
                pf_top = parent_floor.get("top_elevation")
                if pf_base is not None and pf_top is not None:
                    # Tolerance 1mm
                    if base_z < float(pf_base) - 0.001 or top_z > float(pf_top) + 0.001:
                        errors.append(
                            f"Unit vertical interval [{base_z:.2f}, {top_z:.2f}] extends outside parent floor vertical span [{float(pf_base):.2f}, {float(pf_top):.2f}]. Clamping is forbidden."
                        )

        # 4. 2D Footprint & Spatial Containment
        unit_shapely: Optional[Polygon | MultiPolygon] = None
        if unit.geometry_2d:
            try:
                raw_shape = shape(unit.geometry_2d)
                if not raw_shape.is_valid:
                    errors.append(f"Invalid 2D geometry: {explain_validity(raw_shape)}")
                elif raw_shape.is_empty:
                    errors.append("2D footprint geometry is empty.")
                else:
                    unit_shapely = raw_shape
                    # Footprint area
                    area_sqm = cls.calculate_polygon_area_sqm(unit.geometry_2d)
                    details["footprint_area_sqm"] = area_sqm
                    if has_vertical and unit.top_elevation is not None and unit.base_elevation is not None:
                        details["volume_cubic_m"] = round(area_sqm * (unit.top_elevation - unit.base_elevation), 3)
            except Exception as e:
                errors.append(f"Failed to parse unit geometry_2d: {e}")
        else:
            warnings.append("No geometry_2d provided; unit footprint is UNAVAILABLE.")

        # Check containment inside parent floor or building footprint
        parent_footprint_geom = None
        if parent_floor and parent_floor.get("footprint_geometry"):
            parent_footprint_geom = parent_floor.get("footprint_geometry")
        elif parent_building and parent_building.get("footprint_geometry"):
            parent_footprint_geom = parent_building.get("footprint_geometry")
        elif parent_building and parent_building.get("geometry"):
            parent_footprint_geom = parent_building.get("geometry")

        if unit_shapely is not None and parent_footprint_geom:
            try:
                parent_shape = shape(parent_footprint_geom)
                if not parent_shape.is_valid:
                    parent_shape = parent_shape.buffer(0)

                # Tolerant containment check: outside difference must be negligible
                diff = unit_shapely.difference(parent_shape.buffer(1e-7))
                if not diff.is_empty and diff.area > 1e-8:
                    errors.append(
                        f"Unit footprint extends beyond parent building/floor footprint boundary. Silently clipping is prohibited."
                    )
            except Exception as e:
                warnings.append(f"Could not verify parent footprint containment: {e}")

        # 5. Sibling Units Non-Overlap & Duplicate Number Validation
        if sibling_units:
            for sibling in sibling_units:
                if sibling.unit_id == unit.unit_id:
                    continue
                # Same floor check
                if sibling.floor_id != unit.floor_id:
                    continue

                # Check duplicate unit number on the same floor
                if str(sibling.unit_number).strip().lower() == str(unit.unit_number).strip().lower():
                    errors.append(f"Duplicate unit_number '{unit.unit_number}' found on floor '{unit.floor_id}' (conflicts with unit '{sibling.unit_id}').")

                # Geometric overlap check when both footprints exist
                if unit_shapely is not None and sibling.geometry_2d:
                    try:
                        sib_shape = shape(sibling.geometry_2d)
                        if sib_shape.is_valid and not sib_shape.is_empty:
                            intersection = unit_shapely.intersection(sib_shape)
                            # Positive-area overlap rule: overlap area > 1e-8 is invalid; boundary touch (area == 0) is valid!
                            if not intersection.is_empty and intersection.area > 1e-8:
                                errors.append(
                                    f"Positive area overlap detected between unit '{unit.unit_id}' and sibling unit '{sibling.unit_id}'. Overlapping units on the same floor are invalid."
                                )
                    except Exception as e:
                        warnings.append(f"Error checking overlap with sibling {sibling.unit_id}: {e}")

        # Final Status Resolution
        is_valid = len(errors) == 0
        if not is_valid:
            status = UnitStatus.INVALID
        elif unit.geometry_2d is None or not has_vertical:
            status = UnitStatus.UNAVAILABLE
        else:
            status = UnitStatus.VALID

        return UnitValidationResult(
            unit_id=unit.unit_id,
            valid=is_valid,
            status=status,
            errors=errors,
            warnings=warnings,
            details=details,
        )

    @classmethod
    def validate_batch(
        cls,
        units: List[Unit],
        floors: Optional[List[Dict[str, Any]]] = None,
        buildings: Optional[List[Dict[str, Any]]] = None,
        parcels: Optional[List[Dict[str, Any]]] = None,
    ) -> UnitBatchValidationResponse:
        """
        Validates a collection of units with full duplicate detection and sibling cross-checks.
        """
        results: List[UnitValidationResult] = []
        floor_map = {f.get("floor_id"): f for f in (floors or []) if f.get("floor_id")}
        bld_map = {b.get("building_id"): b for b in (buildings or []) if b.get("building_id")}
        parcel_map = {p.get("parcel_id"): p for p in (parcels or []) if p.get("parcel_id")}

        # Duplicate unit_id tracking
        unit_id_counts: Dict[str, int] = {}
        for u in units:
            unit_id_counts[u.unit_id] = unit_id_counts.get(u.unit_id, 0) + 1

        for unit in units:
            # Check duplicate unit_id in batch
            dup_errors: List[str] = []
            if unit_id_counts.get(unit.unit_id, 0) > 1:
                dup_errors.append(f"Duplicate unit_id '{unit.unit_id}' exists in validation batch.")

            parent_floor = floor_map.get(unit.floor_id)
            parent_bld = bld_map.get(unit.building_id)
            parent_parcel = parcel_map.get(unit.parcel_id)

            siblings = [other for other in units if other.unit_id != unit.unit_id and other.floor_id == unit.floor_id]

            res = cls.validate_unit(
                unit=unit,
                parent_floor=parent_floor,
                parent_building=parent_bld,
                parent_parcel=parent_parcel,
                sibling_units=siblings,
            )

            if dup_errors:
                res.errors.extend(dup_errors)
                res.valid = False
                res.status = UnitStatus.INVALID

            results.append(res)

        valid_count = sum(1 for r in results if r.status == UnitStatus.VALID)
        invalid_count = sum(1 for r in results if r.status == UnitStatus.INVALID)
        unavail_count = sum(1 for r in results if r.status == UnitStatus.UNAVAILABLE)

        return UnitBatchValidationResponse(
            total_units=len(units),
            valid_units=valid_count,
            invalid_units=invalid_count,
            unavailable_units=unavail_count,
            results=results,
        )

    @classmethod
    def create_property_record(cls, unit: Unit) -> UnitPropertyRecord:
        """
        Creates a conceptual 3D Property Record for an individual unit.
        """
        base_z = unit.base_elevation or 0.0
        top_z = unit.top_elevation or base_z

        return UnitPropertyRecord(
            parcel_id=unit.parcel_id,
            building_id=unit.building_id,
            floor_id=unit.floor_id,
            unit_id=unit.unit_id,
            unit_number=unit.unit_number,
            unit_name=unit.unit_name,
            z_range_amsl={"min_z": base_z, "max_z": top_z},
            volume_cubic_m=unit.volume_cubic_m,
            footprint_area_sqm=unit.footprint_area,
            status=unit.status,
        )

    @classmethod
    def resolve_unit_vertical_extent(
        cls,
        req: Unit3DRequest,
    ) -> Tuple[Optional[float], Optional[float], Optional[float], str, List[str]]:
        """
        Applies vertical extent resolution priority:
        1. Explicit unit base and top elevation (or base + height)
        2. Validated parent floor base and top elevation (inheritance)
        3. Unavailable
        """
        warnings: List[str] = []
        base_z = req.base_elevation
        top_z = req.top_elevation

        # If base is provided and height is provided but top is not
        if (
            base_z is not None and math.isfinite(base_z)
            and top_z is None
            and req.height is not None and math.isfinite(req.height) and req.height > 0
        ):
            top_z = base_z + req.height

        # 1. Explicit unit base and top elevations
        if base_z is not None and top_z is not None and math.isfinite(base_z) and math.isfinite(top_z):
            if top_z <= base_z:
                warnings.append(
                    f"UNIT_INVALID_VERTICAL_EXTENT: Unit top elevation ({top_z}m) must be strictly greater than base elevation ({base_z}m)."
                )
                return round(base_z, 3), round(top_z, 3), round(top_z - base_z, 3), "INVALID", warnings

            height = round(top_z - base_z, 3)
            # Check against parent floor range if provided
            if req.parent_floor_base is not None and math.isfinite(req.parent_floor_base):
                if base_z < req.parent_floor_base - 0.05:
                    warnings.append(
                        f"UNIT_OUTSIDE_FLOOR_VERTICAL_BOUNDS: Unit base elevation ({base_z}m) is below parent floor base ({req.parent_floor_base}m)."
                    )
                    return round(base_z, 3), round(top_z, 3), height, "INVALID", warnings
            if req.parent_floor_top is not None and math.isfinite(req.parent_floor_top):
                if top_z > req.parent_floor_top + 0.05:
                    warnings.append(
                        f"UNIT_OUTSIDE_FLOOR_VERTICAL_BOUNDS: Unit top elevation ({top_z}m) exceeds parent floor top ({req.parent_floor_top}m)."
                    )
                    return round(base_z, 3), round(top_z, 3), height, "INVALID", warnings

            return round(base_z, 3), round(top_z, 3), height, "EXPLICIT_UNIT_ELEVATION", warnings

        # 2. Inherited from parent floor
        if (
            req.parent_floor_base is not None and math.isfinite(req.parent_floor_base)
            and req.parent_floor_top is not None and math.isfinite(req.parent_floor_top)
            and req.parent_floor_top > req.parent_floor_base
        ):
            base_z = req.parent_floor_base
            top_z = req.parent_floor_top
            height = round(top_z - base_z, 3)
            warnings.append("UNIT_VERTICAL_EXTENT_INHERITED_FROM_FLOOR")
            return round(base_z, 3), round(top_z, 3), height, "PARENT_FLOOR_INHERITED", warnings

        return None, None, None, "UNAVAILABLE", ["UNIT_VERTICAL_EXTENT_UNAVAILABLE: No valid explicit elevations or parent floor extent."]

    @classmethod
    def resolve_unit_footprint(
        cls,
        req: Unit3DRequest,
    ) -> Tuple[Optional[Any], str, List[str]]:
        """
        Resolves unit 2D polygon footprint.
        """
        warnings: List[str] = []
        if not req.geometry_2d or "type" not in req.geometry_2d:
            return None, "UNAVAILABLE", ["UNIT_FOOTPRINT_UNAVAILABLE: Missing 2D footprint geometry."]

        try:
            geom = shape(req.geometry_2d)
            if geom.is_empty:
                return None, "UNAVAILABLE", ["UNIT_FOOTPRINT_UNAVAILABLE: Empty 2D footprint geometry."]
            if not geom.is_valid:
                geom = make_valid(geom)
            if isinstance(geom, GeometryCollection):
                polys = [g for g in geom.geoms if isinstance(g, Polygon)]
                if len(polys) == 1:
                    geom = polys[0]
                elif len(polys) > 1:
                    geom = MultiPolygon(polys)
            if isinstance(geom, (Polygon, MultiPolygon)):
                return geom, "EXPLICIT_UNIT_FOOTPRINT", warnings
            else:
                return None, "INVALID", [f"Unsupported footprint geometry type: {geom.geom_type}"]
        except Exception as e:
            return None, "INVALID", [f"Error parsing unit footprint: {str(e)}"]

    @classmethod
    def generate_unit_3d(
        cls,
        req: Unit3DRequest,
        scene_origin: Optional[Tuple[float, float, float]] = None,
        target_crs: str = "EPSG:32643",
    ) -> Unit3DResult:
        """
        Extrudes a single validated unit into a closed, watertight 3D solid mesh conforming
        to the 3D Geometry Contract (v1.0).
        """
        warnings: List[str] = []
        provenance: Dict[str, Any] = {
            "source_crs": req.source_crs,
            "target_crs": target_crs,
        }

        # 1. Resolve vertical extent
        base_z, top_z, height, z_src, z_warns = cls.resolve_unit_vertical_extent(req)
        warnings.extend(z_warns)
        provenance["vertical_extent_source"] = z_src

        if z_src == "UNAVAILABLE" or base_z is None or top_z is None or height is None:
            return Unit3DResult(
                unit_id=req.unit_id,
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=req.building_id,
                floor_id=req.floor_id,
                unit_number=req.unit_number,
                unit_name=req.unit_name,
                unit_type=req.unit_type,
                base_elevation=base_z,
                top_elevation=top_z,
                height=height,
                geometry_status=Geometry3DStatus.UNAVAILABLE,
                warnings=warnings,
                provenance=provenance,
            )

        if z_src == "INVALID":
            return Unit3DResult(
                unit_id=req.unit_id,
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=req.building_id,
                floor_id=req.floor_id,
                unit_number=req.unit_number,
                unit_name=req.unit_name,
                unit_type=req.unit_type,
                base_elevation=base_z,
                top_elevation=top_z,
                height=height,
                geometry_status=Geometry3DStatus.INVALID,
                warnings=warnings,
                provenance=provenance,
            )

        # 2. Resolve 2D footprint
        footprint, f_src, f_warns = cls.resolve_unit_footprint(req)
        warnings.extend(f_warns)
        provenance["footprint_source"] = f_src

        if f_src == "UNAVAILABLE" or footprint is None:
            return Unit3DResult(
                unit_id=req.unit_id,
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=req.building_id,
                floor_id=req.floor_id,
                unit_number=req.unit_number,
                unit_name=req.unit_name,
                unit_type=req.unit_type,
                base_elevation=base_z,
                top_elevation=top_z,
                height=height,
                geometry_status=Geometry3DStatus.UNAVAILABLE,
                warnings=warnings,
                provenance=provenance,
            )

        if f_src == "INVALID":
            return Unit3DResult(
                unit_id=req.unit_id,
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=req.building_id,
                floor_id=req.floor_id,
                unit_number=req.unit_number,
                unit_name=req.unit_name,
                unit_type=req.unit_type,
                base_elevation=base_z,
                top_elevation=top_z,
                height=height,
                geometry_status=Geometry3DStatus.INVALID,
                warnings=warnings,
                provenance=provenance,
            )

        # 3. Reproject footprint to target metric CRS
        projected_geom, _ = ExtrusionService._project_geometry(
            footprint, req.source_crs, target_crs
        )

        # 4. Resolve local scene origin
        if scene_origin is not None:
            origin = scene_origin
        elif req.scene_origin is not None and len(req.scene_origin) == 3:
            origin = (req.scene_origin[0], req.scene_origin[1], req.scene_origin[2])
        else:
            bounds = projected_geom.bounds
            origin = (round(bounds[0], 2), round(bounds[1], 2), 0.0)

        provenance["scene_origin"] = list(origin)

        # 5. Extrude solid meshes
        parts: List[Mesh3D] = []
        polys: List[Polygon] = (
            list(projected_geom.geoms)
            if isinstance(projected_geom, MultiPolygon)
            else [projected_geom]
        )

        total_vol = 0.0
        total_surface_area = 0.0
        total_footprint_area = round(float(projected_geom.area), 3)

        for idx, poly in enumerate(polys):
            if poly.area < 1e-4:
                continue
            part_id = f"{req.unit_id}_part_{idx}" if len(polys) > 1 else req.unit_id
            mesh_part = ExtrusionService._extrude_single_polygon(
                poly=poly,
                base_z=base_z,
                top_z=top_z,
                origin=origin,
                feature_id=part_id,
                horizontal_crs=target_crs,
                source_crs=req.source_crs,
                vertical_ref="AMSL (Above Mean Sea Level)",
                feature_type=FeatureType.UNIT,
            )

            # Validate mesh with canonical validator
            val_res = ExtrusionService.validate_mesh(mesh_part)
            if not val_res.valid:
                warnings.extend([f"Mesh validation error in part {part_id}: {err}" for err in val_res.errors])
                return Unit3DResult(
                    unit_id=req.unit_id,
                    property_id=req.property_id,
                    parcel_id=req.parcel_id,
                    building_id=req.building_id,
                    floor_id=req.floor_id,
                    unit_number=req.unit_number,
                    unit_name=req.unit_name,
                    unit_type=req.unit_type,
                    base_elevation=base_z,
                    top_elevation=top_z,
                    height=height,
                    footprint_area=total_footprint_area,
                    geometry_status=Geometry3DStatus.INVALID,
                    warnings=warnings,
                    provenance=provenance,
                )

            parts.append(mesh_part)
            total_vol += mesh_part.volume_cubic_m
            total_surface_area += mesh_part.surface_area_sqm

        if not parts:
            warnings.append("Zero valid mesh parts extruded from footprint geometry.")
            return Unit3DResult(
                unit_id=req.unit_id,
                property_id=req.property_id,
                parcel_id=req.parcel_id,
                building_id=req.building_id,
                floor_id=req.floor_id,
                unit_number=req.unit_number,
                unit_name=req.unit_name,
                unit_type=req.unit_type,
                base_elevation=base_z,
                top_elevation=top_z,
                height=height,
                footprint_area=total_footprint_area,
                geometry_status=Geometry3DStatus.INVALID,
                warnings=warnings,
                provenance=provenance,
            )

        # Independent volume verification against analytical A * h
        expected_vol = round(total_footprint_area * height, 3)
        actual_vol = round(total_vol, 3)
        if abs(expected_vol - actual_vol) > 0.05 * max(expected_vol, 1.0):
            warnings.append(
                f"Volume discrepancy: analytical volume ({expected_vol} m3) differs from mesh volume ({actual_vol} m3)."
            )

        all_min_x = min(m.bounds.min[0] for m in parts)
        all_min_y = min(m.bounds.min[1] for m in parts)
        all_min_z = min(m.bounds.min[2] for m in parts)
        all_max_x = max(m.bounds.max[0] for m in parts)
        all_max_y = max(m.bounds.max[1] for m in parts)
        all_max_z = max(m.bounds.max[2] for m in parts)

        unified_bounds = Bounds3D(
            min=[round(all_min_x, 3), round(all_min_y, 3), round(all_min_z, 3)],
            max=[round(all_max_x, 3), round(all_max_y, 3), round(all_max_z, 3)],
        )

        collection = Mesh3DCollection(
            parts=parts,
            bounds=unified_bounds,
            total_volume_cubic_m=actual_vol,
            total_surface_area_sqm=round(total_surface_area, 3),
        )

        return Unit3DResult(
            unit_id=req.unit_id,
            property_id=req.property_id,
            parcel_id=req.parcel_id,
            building_id=req.building_id,
            floor_id=req.floor_id,
            unit_number=req.unit_number,
            unit_name=req.unit_name,
            unit_type=req.unit_type,
            base_elevation=base_z,
            top_elevation=top_z,
            height=height,
            footprint_area=total_footprint_area,
            volume_cubic_m=actual_vol,
            surface_area_sqm=round(total_surface_area, 3),
            geometry_status=Geometry3DStatus.VALID,
            geometry=collection,
            warnings=warnings,
            provenance=provenance,
        )

    @classmethod
    def generate_batch_units_3d(cls, req: BatchUnit3DRequest) -> GenerateUnits3DResponse:
        """
        Batch processing of multiple units into 3D polyhedral solids.
        Enforces same-floor non-overlap and isolated error handling.
        """
        units = req.units
        target_crs = req.target_crs or "EPSG:32643"
        results: List[Unit3DResult] = []

        # 1. Check duplicate unit_id in request
        unit_id_counts: Dict[str, int] = {}
        for u in units:
            unit_id_counts[u.unit_id] = unit_id_counts.get(u.unit_id, 0) + 1

        # 2. Check same-floor duplicate unit_number
        floor_unit_nums: Dict[Tuple[str, str], List[str]] = {}
        for u in units:
            key = (u.building_id, u.floor_id)
            floor_unit_nums.setdefault(key, []).append(u.unit_number)

        # 3. Check same-floor positive area overlaps
        floor_units: Dict[Tuple[str, str], List[Unit3DRequest]] = {}
        for u in units:
            key = (u.building_id, u.floor_id)
            floor_units.setdefault(key, []).append(u)

        overlapping_unit_ids: Dict[str, List[str]] = {}
        for (bld, fl), grp in floor_units.items():
            parsed = []
            for u in grp:
                if u.geometry_2d:
                    try:
                        sh = shape(u.geometry_2d)
                        if not sh.is_valid:
                            sh = make_valid(sh)
                        parsed.append((u.unit_id, sh))
                    except Exception:
                        pass
            for i in range(len(parsed)):
                for j in range(i + 1, len(parsed)):
                    uid_a, geom_a = parsed[i]
                    uid_b, geom_b = parsed[j]
                    try:
                        inter = geom_a.intersection(geom_b)
                        if inter.area > 1e-10:
                            overlapping_unit_ids.setdefault(uid_a, []).append(uid_b)
                            overlapping_unit_ids.setdefault(uid_b, []).append(uid_a)
                    except Exception:
                        pass

        # 4. Compute shared scene origin across all valid footprints
        shared_origin: Optional[Tuple[float, float, float]] = None
        if req.compute_shared_origin:
            all_min_x: List[float] = []
            all_min_y: List[float] = []
            for u in units:
                if u.geometry_2d:
                    try:
                        sh = shape(u.geometry_2d)
                        proj, _ = ExtrusionService._project_geometry(sh, u.source_crs, target_crs)
                        all_min_x.append(proj.bounds[0])
                        all_min_y.append(proj.bounds[1])
                    except Exception:
                        pass
            if all_min_x and all_min_y:
                shared_origin = (round(min(all_min_x), 2), round(min(all_min_y), 2), 0.0)

        # 5. Process each unit independently
        for u in units:
            # Check duplicate unit_id
            if unit_id_counts.get(u.unit_id, 0) > 1:
                res = Unit3DResult(
                    unit_id=u.unit_id,
                    property_id=u.property_id,
                    parcel_id=u.parcel_id,
                    building_id=u.building_id,
                    floor_id=u.floor_id,
                    unit_number=u.unit_number,
                    unit_name=u.unit_name,
                    unit_type=u.unit_type,
                    base_elevation=u.base_elevation,
                    top_elevation=u.top_elevation,
                    height=u.height,
                    geometry_status=Geometry3DStatus.INVALID,
                    warnings=[f"DUPLICATE_UNIT_ID: Unit identifier '{u.unit_id}' is duplicated in request."],
                )
                results.append(res)
                continue

            # Check duplicate unit_number on same floor
            key = (u.building_id, u.floor_id)
            if floor_unit_nums.get(key, []).count(u.unit_number) > 1:
                res = Unit3DResult(
                    unit_id=u.unit_id,
                    property_id=u.property_id,
                    parcel_id=u.parcel_id,
                    building_id=u.building_id,
                    floor_id=u.floor_id,
                    unit_number=u.unit_number,
                    unit_name=u.unit_name,
                    unit_type=u.unit_type,
                    base_elevation=u.base_elevation,
                    top_elevation=u.top_elevation,
                    height=u.height,
                    geometry_status=Geometry3DStatus.INVALID,
                    warnings=[f"DUPLICATE_UNIT_NUMBER: Unit number '{u.unit_number}' is duplicated on floor '{u.floor_id}'."],
                )
                results.append(res)
                continue

            # Check positive area overlap
            if u.unit_id in overlapping_unit_ids:
                other_ids = overlapping_unit_ids[u.unit_id]
                res = Unit3DResult(
                    unit_id=u.unit_id,
                    property_id=u.property_id,
                    parcel_id=u.parcel_id,
                    building_id=u.building_id,
                    floor_id=u.floor_id,
                    unit_number=u.unit_number,
                    unit_name=u.unit_name,
                    unit_type=u.unit_type,
                    base_elevation=u.base_elevation,
                    top_elevation=u.top_elevation,
                    height=u.height,
                    geometry_status=Geometry3DStatus.INVALID,
                    warnings=[f"POSITIVE_AREA_OVERLAP: Unit '{u.unit_id}' has positive-area planar overlap with unit(s) {other_ids} on same floor."],
                )
                results.append(res)
                continue

            # Standard 3D extrusion
            res = cls.generate_unit_3d(
                req=u,
                scene_origin=shared_origin,
                target_crs=target_crs,
            )
            results.append(res)

        successful = sum(1 for r in results if r.geometry_status == Geometry3DStatus.VALID)
        failed = sum(1 for r in results if r.geometry_status == Geometry3DStatus.INVALID)
        unavailable = sum(1 for r in results if r.geometry_status == Geometry3DStatus.UNAVAILABLE)

        summary = BatchSummary3D(
            requested=len(units),
            successful=successful,
            failed=failed + unavailable,
        )

        return GenerateUnits3DResponse(
            schema_version=SCHEMA_VERSION,
            results=results,
            summary=summary,
        )
