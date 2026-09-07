import math
from typing import List, Optional, Dict, Any, Tuple
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import explain_validity
from shapely.ops import transform
import pyproj

from app.schemas.unit import (
    Unit,
    UnitStatus,
    UnitType,
    UnitSourceType,
    UnitValidationResult,
    UnitBatchValidationResponse,
    UnitPropertyRecord,
)
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
