"""
Underground & Subsurface Spatial Modeling Service (Step 20).

Key Architectural Foundations:
1. Canonical 3D Geometry Contract v1.0: Subsurface solids (basements, utilities)
   are generated as watertight, 2-manifold closed Mesh3D solids via ExtrusionService.
2. Vertical Elevation Convention: Strict Z-up system (Z_base < Z_top <= Z_ground).
   Depths are derived relative to reference ground:
       depth_to_top = ground - top
       depth_to_base = ground - base
3. Subsurface Semantics:
   - BASEMENT: Subterranean building stratum; can be part of property volume.
   - UNDERGROUND_UTILITY: Infrastructure corridor; NOT a property volume.
   - SUBSURFACE_VOLUME: Generic 3D subterranean entity.
4. Conflict Classification: Evaluates 3D spatial clashes (Allowed Intersection,
   Review Required, Invalid Overlap) without mutating source geometry.
"""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple

import pyproj
from shapely.geometry import Polygon, MultiPolygon, LineString, shape, mapping
from shapely.ops import transform
from shapely.validation import explain_validity

from app.schemas.geometry_3d import (
    Geometry3DStatus,
    FeatureType,
    Mesh3D,
    Mesh3DCollection,
)
from app.schemas.underground import (
    UndergroundFeatureType,
    UtilityType,
    UndergroundConflictClass,
    UndergroundSpatialStatus,
    UndergroundProvenance,
    UndergroundFeature,
    UndergroundValidationRequest,
    UndergroundValidationResponse,
    Underground3DRequest,
    Underground3DResult,
    GenerateUnderground3DResponse,
    UndergroundConflictRecord,
    UndergroundConflictRequest,
    UndergroundConflictResponse,
    DemoUndergroundResponse,
)
from app.services.extrusion_service import ExtrusionService


