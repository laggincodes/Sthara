"""
Unified Topology & Spatial Conflict Engine Service.

Conforms strictly to STHARA Stage 06 TOPOLOGY:
- Overlap Check (2D positive-area overlap vs valid party-wall touch, 3D vertical/volume clashes)
- Containment (Footprint containment, vertical interval containment, basement/parcel containment)
- Duplicates (Duplicate IDs, Same-ID different geometry, Duplicate geometry with distinct IDs)

Covers the full cadastral hierarchy:
PARCEL -> BUILDING -> FLOOR -> UNIT -> PROPERTY_VOLUME -> UNDERGROUND

Backend remains authoritative for geometry. No silent repairs or clippings.
"""

from collections import defaultdict
import copy
import logging
import math
from typing import Any, Dict, List, Optional, Set, Tuple
from shapely.geometry import shape, mapping, MultiPolygon, Polygon
from shapely.validation import explain_validity

from app.schemas.topology import (
    TopologyStatus,
    TopologySeverity,
    TopologyCheckType,
    TopologyConflictType,
    EntityType,
    TopologyTolerances,
    TopologyCheckRecord,
    TopologyConflictRecord,
    TopologySummary,
    TopologyValidationRequest,
    TopologyValidationResponse,
    DemoTopologyResponse,
)
from app.schemas.geometry_3d import Mesh3D
from app.services.extrusion_service import ExtrusionService

logger = logging.getLogger(__name__)