class UndergroundService:
    """Core domain service for subsurface spatial modeling, 3D solids, and clash audits."""

    DEFAULT_CRS = "EPSG:32643"
    DEFAULT_SOURCE_CRS = "EPSG:4326"

    # -------------------------------------------------------------------------
    # 1. Depth & Elevation Derivation
    # -------------------------------------------------------------------------
    @staticmethod
    def derive_depths(
        ground_elevation_m: float,
        top_elevation_m: float,
        base_elevation_m: float,
    ) -> Tuple[float, float, float, List[str]]:
        """
        Derive depths relative to ground reference and validate vertical order.
        Returns (depth_to_top_m, depth_to_base_m, thickness_m, warnings).
        """
        warnings: List[str] = []

        if base_elevation_m >= top_elevation_m:
            raise ValueError(
                f"Invalid vertical bounds: base_elevation_m ({base_elevation_m}m) "
                f"must be strictly less than top_elevation_m ({top_elevation_m}m)."
            )

        depth_to_top = round(max(0.0, ground_elevation_m - top_elevation_m), 3)
        depth_to_base = round(max(0.0, ground_elevation_m - base_elevation_m), 3)
        thickness = round(top_elevation_m - base_elevation_m, 3)

        if top_elevation_m > ground_elevation_m + 0.01:
            warnings.append(
                f"Feature top ({top_elevation_m}m) extends {round(top_elevation_m - ground_elevation_m, 2)}m "
                f"above reference ground ({ground_elevation_m}m). Subsurface feature partially daylighted."
            )

        return depth_to_top, depth_to_base, thickness, warnings

    # -------------------------------------------------------------------------
    # 2. Canonical 3D Extrusion
    # -------------------------------------------------------------------------
    def generate_underground_3d(self, request: Underground3DRequest) -> Underground3DResult:
        """
        Extrude 2D footprint or corridor buffer into a closed watertight 3D Mesh3D solid.
        Conforms strictly to the Canonical 3D Geometry Contract v1.0.
        """
        errors: List[str] = []
        warnings: List[str] = []

        try:
            depth_to_top, depth_to_base, thickness, depth_warnings = self.derive_depths(
                ground_elevation_m=request.ground_elevation_m,
                top_elevation_m=request.top_elevation_m,
                base_elevation_m=request.base_elevation_m,
            )
            warnings.extend(depth_warnings)
        except ValueError as err:
            return Underground3DResult(
                underground_feature_id=request.underground_feature_id,
                feature_type=request.feature_type,
                geometry_status=Geometry3DStatus.INVALID,
                mesh_3d=None,
                volume_cubic_m=0.0,
                depth_to_top_m=0.0,
                depth_to_base_m=0.0,
                errors=[str(err)],
            )

        # Parse geometry
        try:
            geom_raw = shape(request.footprint_geometry)
            if isinstance(geom_raw, LineString):
                buffer_dist = request.corridor_buffer_m if request.corridor_buffer_m and request.corridor_buffer_m > 0 else 1.0
                poly = geom_raw.buffer(buffer_dist)
            elif isinstance(geom_raw, Polygon):
                poly = geom_raw
            elif isinstance(geom_raw, MultiPolygon):
                poly = geom_raw
            else:
                return Underground3DResult(
                    underground_feature_id=request.underground_feature_id,
                    feature_type=request.feature_type,
                    geometry_status=Geometry3DStatus.INVALID,
                    depth_to_top_m=depth_to_top,
                    depth_to_base_m=depth_to_base,
                    errors=[f"Unsupported geometry type '{geom_raw.geom_type}' for subsurface extrusion."],
                )

            if not poly.is_valid:
                poly = poly.buffer(0)

            # Reproject if source CRS differs and coordinates are geographic degrees
            if request.source_crs and request.source_crs != request.target_crs:
                b = poly.bounds
                if abs(b[0]) <= 180 and abs(b[1]) <= 90:
                    transformer = pyproj.Transformer.from_crs(
                        request.source_crs, request.target_crs, always_xy=True
                    )
                    poly = transform(transformer.transform, poly)

        except Exception as e:
            return Underground3DResult(
                underground_feature_id=request.underground_feature_id,
                feature_type=request.feature_type,
                geometry_status=Geometry3DStatus.INVALID,
                depth_to_top_m=depth_to_top,
                depth_to_base_m=depth_to_base,
                errors=[f"Failed to process footprint geometry: {e}"],
            )

        # Extrude solid via canonical ExtrusionService._extrude_single_polygon
        try:
            polys: List[Polygon] = (
                list(poly.geoms) if isinstance(poly, MultiPolygon) else [poly]
            )
            bnds = poly.bounds
            origin = (round(bnds[0], 2), round(bnds[1], 2), 0.0)

            parts: List[Mesh3D] = []
            total_vol = 0.0

            for idx, p in enumerate(polys):
                if p.area < 1e-4:
                    continue
                part_id = (
                    f"{request.underground_feature_id}_part_{idx+1}"
                    if len(polys) > 1
                    else request.underground_feature_id
                )
                mesh_part = ExtrusionService._extrude_single_polygon(
                    poly=p,
                    base_z=request.base_elevation_m,
                    top_z=request.top_elevation_m,
                    origin=origin,
                    feature_id=part_id,
                    horizontal_crs=request.target_crs,
                    source_crs=request.source_crs,
                    vertical_ref="EGM2008 / AMSL",
                    feature_type=FeatureType.UNDERGROUND,
                )
                val_res = ExtrusionService.validate_mesh(mesh_part)
                if not val_res.valid:
                    return Underground3DResult(
                        underground_feature_id=request.underground_feature_id,
                        feature_type=request.feature_type,
                        geometry_status=Geometry3DStatus.INVALID,
                        depth_to_top_m=depth_to_top,
                        depth_to_base_m=depth_to_base,
                        errors=val_res.errors,
                        warnings=val_res.warnings,
                    )
                parts.append(mesh_part)
                total_vol += (mesh_part.volume_cubic_m or 0.0)
                warnings.extend(val_res.warnings)

            if not parts:
                return Underground3DResult(
                    underground_feature_id=request.underground_feature_id,
                    feature_type=request.feature_type,
                    geometry_status=Geometry3DStatus.INVALID,
                    depth_to_top_m=depth_to_top,
                    depth_to_base_m=depth_to_base,
                    errors=["Zero valid polygon parts extruded for underground feature."],
                )

            final_mesh = parts[0] if len(parts) == 1 else Mesh3DCollection(
                feature_id=request.underground_feature_id,
                feature_type=FeatureType.UNDERGROUND,
                parts=parts,
            )

            return Underground3DResult(
                underground_feature_id=request.underground_feature_id,
                feature_type=request.feature_type,
                geometry_status=Geometry3DStatus.VALID,
                mesh_3d=final_mesh,
                volume_cubic_m=round(total_vol, 3),
                depth_to_top_m=depth_to_top,
                depth_to_base_m=depth_to_base,
                warnings=warnings,
            )

        except Exception as e:
            return Underground3DResult(
                underground_feature_id=request.underground_feature_id,
                feature_type=request.feature_type,
                geometry_status=Geometry3DStatus.INVALID,
                depth_to_top_m=depth_to_top,
                depth_to_base_m=depth_to_base,
                errors=[f"Subsurface 3D extrusion failed: {e}"],
            )

    def generate_underground_3d_batch(
        self, requests: List[Underground3DRequest]
    ) -> GenerateUnderground3DResponse:
        """Batch generation of 3D solids for multiple subsurface features."""
        results = [self.generate_underground_3d(req) for req in requests]
        successful = sum(1 for r in results if r.geometry_status == Geometry3DStatus.VALID)
        failed = len(results) - successful
        return GenerateUnderground3DResponse(
            schema_version="1.0",
            total_requested=len(requests),
            successful=successful,
            failed=failed,
            results=results,
        )

    # -------------------------------------------------------------------------
    # 3. Validation and Cadastral Relationship
    # -------------------------------------------------------------------------
    def validate_underground_feature(
        self, request: UndergroundValidationRequest
    ) -> UndergroundValidationResponse:
        """Audit an underground feature against elevation sanity, geometry, and parent relationships."""
        errors: List[str] = []
        warnings: List[str] = []
        f = request.feature

        # 1. Elevation and Depth check
        depth_consistent = True
        try:
            expected_d_top = round(max(0.0, f.ground_elevation_m - f.top_elevation_m), 3)
            expected_d_base = round(max(0.0, f.ground_elevation_m - f.base_elevation_m), 3)
            expected_thickness = round(f.top_elevation_m - f.base_elevation_m, 3)

            if abs(f.depth_to_top_m - expected_d_top) > 0.01:
                errors.append(
                    f"depth_to_top_m mismatch: declared {f.depth_to_top_m}m vs calculated {expected_d_top}m."
                )
                depth_consistent = False
            if abs(f.depth_to_base_m - expected_d_base) > 0.01:
                errors.append(
                    f"depth_to_base_m mismatch: declared {f.depth_to_base_m}m vs calculated {expected_d_base}m."
                )
                depth_consistent = False
            if abs(f.thickness_m - expected_thickness) > 0.01:
                errors.append(
                    f"thickness_m mismatch: declared {f.thickness_m}m vs calculated {expected_thickness}m."
                )
                depth_consistent = False
        except Exception as e:
            errors.append(f"Depth calculation failed: {e}")
            depth_consistent = False

        # 2. 2D Geometry check
        geom_valid = True
        feat_poly = None
        if f.geometry_2d:
            try:
                feat_shape = shape(f.geometry_2d)
                if not feat_shape.is_valid:
                    errors.append(f"Invalid geometry: {explain_validity(feat_shape)}")
                    geom_valid = False
                else:
                    feat_poly = feat_shape
            except Exception as e:
                errors.append(f"Failed to parse geometry_2d: {e}")
                geom_valid = False

        # 3. Spatial Relationships
        spatial_status = UndergroundSpatialStatus.UNRESOLVED

        # Parcel relationship
        if feat_poly and request.parcel_geometry:
            try:
                parcel_shape = shape(request.parcel_geometry)
                if parcel_shape.contains(feat_poly):
                    spatial_status = UndergroundSpatialStatus.WITHIN
                elif parcel_shape.intersects(feat_poly):
                    spatial_status = UndergroundSpatialStatus.INTERSECTS
                else:
                    spatial_status = UndergroundSpatialStatus.OUTSIDE
                    errors.append(
                        f"Spatial violation: Feature '{f.underground_feature_id}' lies entirely outside parcel '{f.parcel_id}'."
                    )
            except Exception as e:
                warnings.append(f"Could not check parcel containment: {e}")

        # Building relationship for basement
        if f.feature_type == UndergroundFeatureType.BASEMENT:
            if not f.building_id:
                errors.append("Missing parent building_id for BASEMENT feature.")
            elif feat_poly and request.building_geometry:
                try:
                    bld_shape = shape(request.building_geometry)
                    if not bld_shape.contains(feat_poly):
                        # Calculate basement encroachment past building footprint
                        ext = feat_poly.difference(bld_shape)
                        if ext.area > 0.1:
                            warnings.append(
                                f"Basement extends {round(ext.area, 2)}m2 beyond parent building footprint (podium/cantilever basement)."
                            )
                except Exception as e:
                    warnings.append(f"Could not check building footprint alignment: {e}")

        is_valid = (len(errors) == 0) and depth_consistent and geom_valid

        return UndergroundValidationResponse(
            underground_feature_id=f.underground_feature_id,
            is_valid=is_valid,
            spatial_status=spatial_status,
            depth_consistent=depth_consistent,
            geometry_valid=geom_valid,
            validation_errors=errors,
            warnings=warnings,
        )

    # -------------------------------------------------------------------------
    # 4. Conflict & Clash Detection
    # -------------------------------------------------------------------------
    def evaluate_conflicts(
        self, request: UndergroundConflictRequest
    ) -> UndergroundConflictResponse:
        """
        Audit 3D spatial clashes and proximity between a candidate subsurface asset
        and registered underground infrastructure.
        """
        conflicts: List[UndergroundConflictRecord] = []
        cand = request.candidate_feature

        cand_shape = shape(cand.geometry_2d) if cand.geometry_2d else None
        if not cand_shape or not cand_shape.is_valid:
            return UndergroundConflictResponse(
                candidate_feature_id=cand.underground_feature_id,
                total_conflicts_found=0,
                has_invalid_clash=False,
                conflicts=[],
                summary_message="Candidate feature has no valid 2D geometry; collision audit skipped.",
            )

        for exist in request.existing_features:
            if exist.underground_feature_id == cand.underground_feature_id:
                continue

            exist_shape = shape(exist.geometry_2d) if exist.geometry_2d else None
            if not exist_shape or not exist_shape.is_valid:
                continue

            # 1. 2D horizontal overlap
            if not cand_shape.intersects(exist_shape):
                continue

            inter_2d = cand_shape.intersection(exist_shape)
            overlap_area = round(float(inter_2d.area), 3)
            if overlap_area < 0.001:
                continue

            # 2. Vertical interval overlap / clearance
            # cand: [cand.base_elevation_m, cand.top_elevation_m]
            # exist: [exist.base_elevation_m, exist.top_elevation_m]
            cand_base = cand.base_elevation_m
            cand_top = cand.top_elevation_m
            exist_base = exist.base_elevation_m
            exist_top = exist.top_elevation_m

            # Test vertical overlap
            vert_overlap = min(cand_top, exist_top) - max(cand_base, exist_base)

            if vert_overlap > 0.01:
                # True 3D spatial intersection
                is_3d_clash = True
                vert_clearance = -round(vert_overlap, 3)

                # Determine if allowed intersection (e.g. utility corridor entering basement)
                is_utility_penetration = (
                    (cand.feature_type == UndergroundFeatureType.BASEMENT and exist.feature_type == UndergroundFeatureType.UNDERGROUND_UTILITY) or
                    (cand.feature_type == UndergroundFeatureType.UNDERGROUND_UTILITY and exist.feature_type == UndergroundFeatureType.BASEMENT)
                )

                if is_utility_penetration:
                    conflict_class = UndergroundConflictClass.ALLOWED_INTERSECTION
                    recommendation = "Documented utility entry penetration or registered subsurface easement."
                else:
                    conflict_class = UndergroundConflictClass.INVALID_OVERLAP
                    recommendation = "CRITICAL: Direct 3D physical collision detected. Realignment or sleeve rerouting required."

            else:
                # No vertical overlap; compute positive clearance distance
                is_3d_clash = False
                if cand_base >= exist_top:
                    vert_clearance = round(cand_base - exist_top, 3)
                else:
                    vert_clearance = round(exist_base - cand_top, 3)

                if vert_clearance < request.clearance_threshold_m:
                    conflict_class = UndergroundConflictClass.REVIEW_REQUIRED
                    recommendation = (
                        f"Close proximity clearance ({vert_clearance}m < {request.clearance_threshold_m}m threshold). "
                        "Requires excavation safety review."
                    )
                else:
                    # Safe vertical clearance
                    continue

            conflicts.append(
                UndergroundConflictRecord(
                    feature_a_id=cand.underground_feature_id,
                    feature_b_id=exist.underground_feature_id,
                    feature_a_type=cand.feature_type,
                    feature_b_type=exist.feature_type,
                    conflict_class=conflict_class,
                    horizontal_overlap_area_m2=overlap_area,
                    vertical_clearance_m=vert_clearance,
                    is_3d_clash=is_3d_clash,
                    resolution_recommendation=recommendation,
                )
            )

        has_invalid = any(c.conflict_class == UndergroundConflictClass.INVALID_OVERLAP for c in conflicts)
        summary = (
            f"Detected {len(conflicts)} spatial conflict(s). "
            f"{'CRITICAL: Invalid physical clash present.' if has_invalid else 'All intersections within permitted easement/clearance buffers.'}"
        )

        return UndergroundConflictResponse(
            candidate_feature_id=cand.underground_feature_id,
            total_conflicts_found=len(conflicts),
            has_invalid_clash=has_invalid,
            conflicts=conflicts,
            summary_message=summary,
        )

    # -------------------------------------------------------------------------
    # 5. Synthetic Demonstration Bundle
    # -------------------------------------------------------------------------
    def get_demo_underground_bundle(self) -> DemoUndergroundResponse:
        """
        Assemble the canonical synthetic demonstration subsurface assets for
        Tower 1 and Parcel DEMO-401/1 (Bangalore testbed, ground elevation 920.0m ASL).
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        ground_z = 920.0

        # 1. Feature 1: Commercial Basement (Tower 1)
        # Footprint matches Tower 1: [775910, 1297150] to [775955, 1297205] in UTM 43N
        b_coords = [
            [775910.0, 1297150.0],
            [775955.0, 1297150.0],
            [775955.0, 1297205.0],
            [775910.0, 1297205.0],
            [775910.0, 1297150.0],
        ]
        b_poly = Polygon(b_coords)
        b_top = 920.0
        b_base = 916.0
        b_d_top, b_d_base, b_thick, _ = self.derive_depths(ground_z, b_top, b_base)

        b_mesh_res = self.generate_underground_3d(
            Underground3DRequest(
                underground_feature_id="BSM-DEMO-101",
                feature_type=UndergroundFeatureType.BASEMENT,
                footprint_geometry=mapping(b_poly),
                ground_elevation_m=ground_z,
                top_elevation_m=b_top,
                base_elevation_m=b_base,
                target_crs=self.DEFAULT_CRS,
                source_crs=self.DEFAULT_CRS,
            )
        )

        basement_feat = UndergroundFeature(
            underground_feature_id="BSM-DEMO-101",
            feature_type=UndergroundFeatureType.BASEMENT,
            parcel_id="DEMO-401/1",
            building_id="BLD-DEMO-101",
            property_id="PROP-DEMO-101-BSM",
            name="Tower 1 Subterranean Commercial Parking & Utility Vault",
            source="SYNTHETIC DEMO DATA",
            source_type="BIM_IFC",
            ground_elevation_m=ground_z,
            top_elevation_m=b_top,
            base_elevation_m=b_base,
            depth_to_top_m=b_d_top,
            depth_to_base_m=b_d_base,
            thickness_m=b_thick,
            geometry_2d=mapping(b_poly),
            mesh_3d=b_mesh_res.mesh_3d,
            geometry_status=b_mesh_res.geometry_status,
            spatial_status=UndergroundSpatialStatus.WITHIN,
            is_cadastral_property=True,
            provenance=UndergroundProvenance(
                source_dataset="Urban_Parcel_Tower1_BIM",
                source_type="SYNTHETIC_DEMO",
                source_file="tower1_subsurface_asbuilt.ifc",
                crs=self.DEFAULT_CRS,
                vertical_datum="EGM2008 / AMSL",
                survey_method="As-built structural drawing",
                created_at=timestamp,
            ),
            warnings=["SYNTHETIC DEMO DATA. Verified watertight 2-manifold solid."],
        )

        # 2. Feature 2: Municipal Water Supply Trunk
        # Linear corridor entering the property from western street right-of-way
        u1_coords = [
            [775890.0, 1297170.0],
            [775925.0, 1297172.0],
        ]
        u1_line = LineString(u1_coords)
        u1_poly = u1_line.buffer(1.2)  # 2.4m width pipe corridor
        u1_top = 918.5
        u1_base = 917.0
        u1_d_top, u1_d_base, u1_thick, _ = self.derive_depths(ground_z, u1_top, u1_base)

        u1_mesh_res = self.generate_underground_3d(
            Underground3DRequest(
                underground_feature_id="UTL-DEMO-001",
                feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
                footprint_geometry=mapping(u1_poly),
                ground_elevation_m=ground_z,
                top_elevation_m=u1_top,
                base_elevation_m=u1_base,
                target_crs=self.DEFAULT_CRS,
                source_crs=self.DEFAULT_CRS,
            )
        )

        utility_feat = UndergroundFeature(
            underground_feature_id="UTL-DEMO-001",
            feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
            utility_type=UtilityType.WATER_SUPPLY,
            parcel_id="DEMO-401/1",
            building_id=None,
            property_id=None,
            name="BWSSB Municipal Water Supply Main (300mm Ductile Iron)",
            source="SYNTHETIC DEMO DATA",
            source_type="MUNICIPAL_UTILITY_GIS",
            ground_elevation_m=ground_z,
            top_elevation_m=u1_top,
            base_elevation_m=u1_base,
            depth_to_top_m=u1_d_top,
            depth_to_base_m=u1_d_base,
            thickness_m=u1_thick,
            geometry_2d=mapping(u1_poly),
            mesh_3d=u1_mesh_res.mesh_3d,
            geometry_status=u1_mesh_res.geometry_status,
            spatial_status=UndergroundSpatialStatus.INTERSECTS,
            is_cadastral_property=False,
            provenance=UndergroundProvenance(
                source_dataset="BWSSB_Water_Distribution_GIS",
                source_type="SYNTHETIC_DEMO",
                source_file="water_trunk_alignment.geojson",
                crs=self.DEFAULT_CRS,
                vertical_datum="EGM2008 / AMSL",
                survey_method="Municipal GIS Cadastre & GPR",
                created_at=timestamp,
            ),
            warnings=[
                "SYNTHETIC DEMO DATA. Municipal utility; NOT a private property volume. Subsurface easement applies."
            ],
        )

        # 3. Feature 3: Subsurface Power & Telecom Duct Bank
        # Running along southern parcel boundary
        u2_coords = [
            [775905.0, 1297138.0],
            [775960.0, 1297142.0],
        ]
        u2_line = LineString(u2_coords)
        u2_poly = u2_line.buffer(0.8)  # 1.6m width duct bank
        u2_top = 919.2
        u2_base = 918.4
        u2_d_top, u2_d_base, u2_thick, _ = self.derive_depths(ground_z, u2_top, u2_base)

        u2_mesh_res = self.generate_underground_3d(
            Underground3DRequest(
                underground_feature_id="UTL-DEMO-002",
                feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
                utility_type=UtilityType.TELECOMMUNICATIONS,
                footprint_geometry=mapping(u2_poly),
                ground_elevation_m=ground_z,
                top_elevation_m=u2_top,
                base_elevation_m=u2_base,
                target_crs=self.DEFAULT_CRS,
                source_crs=self.DEFAULT_CRS,
            )
        )

        telecom_feat = UndergroundFeature(
            underground_feature_id="UTL-DEMO-002",
            feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
            utility_type=UtilityType.TELECOMMUNICATIONS,
            parcel_id="DEMO-401/1",
            building_id=None,
            property_id=None,
            name="BESCOM / BSNL Optical Fiber & Power Conduit Duct Bank",
            source="SYNTHETIC DEMO DATA",
            source_type="SUB_SURVEY",
            ground_elevation_m=ground_z,
            top_elevation_m=u2_top,
            base_elevation_m=u2_base,
            depth_to_top_m=u2_d_top,
            depth_to_base_m=u2_d_base,
            thickness_m=u2_thick,
            geometry_2d=mapping(u2_poly),
            mesh_3d=u2_mesh_res.mesh_3d,
            geometry_status=u2_mesh_res.geometry_status,
            spatial_status=UndergroundSpatialStatus.WITHIN,
            is_cadastral_property=False,
            provenance=UndergroundProvenance(
                source_dataset="Subsurface_Utility_Engineering_L2",
                source_type="SYNTHETIC_DEMO",
                source_file="duct_bank_sue.geojson",
                crs=self.DEFAULT_CRS,
                vertical_datum="EGM2008 / AMSL",
                survey_method="Ground Penetrating Radar (GPR)",
                created_at=timestamp,
            ),
            warnings=[
                "SYNTHETIC DEMO DATA. Subsurface infrastructure conduit; NOT a property volume."
            ],
        )

        features = [basement_feat, utility_feat, telecom_feat]

        return DemoUndergroundResponse(
            schema_version="1.0",
            parcel_id="DEMO-401/1",
            building_id="BLD-DEMO-101",
            features=features,
            total_features=len(features),
            basement_count=1,
            utility_count=2,
            vertical_datum="EGM2008 / AMSL",
            disclaimer="SYNTHETIC DEMO DATA. Subsurface spatial modeling only; does not convey statutory property title or utility concession rights.",
        )


# Global underground service singleton
underground_service = UndergroundService()