class TopologyService:
    """
    Consolidated, deterministic, tolerance-aware spatial topology and conflict engine.
    """

    DEFAULT_TOLERANCES = TopologyTolerances()

    # -------------------------------------------------------------------------
    # Helper: Extract standardized entity representation from GeoJSON / Dict
    # -------------------------------------------------------------------------
    @classmethod
    def extract_features(cls, data: Any, default_type: EntityType) -> List[Dict[str, Any]]:
        """
        Normalize incoming GeoJSON FeatureCollection, Feature list, or plain dicts
        into a consistent list of items with keys: 'id', 'geometry', 'properties', 'type'.
        """
        if not data:
            return []

        features: List[Dict[str, Any]] = []

        if isinstance(data, dict):
            if data.get("type") == "FeatureCollection" and "features" in data:
                raw_items = data.get("features", [])
            elif data.get("type") == "Feature":
                raw_items = [data]
            else:
                raw_items = [data]
        elif isinstance(data, list):
            raw_items = data
        else:
            return []

        for idx, item in enumerate(raw_items):
            if not isinstance(item, dict):
                continue

            # Tier-specific identifier extraction
            tier_id = None
            if default_type == EntityType.UNIT:
                tier_id = item.get("unit_id") or (item.get("properties", {}).get("unit_id") if isinstance(item.get("properties"), dict) else None)
            elif default_type == EntityType.FLOOR:
                tier_id = item.get("floor_id") or (item.get("properties", {}).get("floor_id") if isinstance(item.get("properties"), dict) else None)
            elif default_type == EntityType.BUILDING:
                tier_id = item.get("building_id") or (item.get("properties", {}).get("building_id") if isinstance(item.get("properties"), dict) else None)
            elif default_type == EntityType.PARCEL:
                tier_id = item.get("parcel_id") or (item.get("properties", {}).get("parcel_id") if isinstance(item.get("properties"), dict) else None)
            elif default_type == EntityType.UNDERGROUND:
                tier_id = item.get("underground_feature_id") or (item.get("properties", {}).get("underground_feature_id") if isinstance(item.get("properties"), dict) else None)

            feat_id = (
                item.get("id")
                or tier_id
                or item.get("unit_id")
                or item.get("floor_id")
                or item.get("underground_feature_id")
                or item.get("building_id")
                or item.get("parcel_id")
                or (item.get("properties", {}).get("id") if isinstance(item.get("properties"), dict) else None)
                or (item.get("properties", {}).get("unit_id") if isinstance(item.get("properties"), dict) else None)
                or (item.get("properties", {}).get("floor_id") if isinstance(item.get("properties"), dict) else None)
                or (item.get("properties", {}).get("underground_feature_id") if isinstance(item.get("properties"), dict) else None)
                or (item.get("properties", {}).get("building_id") if isinstance(item.get("properties"), dict) else None)
                or (item.get("properties", {}).get("parcel_id") if isinstance(item.get("properties"), dict) else None)
                or f"{default_type.value}-{idx + 1:03d}"
            )

            geom = item.get("geometry") or item.get("geometry_2d") or item.get("footprint_geometry")
            props = item.get("properties") or {}
            if not isinstance(props, dict):
                props = {}

            # Elevational fields if present
            base_z = item.get("base_elevation") or item.get("base_elevation_m") or props.get("base_elevation")
            top_z = item.get("top_elevation") or item.get("top_elevation_m") or props.get("top_elevation")

            features.append({
                "id": str(feat_id).strip(),
                "geometry": geom,
                "properties": props,
                "base_elevation": float(base_z) if base_z is not None else None,
                "top_elevation": float(top_z) if top_z is not None else None,
                "mesh_3d": item.get("mesh_3d"),
                "raw": item,
            })

        # Ensure deterministic ordering by entity ID
        return sorted(features, key=lambda f: f["id"])

    # -------------------------------------------------------------------------
    # 1. Duplicates Detection (ID, Geometry, Same-ID Different Geometry)
    # -------------------------------------------------------------------------
    @classmethod
    def check_duplicates(
        cls,
        entities: List[Dict[str, Any]],
        entity_type: EntityType,
        tolerances: TopologyTolerances,
    ) -> Tuple[List[TopologyCheckRecord], List[TopologyConflictRecord]]:
        checks: List[TopologyCheckRecord] = []
        conflicts: List[TopologyConflictRecord] = []

        id_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for ent in entities:
            id_groups[ent["id"]].append(ent)

        # 1A. Check duplicate IDs
        sorted_ids = sorted(id_groups.keys())
        for ent_id in sorted_ids:
            group = id_groups[ent_id]
            if len(group) > 1:
                # Multiple features share the same ID
                # Compare geometries across the duplicates
                geoms_equal = True
                first_shape = None
                if group[0].get("geometry"):
                    try:
                        first_shape = shape(group[0]["geometry"])
                    except Exception:
                        first_shape = None

                for sibling in group[1:]:
                    sib_shape = None
                    if sibling.get("geometry"):
                        try:
                            sib_shape = shape(sibling["geometry"])
                        except Exception:
                            sib_shape = None

                    if first_shape and sib_shape:
                        # Tolerance-based Hausdorff equality
                        if not first_shape.equals_exact(sib_shape, tolerances.geometry_equality_tolerance_m):
                            geoms_equal = False
                            break
                    elif first_shape != sib_shape:
                        geoms_equal = False
                        break

                c_type = (
                    TopologyConflictType.DUPLICATE_ID
                    if geoms_equal
                    else TopologyConflictType.SAME_ID_DIFFERENT_GEOMETRY
                )

                conf_id = f"CONF-DUP-ID-{entity_type.value}-{ent_id}"
                conflicts.append(
                    TopologyConflictRecord(
                        conflict_id=conf_id,
                        conflict_type=c_type,
                        severity=TopologySeverity.ERROR,
                        primary_entity_id=ent_id,
                        primary_entity_type=entity_type,
                        description=(
                            f"Duplicate identifier '{ent_id}' encountered {len(group)} times in {entity_type.value} tier. "
                            f"{'Geometries are geometrically identical.' if geoms_equal else 'Geometries differ between instances!'}"
                        ),
                        recommendation="Assign distinct, immutable ULPIN/entity identifiers before spatial registration.",
                    )
                )
                checks.append(
                    TopologyCheckRecord(
                        check_id=f"CHK-DUP-ID-{entity_type.value}-{ent_id}",
                        check_type=TopologyCheckType.DUPLICATE_CHECK,
                        entity_type=entity_type,
                        entity_ids=[ent_id],
                        status=TopologyStatus.CONFLICT,
                        severity=TopologySeverity.ERROR,
                        message=f"Duplicate ID '{ent_id}' with {len(group)} instances.",
                    )
                )
            else:
                checks.append(
                    TopologyCheckRecord(
                        check_id=f"CHK-DUP-ID-{entity_type.value}-{ent_id}",
                        check_type=TopologyCheckType.DUPLICATE_CHECK,
                        entity_type=entity_type,
                        entity_ids=[ent_id],
                        status=TopologyStatus.VALID,
                        severity=TopologySeverity.INFO,
                        message=f"Entity ID '{ent_id}' is unique.",
                    )
                )

        # 1B. Check duplicate geometries across different IDs
        # Pairwise comparison of distinct features with geometries
        valid_geom_entities = []
        for ent in entities:
            if ent.get("geometry"):
                try:
                    s = shape(ent["geometry"])
                    if s.is_valid and not s.is_empty:
                        valid_geom_entities.append((ent["id"], s))
                except Exception:
                    pass

        # Sort for determinism
        valid_geom_entities.sort(key=lambda x: x[0])

        for i in range(len(valid_geom_entities)):
            id_a, shape_a = valid_geom_entities[i]
            for j in range(i + 1, len(valid_geom_entities)):
                id_b, shape_b = valid_geom_entities[j]
                if id_a == id_b:
                    continue  # already caught above

                # Check exact or Hausdorff spatial equivalence
                is_identical = False
                if shape_a.equals_exact(shape_b, tolerances.geometry_equality_tolerance_m):
                    is_identical = True
                else:
                    # Check mutual containment difference
                    diff_a = shape_a.difference(shape_b).area
                    diff_b = shape_b.difference(shape_a).area
                    if diff_a < tolerances.area_tolerance_sqm and diff_b < tolerances.area_tolerance_sqm:
                        is_identical = True

                if is_identical:
                    conf_id = f"CONF-DUP-GEOM-{entity_type.value}-{id_a}-{id_b}"
                    conflicts.append(
                        TopologyConflictRecord(
                            conflict_id=conf_id,
                            conflict_type=TopologyConflictType.DUPLICATE_GEOMETRY,
                            severity=TopologySeverity.ERROR,
                            primary_entity_id=id_a,
                            primary_entity_type=entity_type,
                            secondary_entity_id=id_b,
                            secondary_entity_type=entity_type,
                            description=(
                                f"Entities '{id_a}' and '{id_b}' have distinct IDs but identical spatial footprint geometries "
                                f"(Hausdorff difference < {tolerances.geometry_equality_tolerance_m * 1000}mm)."
                            ),
                            recommendation="Consolidate duplicate geometric definitions or verify coordinate source provenance.",
                        )
                    )
                    checks.append(
                        TopologyCheckRecord(
                            check_id=f"CHK-DUP-GEOM-{entity_type.value}-{id_a}-{id_b}",
                            check_type=TopologyCheckType.DUPLICATE_CHECK,
                            entity_type=entity_type,
                            entity_ids=[id_a, id_b],
                            status=TopologyStatus.CONFLICT,
                            severity=TopologySeverity.ERROR,
                            message=f"Identical geometry between '{id_a}' and '{id_b}'.",
                        )
                    )

        return checks, conflicts

    # -------------------------------------------------------------------------
    # 2. 2D Containment Check (Child within Parent)
    # -------------------------------------------------------------------------
    @classmethod
    def check_containment_2d(
        cls,
        child_id: str,
        child_geom: Any,
        parent_id: str,
        parent_geom: Any,
        child_type: EntityType,
        parent_type: EntityType,
        tolerances: TopologyTolerances,
    ) -> Tuple[TopologyCheckRecord, Optional[TopologyConflictRecord]]:
        check_id = f"CHK-CONT-2D-{child_type.value}-{child_id}-{parent_type.value}-{parent_id}"

        if not child_geom or not parent_geom:
            rec = TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.CONTAINMENT_2D,
                entity_type=child_type,
                entity_ids=[child_id, parent_id],
                status=TopologyStatus.UNAVAILABLE,
                severity=TopologySeverity.INFO,
                message=f"Missing geometry for containment evaluation between '{child_id}' and parent '{parent_id}'.",
            )
            return rec, None

        try:
            c_shape = shape(child_geom)
            p_shape = shape(parent_geom)
        except Exception as e:
            rec = TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.CONTAINMENT_2D,
                entity_type=child_type,
                entity_ids=[child_id, parent_id],
                status=TopologyStatus.WARNING,
                severity=TopologySeverity.WARNING,
                message=f"Failed to parse geometry for containment check: {e}",
            )
            return rec, None

        if not c_shape.is_valid:
            c_shape = c_shape.buffer(0)
        if not p_shape.is_valid:
            p_shape = p_shape.buffer(0)

        # Buffer parent slightly by equality tolerance to avoid false positives on exact boundary alignment
        p_buffered = p_shape.buffer(tolerances.geometry_equality_tolerance_m)

        # Check if completely within
        if p_buffered.contains(c_shape):
            rec = TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.CONTAINMENT_2D,
                entity_type=child_type,
                entity_ids=[child_id, parent_id],
                status=TopologyStatus.VALID,
                severity=TopologySeverity.INFO,
                message=f"{child_type.value} '{child_id}' is completely contained inside {parent_type.value} '{parent_id}'.",
                measured_value=round(c_shape.area, 4),
            )
            return rec, None

        # Check outside encroachment
        diff = c_shape.difference(p_buffered)
        outside_area = round(float(diff.area), 4)

        if outside_area <= tolerances.area_tolerance_sqm:
            # Negligible boundary sliver
            rec = TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.CONTAINMENT_2D,
                entity_type=child_type,
                entity_ids=[child_id, parent_id],
                status=TopologyStatus.VALID,
                severity=TopologySeverity.INFO,
                message=f"{child_type.value} '{child_id}' is within tolerance boundary of parent '{parent_id}'.",
                measured_value=outside_area,
                tolerance_used=tolerances.area_tolerance_sqm,
            )
            return rec, None

        # Determine if partially inside or completely outside
        intersection_area = round(float(c_shape.intersection(p_shape).area), 4)
        is_completely_outside = (intersection_area <= tolerances.area_tolerance_sqm)

        conflict_type = (
            TopologyConflictType.OUTSIDE_PARENT
            if is_completely_outside
            else TopologyConflictType.PARTIAL_CONTAINMENT
        )

        severity = (
            TopologySeverity.ERROR
            if is_completely_outside or child_type == EntityType.UNIT
            else TopologySeverity.WARNING  # e.g. cantilever building overhang past parcel can be warning
        )

        conf_geom = None
        try:
            conf_geom = mapping(diff)
        except Exception:
            pass

        conf = TopologyConflictRecord(
            conflict_id=f"CONF-CONT-{child_type.value}-{child_id}-{parent_type.value}-{parent_id}",
            conflict_type=conflict_type,
            severity=severity,
            primary_entity_id=child_id,
            primary_entity_type=child_type,
            secondary_entity_id=parent_id,
            secondary_entity_type=parent_type,
            description=(
                f"{child_type.value} '{child_id}' {'lies completely outside' if is_completely_outside else 'encroaches outside'} "
                f"parent {parent_type.value} '{parent_id}' by {outside_area} m^2."
            ),
            overlap_metric=outside_area,
            conflict_geometry=conf_geom,
            recommendation=(
                "Re-align child boundary within parent parcel/building footprint. "
                "Automatic silent geometry clipping is prohibited by cadastral protocol."
            ),
        )

        rec = TopologyCheckRecord(
            check_id=check_id,
            check_type=TopologyCheckType.CONTAINMENT_2D,
            entity_type=child_type,
            entity_ids=[child_id, parent_id],
            status=TopologyStatus.CONFLICT if severity == TopologySeverity.ERROR else TopologyStatus.WARNING,
            severity=severity,
            message=f"Encroachment detected: {outside_area} m^2 outside parent '{parent_id}'.",
            measured_value=outside_area,
            tolerance_used=tolerances.area_tolerance_sqm,
        )

        return rec, conf

    # -------------------------------------------------------------------------
    # 3. 2D Non-Overlap Check (Siblings)
    # -------------------------------------------------------------------------
    @classmethod
    def check_overlaps_2d(
        cls,
        entities: List[Dict[str, Any]],
        entity_type: EntityType,
        tolerances: TopologyTolerances,
    ) -> Tuple[List[TopologyCheckRecord], List[TopologyConflictRecord]]:
        checks: List[TopologyCheckRecord] = []
        conflicts: List[TopologyConflictRecord] = []

        valid_items: List[Tuple[str, Any]] = []
        for ent in entities:
            if ent.get("geometry"):
                try:
                    s = shape(ent["geometry"])
                    if s.is_valid and not s.is_empty:
                        valid_items.append((ent["id"], s))
                except Exception:
                    pass

        # Sort for determinism
        valid_items.sort(key=lambda x: x[0])

        for i in range(len(valid_items)):
            id_a, shape_a = valid_items[i]
            for j in range(i + 1, len(valid_items)):
                id_b, shape_b = valid_items[j]

                check_id = f"CHK-OVL-2D-{entity_type.value}-{id_a}-{id_b}"

                # Bounding box quick rejection
                if not shape_a.envelope.intersects(shape_b.envelope):
                    checks.append(
                        TopologyCheckRecord(
                            check_id=check_id,
                            check_type=TopologyCheckType.OVERLAP_2D,
                            entity_type=entity_type,
                            entity_ids=[id_a, id_b],
                            status=TopologyStatus.VALID,
                            severity=TopologySeverity.INFO,
                            message=f"No spatial intersection between '{id_a}' and '{id_b}'.",
                            measured_value=0.0,
                        )
                    )
                    continue

                # Intersection calculation
                intersection = shape_a.intersection(shape_b)
                if intersection.is_empty:
                    checks.append(
                        TopologyCheckRecord(
                            check_id=check_id,
                            check_type=TopologyCheckType.OVERLAP_2D,
                            entity_type=entity_type,
                            entity_ids=[id_a, id_b],
                            status=TopologyStatus.VALID,
                            severity=TopologySeverity.INFO,
                            message=f"Disjoint geometries for '{id_a}' and '{id_b}'.",
                            measured_value=0.0,
                        )
                    )
                    continue

                inter_area = round(float(intersection.area), 4)

                # Party-wall / boundary contact: touching boundary has area 0 or <= tolerance
                if inter_area <= tolerances.area_tolerance_sqm:
                    checks.append(
                        TopologyCheckRecord(
                            check_id=check_id,
                            check_type=TopologyCheckType.OVERLAP_2D,
                            entity_type=entity_type,
                            entity_ids=[id_a, id_b],
                            status=TopologyStatus.VALID,
                            severity=TopologySeverity.INFO,
                            message=(
                                f"Shared party-wall/boundary contact between '{id_a}' and '{id_b}' "
                                f"(overlap area {inter_area} m^2 within tolerance {tolerances.area_tolerance_sqm} m^2)."
                            ),
                            measured_value=inter_area,
                            tolerance_used=tolerances.area_tolerance_sqm,
                        )
                    )
                else:
                    # Positive area overlap violation
                    conf_geom = None
                    try:
                        conf_geom = mapping(intersection)
                    except Exception:
                        pass

                    conf = TopologyConflictRecord(
                        conflict_id=f"CONF-OVL-2D-{entity_type.value}-{id_a}-{id_b}",
                        conflict_type=TopologyConflictType.POSITIVE_AREA_OVERLAP,
                        severity=TopologySeverity.ERROR,
                        primary_entity_id=id_a,
                        primary_entity_type=entity_type,
                        secondary_entity_id=id_b,
                        secondary_entity_type=entity_type,
                        description=(
                            f"Positive-area overlap of {inter_area} m^2 detected between {entity_type.value} '{id_a}' "
                            f"and '{id_b}'. Sibling features must not occupy overlapping horizontal space."
                        ),
                        overlap_metric=inter_area,
                        conflict_geometry=conf_geom,
                        recommendation="Survey party-wall boundary and resolve overlapping title footprint.",
                    )
                    conflicts.append(conf)

                    checks.append(
                        TopologyCheckRecord(
                            check_id=check_id,
                            check_type=TopologyCheckType.OVERLAP_2D,
                            entity_type=entity_type,
                            entity_ids=[id_a, id_b],
                            status=TopologyStatus.CONFLICT,
                            severity=TopologySeverity.ERROR,
                            message=f"Positive area overlap of {inter_area} m^2 between '{id_a}' and '{id_b}'.",
                            measured_value=inter_area,
                            tolerance_used=tolerances.area_tolerance_sqm,
                        )
                    )

        return checks, conflicts

    # -------------------------------------------------------------------------
    # 4. Vertical Interval Topology (Floor Slabs, Units, Elevation Containment)
    # -------------------------------------------------------------------------
    @classmethod
    def check_vertical_intervals(
        cls,
        child_id: str,
        child_base: Optional[float],
        child_top: Optional[float],
        parent_id: Optional[str],
        parent_base: Optional[float],
        parent_top: Optional[float],
        child_type: EntityType,
        parent_type: Optional[EntityType],
        tolerances: TopologyTolerances,
    ) -> Tuple[TopologyCheckRecord, Optional[TopologyConflictRecord]]:
        check_id = f"CHK-VERT-{child_type.value}-{child_id}"

        if child_base is None or child_top is None:
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.VERTICAL_INTERVAL,
                entity_type=child_type,
                entity_ids=[child_id],
                status=TopologyStatus.UNAVAILABLE,
                severity=TopologySeverity.INFO,
                message=f"Vertical elevation bounds unavailable for {child_type.value} '{child_id}'.",
            ), None

        # 4A. Internal order check
        if child_top <= child_base + tolerances.vertical_elevation_tolerance_m:
            conf = TopologyConflictRecord(
                conflict_id=f"CONF-VERT-INV-{child_type.value}-{child_id}",
                conflict_type=TopologyConflictType.VERTICAL_OVERLAP,
                severity=TopologySeverity.ERROR,
                primary_entity_id=child_id,
                primary_entity_type=child_type,
                description=(
                    f"{child_type.value} '{child_id}' top elevation ({child_top}m) is not strictly greater than "
                    f"base elevation ({child_base}m)."
                ),
                recommendation="Correct floor/unit vertical bounds so top elevation exceeds base elevation.",
            )
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.VERTICAL_INTERVAL,
                entity_type=child_type,
                entity_ids=[child_id],
                status=TopologyStatus.CONFLICT,
                severity=TopologySeverity.ERROR,
                message=f"Inverted or degenerate vertical span: base={child_base}m, top={child_top}m.",
                measured_value=round(child_top - child_base, 3),
            ), conf

        # 4B. Parent vertical containment if parent elevations exist
        if parent_id and parent_base is not None and parent_top is not None:
            p_type = parent_type or EntityType.BUILDING
            # Child must be inside parent vertical span:
            # child_base >= parent_base - tol AND child_top <= parent_top + tol
            tol = tolerances.vertical_elevation_tolerance_m
            outside_bottom = parent_base - child_base
            outside_top = child_top - parent_top

            if outside_bottom > tol or outside_top > tol:
                excess = max(outside_bottom, outside_top)
                conf = TopologyConflictRecord(
                    conflict_id=f"CONF-VERT-EXT-{child_type.value}-{child_id}-{p_type.value}-{parent_id}",
                    conflict_type=TopologyConflictType.VERTICAL_OUTSIDE_PARENT,
                    severity=TopologySeverity.ERROR,
                    primary_entity_id=child_id,
                    primary_entity_type=child_type,
                    secondary_entity_id=parent_id,
                    secondary_entity_type=p_type,
                    description=(
                        f"{child_type.value} '{child_id}' vertical interval [{child_base}m, {child_top}m] "
                        f"extends outside parent {p_type.value} '{parent_id}' span [{parent_base}m, {parent_top}m] "
                        f"by {round(excess, 3)}m."
                    ),
                    overlap_metric=round(excess, 3),
                    recommendation="Ensure unit/floor vertical elevations lie strictly within parent vertical volume.",
                )
                return TopologyCheckRecord(
                    check_id=check_id,
                    check_type=TopologyCheckType.VERTICAL_INTERVAL,
                    entity_type=child_type,
                    entity_ids=[child_id, parent_id],
                    status=TopologyStatus.CONFLICT,
                    severity=TopologySeverity.ERROR,
                    message=f"Vertical span extends {round(excess, 3)}m outside parent '{parent_id}'.",
                    measured_value=round(excess, 3),
                    tolerance_used=tol,
                ), conf

        return TopologyCheckRecord(
            check_id=check_id,
            check_type=TopologyCheckType.VERTICAL_INTERVAL,
            entity_type=child_type,
            entity_ids=[child_id] + ([parent_id] if parent_id else []),
            status=TopologyStatus.VALID,
            severity=TopologySeverity.INFO,
            message=f"Vertical interval [{child_base}m, {child_top}m] is valid.",
            measured_value=round(child_top - child_base, 3),
        ), None

    # -------------------------------------------------------------------------
    # 5. 3D Mesh Integrity Validation (Canonical Geometry Contract v1.0)
    # -------------------------------------------------------------------------
    @classmethod
    def check_mesh_3d(
        cls,
        mesh_dict_or_obj: Any,
        entity_id: str,
        entity_type: EntityType,
    ) -> Tuple[TopologyCheckRecord, Optional[TopologyConflictRecord]]:
        check_id = f"CHK-MESH-{entity_type.value}-{entity_id}"

        if not mesh_dict_or_obj:
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.MESH_3D_INTEGRITY,
                entity_type=entity_type,
                entity_ids=[entity_id],
                status=TopologyStatus.UNAVAILABLE,
                severity=TopologySeverity.INFO,
                message=f"No 3D mesh attached to {entity_type.value} '{entity_id}'.",
            ), None

        # Convert to Mesh3D if dict
        try:
            if isinstance(mesh_dict_or_obj, dict):
                mesh = Mesh3D(**mesh_dict_or_obj)
            elif isinstance(mesh_dict_or_obj, Mesh3D):
                mesh = mesh_dict_or_obj
            else:
                return TopologyCheckRecord(
                    check_id=check_id,
                    check_type=TopologyCheckType.MESH_3D_INTEGRITY,
                    entity_type=entity_type,
                    entity_ids=[entity_id],
                    status=TopologyStatus.WARNING,
                    severity=TopologySeverity.WARNING,
                    message="Unsupported 3D mesh object format.",
                ), None
        except Exception as e:
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.MESH_3D_INTEGRITY,
                entity_type=entity_type,
                entity_ids=[entity_id],
                status=TopologyStatus.WARNING,
                severity=TopologySeverity.WARNING,
                message=f"Failed to instantiate Mesh3D: {e}",
            ), None

        # Audit using authoritative ExtrusionService.validate_mesh
        audit = ExtrusionService.validate_mesh(mesh)

        if audit.valid:
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.MESH_3D_INTEGRITY,
                entity_type=entity_type,
                entity_ids=[entity_id],
                status=TopologyStatus.VALID,
                severity=TopologySeverity.INFO,
                message=(
                    f"Mesh3D satisfies Canonical 3D Geometry Contract v1.0 "
                    f"({len(mesh.vertices)} vertices, {len(mesh.faces)} faces, watertight 2-manifold)."
                ),
            ), None
        else:
            first_err = audit.errors[0] if audit.errors else "Unknown mesh validation error"
            conf = TopologyConflictRecord(
                conflict_id=f"CONF-MESH-{entity_type.value}-{entity_id}",
                conflict_type=TopologyConflictType.INVALID_MESH,
                severity=TopologySeverity.ERROR,
                primary_entity_id=entity_id,
                primary_entity_type=entity_type,
                description=(
                    f"Mesh3D for {entity_type.value} '{entity_id}' violates Canonical 3D Geometry Contract v1.0: {first_err}"
                ),
                recommendation="Regenerate solid extrusion ensuring counter-clockwise face winding and watertight 2-manifold closure.",
            )
            return TopologyCheckRecord(
                check_id=check_id,
                check_type=TopologyCheckType.MESH_3D_INTEGRITY,
                entity_type=entity_type,
                entity_ids=[entity_id],
                status=TopologyStatus.CONFLICT,
                severity=TopologySeverity.ERROR,
                message=f"Mesh3D invalid: {first_err}",
            ), conf

    # -------------------------------------------------------------------------
    # 6. Underground Clashes & Proximity Buffer Clearance
    # -------------------------------------------------------------------------
    @classmethod
    def check_underground_features(
        cls,
        underground_features: List[Dict[str, Any]],
        parcels: List[Dict[str, Any]],
        tolerances: TopologyTolerances,
    ) -> Tuple[List[TopologyCheckRecord], List[TopologyConflictRecord]]:
        checks: List[TopologyCheckRecord] = []
        conflicts: List[TopologyConflictRecord] = []

        parcel_map = {p["id"]: p for p in parcels}

        # 6A. Containment within registered parcel
        for feat in underground_features:
            f_id = feat["id"]
            p_id = feat.get("raw", {}).get("parcel_id") or feat.get("properties", {}).get("parcel_id")

            if p_id and p_id in parcel_map:
                parent_p = parcel_map[p_id]
                c_rec, c_conf = cls.check_containment_2d(
                    child_id=f_id,
                    child_geom=feat.get("geometry"),
                    parent_id=p_id,
                    parent_geom=parent_p.get("geometry"),
                    child_type=EntityType.UNDERGROUND,
                    parent_type=EntityType.PARCEL,
                    tolerances=tolerances,
                )
                checks.append(c_rec)
                if c_conf:
                    conflicts.append(c_conf)

        # 6B. Pairwise 3D clash and proximity buffer between underground assets
        sorted_feats = sorted(underground_features, key=lambda x: x["id"])
        for i in range(len(sorted_feats)):
            feat_a = sorted_feats[i]
            shape_a = None
            if feat_a.get("geometry"):
                try:
                    s = shape(feat_a["geometry"])
                    if s.is_valid and not s.is_empty:
                        shape_a = s
                except Exception:
                    pass

            for j in range(i + 1, len(sorted_feats)):
                feat_b = sorted_feats[j]
                shape_b = None
                if feat_b.get("geometry"):
                    try:
                        s = shape(feat_b["geometry"])
                        if s.is_valid and not s.is_empty:
                            shape_b = s
                    except Exception:
                        pass

                check_id = f"CHK-UND-CLASH-{feat_a['id']}-{feat_b['id']}"

                if not shape_a or not shape_b:
                    continue

                if not shape_a.intersects(shape_b):
                    checks.append(
                        TopologyCheckRecord(
                            check_id=check_id,
                            check_type=TopologyCheckType.UNDERGROUND_CLASH,
                            entity_type=EntityType.UNDERGROUND,
                            entity_ids=[feat_a["id"], feat_b["id"]],
                            status=TopologyStatus.VALID,
                            severity=TopologySeverity.INFO,
                            message=f"No horizontal intersection between subsurface features '{feat_a['id']}' and '{feat_b['id']}'.",
                            measured_value=0.0,
                        )
                    )
                    continue

                inter_2d = shape_a.intersection(shape_b)
                if inter_2d.area <= tolerances.area_tolerance_sqm:
                    continue

                # Check vertical elevations
                base_a = feat_a.get("base_elevation")
                top_a = feat_a.get("top_elevation")
                base_b = feat_b.get("base_elevation")
                top_b = feat_b.get("top_elevation")

                if base_a is None or top_a is None or base_b is None or top_b is None:
                    continue

                # Vertical overlap: min(top) - max(base)
                vert_overlap = min(top_a, top_b) - max(base_a, base_b)

                # Check feature types for utility penetration allowance
                type_a = (feat_a.get("raw", {}).get("feature_type") or feat_a.get("properties", {}).get("feature_type", "")).upper()
                type_b = (feat_b.get("raw", {}).get("feature_type") or feat_b.get("properties", {}).get("feature_type", "")).upper()
                is_utility_penetration = (
                    ("BASEMENT" in type_a and "UTILITY" in type_b) or
                    ("UTILITY" in type_a and "BASEMENT" in type_b)
                )

                if vert_overlap > tolerances.vertical_elevation_tolerance_m:
                    # True 3D clash
                    if is_utility_penetration:
                        checks.append(
                            TopologyCheckRecord(
                                check_id=check_id,
                                check_type=TopologyCheckType.UNDERGROUND_CLASH,
                                entity_type=EntityType.UNDERGROUND,
                                entity_ids=[feat_a["id"], feat_b["id"]],
                                status=TopologyStatus.VALID,
                                severity=TopologySeverity.INFO,
                                message=f"Permitted utility entry penetration between '{feat_a['id']}' and '{feat_b['id']}'.",
                                measured_value=round(vert_overlap, 3),
                            )
                        )
                    else:
                        conf = TopologyConflictRecord(
                            conflict_id=f"CONF-UND-CLASH-{feat_a['id']}-{feat_b['id']}",
                            conflict_type=TopologyConflictType.POSITIVE_VOLUME_OVERLAP,
                            severity=TopologySeverity.ERROR,
                            primary_entity_id=feat_a["id"],
                            primary_entity_type=EntityType.UNDERGROUND,
                            secondary_entity_id=feat_b["id"],
                            secondary_entity_type=EntityType.UNDERGROUND,
                            description=(
                                f"Direct 3D physical subsurface collision detected between '{feat_a['id']}' and '{feat_b['id']}' "
                                f"(vertical overlap depth {round(vert_overlap, 3)}m over {round(inter_2d.area, 3)} m^2)."
                            ),
                            overlap_metric=round(vert_overlap, 3),
                            recommendation="Critical 3D clash: Reroute utility corridor or revise basement excavation perimeter.",
                        )
                        conflicts.append(conf)
                        checks.append(
                            TopologyCheckRecord(
                                check_id=check_id,
                                check_type=TopologyCheckType.UNDERGROUND_CLASH,
                                entity_type=EntityType.UNDERGROUND,
                                entity_ids=[feat_a["id"], feat_b["id"]],
                                status=TopologyStatus.CONFLICT,
                                severity=TopologySeverity.ERROR,
                                message=f"3D collision detected: {round(vert_overlap, 3)}m overlap.",
                                measured_value=round(vert_overlap, 3),
                            )
                        )
                else:
                    # Safe or proximity check
                    clearance = (base_a - top_b) if base_a >= top_b else (base_b - top_a)
                    if clearance < tolerances.underground_clearance_threshold_m:
                        conf = TopologyConflictRecord(
                            conflict_id=f"CONF-UND-PROX-{feat_a['id']}-{feat_b['id']}",
                            conflict_type=TopologyConflictType.PARTIAL_CONTAINMENT,
                            severity=TopologySeverity.WARNING,
                            primary_entity_id=feat_a["id"],
                            primary_entity_type=EntityType.UNDERGROUND,
                            secondary_entity_id=feat_b["id"],
                            secondary_entity_type=EntityType.UNDERGROUND,
                            description=(
                                f"Subsurface proximity clearance warning: vertical separation is {round(clearance, 2)}m, "
                                f"below the required {tolerances.underground_clearance_threshold_m}m safety buffer."
                            ),
                            overlap_metric=round(clearance, 3),
                            recommendation="Conduct structural excavation review for close proximity utility sleeve.",
                        )
                        conflicts.append(conf)
                        checks.append(
                            TopologyCheckRecord(
                                check_id=check_id,
                                check_type=TopologyCheckType.UNDERGROUND_CLASH,
                                entity_type=EntityType.UNDERGROUND,
                                entity_ids=[feat_a["id"], feat_b["id"]],
                                status=TopologyStatus.WARNING,
                                severity=TopologySeverity.WARNING,
                                message=f"Proximity buffer warning: {round(clearance, 2)}m clearance < {tolerances.underground_clearance_threshold_m}m threshold.",
                                measured_value=round(clearance, 3),
                                tolerance_used=tolerances.underground_clearance_threshold_m,
                            )
                        )
                    else:
                        checks.append(
                            TopologyCheckRecord(
                                check_id=check_id,
                                check_type=TopologyCheckType.UNDERGROUND_CLASH,
                                entity_type=EntityType.UNDERGROUND,
                                entity_ids=[feat_a["id"], feat_b["id"]],
                                status=TopologyStatus.VALID,
                                severity=TopologySeverity.INFO,
                                message=f"Safe vertical separation ({round(clearance, 2)}m) between '{feat_a['id']}' and '{feat_b['id']}'.",
                                measured_value=round(clearance, 3),
                            )
                        )

        return checks, conflicts

    # -------------------------------------------------------------------------
    # 7. Hierarchy Reference Integrity (Foreign Key Cross-Check)
    # -------------------------------------------------------------------------
    @classmethod
    def check_hierarchy_integrity(
        cls,
        parcels: List[Dict[str, Any]],
        buildings: List[Dict[str, Any]],
        floors: List[Dict[str, Any]],
        units: List[Dict[str, Any]],
    ) -> Tuple[List[TopologyCheckRecord], List[TopologyConflictRecord]]:
        checks: List[TopologyCheckRecord] = []
        conflicts: List[TopologyConflictRecord] = []

        parcel_ids = {p["id"] for p in parcels}
        building_ids = {b["id"] for b in buildings}
        floor_ids = {f["id"] for f in floors}

        # Check Building -> Parcel
        for b in buildings:
            p_ref = b.get("raw", {}).get("parcel_id") or b.get("properties", {}).get("parcel_id")
            check_id = f"CHK-HIER-BLD-{b['id']}"
            if p_ref and parcel_ids and p_ref not in parcel_ids:
                conf = TopologyConflictRecord(
                    conflict_id=f"CONF-HIER-BLD-{b['id']}",
                    conflict_type=TopologyConflictType.MISSING_REFERENCE,
                    severity=TopologySeverity.ERROR,
                    primary_entity_id=b["id"],
                    primary_entity_type=EntityType.BUILDING,
                    description=f"Building '{b['id']}' references non-existent parent parcel '{p_ref}'.",
                    recommendation="Link building to a valid, registered parcel identifier.",
                )
                conflicts.append(conf)
                checks.append(
                    TopologyCheckRecord(
                        check_id=check_id,
                        check_type=TopologyCheckType.HIERARCHY_INTEGRITY,
                        entity_type=EntityType.BUILDING,
                        entity_ids=[b["id"]],
                        status=TopologyStatus.CONFLICT,
                        severity=TopologySeverity.ERROR,
                        message=f"Missing parent parcel reference '{p_ref}'.",
                    )
                )

        # Check Floor -> Building
        for fl in floors:
            b_ref = fl.get("raw", {}).get("building_id") or fl.get("properties", {}).get("building_id")
            check_id = f"CHK-HIER-FL-{fl['id']}"
            if b_ref and building_ids and b_ref not in building_ids:
                conf = TopologyConflictRecord(
                    conflict_id=f"CONF-HIER-FL-{fl['id']}",
                    conflict_type=TopologyConflictType.MISSING_REFERENCE,
                    severity=TopologySeverity.ERROR,
                    primary_entity_id=fl["id"],
                    primary_entity_type=EntityType.FLOOR,
                    description=f"Floor '{fl['id']}' references non-existent parent building '{b_ref}'.",
                    recommendation="Link floor to a valid registered building identifier.",
                )
                conflicts.append(conf)
                checks.append(
                    TopologyCheckRecord(
                        check_id=check_id,
                        check_type=TopologyCheckType.HIERARCHY_INTEGRITY,
                        entity_type=EntityType.FLOOR,
                        entity_ids=[fl["id"]],
                        status=TopologyStatus.CONFLICT,
                        severity=TopologySeverity.ERROR,
                        message=f"Missing parent building reference '{b_ref}'.",
                    )
                )

        # Check Unit -> Floor & Building & Parcel
        for u in units:
            fl_ref = u.get("raw", {}).get("floor_id") or u.get("properties", {}).get("floor_id")
            b_ref = u.get("raw", {}).get("building_id") or u.get("properties", {}).get("building_id")
            check_id = f"CHK-HIER-UNIT-{u['id']}"

            missing_refs = []
            if fl_ref and floor_ids and fl_ref not in floor_ids:
                missing_refs.append(f"floor '{fl_ref}'")
            if b_ref and building_ids and b_ref not in building_ids:
                missing_refs.append(f"building '{b_ref}'")

            if missing_refs:
                conf = TopologyConflictRecord(
                    conflict_id=f"CONF-HIER-UNIT-{u['id']}",
                    conflict_type=TopologyConflictType.MISSING_REFERENCE,
                    severity=TopologySeverity.ERROR,
                    primary_entity_id=u["id"],
                    primary_entity_type=EntityType.UNIT,
                    description=f"Unit '{u['id']}' references non-existent parent entity: {', '.join(missing_refs)}.",
                    recommendation="Ensure complete hierarchical parent chain: Parcel -> Building -> Floor -> Unit.",
                )
                conflicts.append(conf)
                checks.append(
                    TopologyCheckRecord(
                        check_id=check_id,
                        check_type=TopologyCheckType.HIERARCHY_INTEGRITY,
                        entity_type=EntityType.UNIT,
                        entity_ids=[u["id"]],
                        status=TopologyStatus.CONFLICT,
                        severity=TopologySeverity.ERROR,
                        message=f"Unresolved parent reference(s): {', '.join(missing_refs)}.",
                    )
                )
            else:
                checks.append(
                    TopologyCheckRecord(
                        check_id=check_id,
                        check_type=TopologyCheckType.HIERARCHY_INTEGRITY,
                        entity_type=EntityType.UNIT,
                        entity_ids=[u["id"]],
                        status=TopologyStatus.VALID,
                        severity=TopologySeverity.INFO,
                        message=f"Unit '{u['id']}' parent hierarchy is complete and verified.",
                    )
                )

        return checks, conflicts

    # -------------------------------------------------------------------------
    # 8. Full Orchestration Pipeline
    # -------------------------------------------------------------------------
    @classmethod
    def validate_full_topology(
        cls, request: TopologyValidationRequest
    ) -> TopologyValidationResponse:
        """
        Orchestrates the entire end-to-end topology audit across all cadastral tiers.
        Guarantees deterministic ordering and strict non-destructive conflict reporting.
        """
        tolerances = request.tolerances or cls.DEFAULT_TOLERANCES

        # 1. Standardize features
        parcels = cls.extract_features(request.parcels, EntityType.PARCEL)
        buildings = cls.extract_features(request.buildings, EntityType.BUILDING)
        floors = cls.extract_features(request.floors, EntityType.FLOOR)
        units = cls.extract_features(request.units, EntityType.UNIT)
        property_vols = cls.extract_features(request.property_volumes, EntityType.PROPERTY_VOLUME)
        underground = cls.extract_features(request.underground_features, EntityType.UNDERGROUND)

        all_checks: List[TopologyCheckRecord] = []
        all_conflicts: List[TopologyConflictRecord] = []

        # 2. Duplicate checks across all tiers
        for tier_ents, tier_type in [
            (parcels, EntityType.PARCEL),
            (buildings, EntityType.BUILDING),
            (floors, EntityType.FLOOR),
            (units, EntityType.UNIT),
            (property_vols, EntityType.PROPERTY_VOLUME),
            (underground, EntityType.UNDERGROUND),
        ]:
            if tier_ents:
                c_list, f_list = cls.check_duplicates(tier_ents, tier_type, tolerances)
                all_checks.extend(c_list)
                all_conflicts.extend(f_list)

        # 3. 2D Horizontal Overlap checks across sibling tiers
        # Sibling parcels must not overlap (party walls touch)
        if parcels:
            c_list, f_list = cls.check_overlaps_2d(parcels, EntityType.PARCEL, tolerances)
            all_checks.extend(c_list)
            all_conflicts.extend(f_list)

        # Sibling buildings
        if buildings:
            c_list, f_list = cls.check_overlaps_2d(buildings, EntityType.BUILDING, tolerances)
            all_checks.extend(c_list)
            all_conflicts.extend(f_list)

        # Sibling units grouped by floor
        units_by_floor: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for u in units:
            fl_id = u.get("raw", {}).get("floor_id") or u.get("properties", {}).get("floor_id") or "UNKNOWN_FLOOR"
            units_by_floor[fl_id].append(u)

        for fl_id in sorted(units_by_floor.keys()):
            fl_units = units_by_floor[fl_id]
            if len(fl_units) > 1:
                c_list, f_list = cls.check_overlaps_2d(fl_units, EntityType.UNIT, tolerances)
                all_checks.extend(c_list)
                all_conflicts.extend(f_list)

        # 4. 2D Containment checks
        # Buildings inside Parcels
        parcel_geom_map = {p["id"]: p.get("geometry") for p in parcels}
        for b in buildings:
            p_id = b.get("raw", {}).get("parcel_id") or b.get("properties", {}).get("parcel_id")
            if p_id and p_id in parcel_geom_map:
                c_rec, c_conf = cls.check_containment_2d(
                    child_id=b["id"],
                    child_geom=b.get("geometry"),
                    parent_id=p_id,
                    parent_geom=parcel_geom_map[p_id],
                    child_type=EntityType.BUILDING,
                    parent_type=EntityType.PARCEL,
                    tolerances=tolerances,
                )
                all_checks.append(c_rec)
                if c_conf:
                    all_conflicts.append(c_conf)

        # Units inside Buildings / Floors
        bld_geom_map = {b["id"]: b.get("geometry") for b in buildings}
        for u in units:
            b_id = u.get("raw", {}).get("building_id") or u.get("properties", {}).get("building_id")
            if b_id and b_id in bld_geom_map:
                c_rec, c_conf = cls.check_containment_2d(
                    child_id=u["id"],
                    child_geom=u.get("geometry"),
                    parent_id=b_id,
                    parent_geom=bld_geom_map[b_id],
                    child_type=EntityType.UNIT,
                    parent_type=EntityType.BUILDING,
                    tolerances=tolerances,
                )
                all_checks.append(c_rec)
                if c_conf:
                    all_conflicts.append(c_conf)

        # 5. Vertical Interval checks for Floors and Units
        fl_elev_map = {
            f["id"]: (f.get("base_elevation"), f.get("top_elevation"), f.get("raw", {}).get("building_id"))
            for f in floors
        }
        bld_elev_map = {
            b["id"]: (b.get("base_elevation"), b.get("top_elevation"))
            for b in buildings
        }

        # Check floor vertical spans against parent building
        for fl in floors:
            b_id = fl.get("raw", {}).get("building_id") or fl.get("properties", {}).get("building_id")
            b_base, b_top = bld_elev_map.get(b_id, (None, None))
            c_rec, c_conf = cls.check_vertical_intervals(
                child_id=fl["id"],
                child_base=fl.get("base_elevation"),
                child_top=fl.get("top_elevation"),
                parent_id=b_id,
                parent_base=b_base,
                parent_top=b_top,
                child_type=EntityType.FLOOR,
                parent_type=EntityType.BUILDING if b_id else None,
                tolerances=tolerances,
            )
            all_checks.append(c_rec)
            if c_conf:
                all_conflicts.append(c_conf)

        # Check unit vertical spans against parent floor
        for u in units:
            fl_id = u.get("raw", {}).get("floor_id") or u.get("properties", {}).get("floor_id")
            f_base, f_top, _ = fl_elev_map.get(fl_id, (None, None, None))
            c_rec, c_conf = cls.check_vertical_intervals(
                child_id=u["id"],
                child_base=u.get("base_elevation"),
                child_top=u.get("top_elevation"),
                parent_id=fl_id,
                parent_base=f_base,
                parent_top=f_top,
                child_type=EntityType.UNIT,
                parent_type=EntityType.FLOOR if fl_id else None,
                tolerances=tolerances,
            )
            all_checks.append(c_rec)
            if c_conf:
                all_conflicts.append(c_conf)

        # 6. 3D Mesh Integrity checks
        for tier_ents, tier_type in [
            (buildings, EntityType.BUILDING),
            (floors, EntityType.FLOOR),
            (units, EntityType.UNIT),
            (property_vols, EntityType.PROPERTY_VOLUME),
            (underground, EntityType.UNDERGROUND),
        ]:
            for ent in tier_ents:
                if ent.get("mesh_3d"):
                    c_rec, c_conf = cls.check_mesh_3d(ent["mesh_3d"], ent["id"], tier_type)
                    all_checks.append(c_rec)
                    if c_conf:
                        all_conflicts.append(c_conf)

        # 7. Underground Clashes & Proximity
        if underground:
            c_list, f_list = cls.check_underground_features(underground, parcels, tolerances)
            all_checks.extend(c_list)
            all_conflicts.extend(f_list)

        # 8. Hierarchy Reference Integrity
        h_checks, h_conflicts = cls.check_hierarchy_integrity(parcels, buildings, floors, units)
        all_checks.extend(h_checks)
        all_conflicts.extend(h_conflicts)

        # 9. Sort checks and conflicts deterministically
        sorted_checks = sorted(all_checks, key=lambda c: c.check_id)
        sorted_conflicts = sorted(all_conflicts, key=lambda f: f.conflict_id)

        # 10. Compute Summary Metrics
        total_checks = len(sorted_checks)
        passed_checks = sum(1 for c in sorted_checks if c.status == TopologyStatus.VALID)
        warning_checks = sum(1 for c in sorted_checks if c.status == TopologyStatus.WARNING)
        conflict_checks = sum(1 for c in sorted_checks if c.status == TopologyStatus.CONFLICT)
        unavailable_checks = sum(1 for c in sorted_checks if c.status == TopologyStatus.UNAVAILABLE)

        dup_cnt = sum(
            1 for f in sorted_conflicts
            if f.conflict_type in (TopologyConflictType.DUPLICATE_ID, TopologyConflictType.DUPLICATE_GEOMETRY, TopologyConflictType.SAME_ID_DIFFERENT_GEOMETRY)
        )
        ovl_cnt = sum(
            1 for f in sorted_conflicts
            if f.conflict_type in (TopologyConflictType.POSITIVE_AREA_OVERLAP, TopologyConflictType.POSITIVE_VOLUME_OVERLAP, TopologyConflictType.VERTICAL_OVERLAP)
        )
        cont_cnt = sum(
            1 for f in sorted_conflicts
            if f.conflict_type in (TopologyConflictType.OUTSIDE_PARENT, TopologyConflictType.PARTIAL_CONTAINMENT, TopologyConflictType.VERTICAL_OUTSIDE_PARENT)
        )
        mesh_cnt = sum(1 for f in sorted_conflicts if f.conflict_type == TopologyConflictType.INVALID_MESH)
        hier_cnt = sum(1 for f in sorted_conflicts if f.conflict_type == TopologyConflictType.MISSING_REFERENCE)

        if conflict_checks > 0:
            overall_status = TopologyStatus.CONFLICT
        elif warning_checks > 0:
            overall_status = TopologyStatus.WARNING
        elif passed_checks > 0:
            overall_status = TopologyStatus.VALID
        else:
            overall_status = TopologyStatus.UNAVAILABLE

        summary = TopologySummary(
            overall_status=overall_status,
            total_checks=total_checks,
            passed_checks=passed_checks,
            warning_checks=warning_checks,
            conflict_checks=conflict_checks,
            unavailable_checks=unavailable_checks,
            duplicates_found=dup_cnt,
            overlaps_found=ovl_cnt,
            containment_violations=cont_cnt,
            mesh_issues_found=mesh_cnt,
            hierarchy_issues_found=hier_cnt,
            tolerances=tolerances,
        )

        return TopologyValidationResponse(
            status="success",
            summary=summary,
            checks=sorted_checks,
            conflicts=sorted_conflicts,
        )

    # -------------------------------------------------------------------------
    # 9. Realistic Demonstration Bundle with Benchmark Scenarios
    # -------------------------------------------------------------------------
    @classmethod
    def get_demo_topology_bundle(cls, scenario: str = "conflict") -> DemoTopologyResponse:
        """
        Creates a rich, multi-tiered demonstration scene featuring:
        - scenario == "valid": Clean party-wall units (Unit 101 & 102), clean floor containment,
          safe underground utility clearance, resulting in 100% VALID status.
        - scenario == "conflict": Deliberate positive-volume encroachment (Unit 103 encroaches
          into Unit 102 and Unit 101), resulting in CONFLICT status.
        """
        from shapely.geometry import box

        # Metric geometries in UTM Zone 43N
        # Parcel: 200m x 200m
        parcel_geom = mapping(box(775900.0, 1297100.0, 776100.0, 1297300.0))
        # Building: 80m x 80m (cleanly centered inside parcel)
        bld_geom = mapping(box(775950.0, 1297150.0, 776030.0, 1297230.0))

        # Unit 101 (West half of floor: X from 775950 to 775990)
        unit101_geom = mapping(box(775950.0, 1297150.0, 775990.0, 1297230.0))
        # Unit 102 (East half of floor: X from 775990 to 776030 -> party-wall contact along X=775990!)
        unit102_geom = mapping(box(775990.0, 1297150.0, 776030.0, 1297230.0))
        # Unit 103 (Deliberate benchmark conflict: encroaches across the party wall)
        unit103_geom = mapping(box(775988.0, 1297180.0, 775992.0, 1297200.0))

        # Underground basement (within parcel, beneath building footprint)
        basement_geom = mapping(box(775945.0, 1297145.0, 776035.0, 1297235.0))
        # Underground utility conduit: safe clearance (> 5m away from basement) in valid mode,
        # or closer in conflict mode
        if scenario.lower() == "valid":
            cable_geom = mapping(box(775910.0, 1297260.0, 776090.0, 1297265.0))
        else:
            # Passes within 0.5m of basement (clearance conflict)
            cable_geom = mapping(box(775910.0, 1297235.5, 776090.0, 1297237.0))

        units_list = [
            {
                "unit_id": "UNIT-101",
                "unit_number": "101",
                "floor_id": "FL-01",
                "building_id": "BLD-TOWER-1",
                "parcel_id": "DEMO-PARCEL-401-1",
                "base_elevation": 562.5,
                "top_elevation": 565.5,
                "geometry": unit101_geom,
            },
            {
                "unit_id": "UNIT-102",
                "unit_number": "102",
                "floor_id": "FL-01",
                "building_id": "BLD-TOWER-1",
                "parcel_id": "DEMO-PARCEL-401-1",
                "base_elevation": 562.5,
                "top_elevation": 565.5,
                "geometry": unit102_geom,
            },
        ]
        if scenario.lower() in ["conflict", "invalid"]:
            units_list.append({
                "unit_id": "UNIT-103",
                "unit_number": "103-CONFLICT",
                "floor_id": "FL-01",
                "building_id": "BLD-TOWER-1",
                "parcel_id": "DEMO-PARCEL-401-1",
                "base_elevation": 562.5,
                "top_elevation": 565.5,
                "geometry": unit103_geom,
            })

        demo_req = TopologyValidationRequest(
            parcels={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": "DEMO-PARCEL-401-1",
                        "geometry": parcel_geom,
                        "properties": {"parcel_id": "DEMO-PARCEL-401-1", "area_sqm": 40000.0},
                    }
                ],
            },
            buildings={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": "BLD-TOWER-1",
                        "geometry": bld_geom,
                        "properties": {
                            "building_id": "BLD-TOWER-1",
                            "parcel_id": "DEMO-PARCEL-401-1",
                            "base_elevation": 562.5,
                            "top_elevation": 592.5,
                        },
                    }
                ],
            },
            floors=[
                {
                    "floor_id": "FL-01",
                    "building_id": "BLD-TOWER-1",
                    "floor_index": 1,
                    "base_elevation": 562.5,
                    "top_elevation": 565.5,
                },
                {
                    "floor_id": "FL-02",
                    "building_id": "BLD-TOWER-1",
                    "floor_index": 2,
                    "base_elevation": 565.5,
                    "top_elevation": 568.5,
                },
            ],
            units=units_list,
            underground_features=[
                {
                    "underground_feature_id": "UND-BASEMENT-B1",
                    "feature_type": "BASEMENT",
                    "parcel_id": "DEMO-PARCEL-401-1",
                    "building_id": "BLD-TOWER-1",
                    "base_elevation": 556.5,
                    "top_elevation": 562.5,
                    "geometry": basement_geom,
                },
                {
                    "underground_feature_id": "UND-UTIL-CABLE-01",
                    "feature_type": "UNDERGROUND_UTILITY",
                    "parcel_id": "DEMO-PARCEL-401-1",
                    "base_elevation": 561.0,
                    "top_elevation": 561.8,
                    "geometry": cable_geom,
                },
            ],
        )

        validation_result = cls.validate_full_topology(demo_req)

        return DemoTopologyResponse(
            status="success",
            scenario_description=f"Tower 1 Cadastral Multi-Tier Topology ({scenario.upper()} SCENARIO)",
            entities={
                "parcels": demo_req.parcels,
                "buildings": demo_req.buildings,
                "floors": demo_req.floors,
                "units": demo_req.units,
                "underground_features": demo_req.underground_features,
            },
            validation_result=validation_result,
        )
