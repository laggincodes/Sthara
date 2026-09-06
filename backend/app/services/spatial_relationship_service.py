from typing import Dict, Any, List, Optional, Tuple
import math
import geopandas as gpd
from shapely.geometry import shape, mapping
from shapely.ops import transform
from shapely.strtree import STRtree
import pyproj

from app.schemas.cadastre import (
    BuildingAssociationStatus,
    ParcelOverlapDetail,
    BuildingAssociationResult,
    BuildingAssociationSummary,
    SpatialAssociationResponse,
)
from app.services.geojson_validator import GeoJSONValidator
from app.services.building_validator import BuildingValidator
from app.services.parcel_normalizer import ParcelNormalizer
from app.utils.crs import inspect_crs, validate_crs, suggest_utm_crs, transform_geometry
from app.core.logging import logger


class SpatialRelationshipService:
    """
    Deterministic spatial analysis service for associating building footprints
    with cadastral land parcels.
    """

    @classmethod
    def analyze_associations(
        cls,
        parcels_geojson: Dict[str, Any],
        buildings_geojson: Dict[str, Any],
        target_crs: Optional[str] = None,
    ) -> SpatialAssociationResponse:
        warnings: List[str] = []
        errors: List[str] = []

        # 1. Structure & Topology Validation
        parcel_val = GeoJSONValidator.validate_dataset(parcels_geojson)
        if not parcel_val.valid:
            error_msgs = "; ".join([e.message for e in parcel_val.errors])
            raise ValueError(f"Parcel dataset failed validation: {error_msgs}")

        building_val = BuildingValidator.validate_buildings(buildings_geojson)
        if not building_val.valid:
            error_msgs = "; ".join([e.message for e in building_val.errors])
            raise ValueError(f"Building dataset failed validation: {error_msgs}")

        warnings.extend(parcel_val.warnings)
        warnings.extend(building_val.warnings)

        parcel_features = parcels_geojson.get("features", [])
        building_features = buildings_geojson.get("features", [])

        if len(parcel_features) == 0:
            raise ValueError("Parcel collection is empty; cannot associate buildings.")
        if len(building_features) == 0:
            raise ValueError("Building collection is empty; cannot associate buildings.")

        # 2. CRS Inspection & Projected CRS Determination
        parcel_crs_id, _ = inspect_crs(parcels_geojson)
        building_crs_id, _ = inspect_crs(buildings_geojson)

        if not target_crs:
            if parcel_val.suggested_projected_crs:
                chosen_metric_crs = parcel_val.suggested_projected_crs
            elif building_val.suggested_projected_crs:
                chosen_metric_crs = building_val.suggested_projected_crs
            else:
                chosen_metric_crs = "EPSG:32643"  # Default UTM 43N (India) fallback
        else:
            chosen_metric_crs = target_crs

        # Verify projected CRS
        metric_crs_info = validate_crs(chosen_metric_crs)
        if not metric_crs_info["valid"]:
            warnings.append(f"Target metric CRS '{chosen_metric_crs}' invalid; falling back to EPSG:32643")
            chosen_metric_crs = "EPSG:32643"

        # 3. Setup Coordinate Transformers for Metric Projection
        transformer_parcels = pyproj.Transformer.from_crs(parcel_crs_id, chosen_metric_crs, always_xy=True)
        transformer_buildings = pyproj.Transformer.from_crs(building_crs_id, chosen_metric_crs, always_xy=True)

        # 4. Parse & Reproject Parcels
        parsed_parcels: List[Dict[str, Any]] = []
        for idx, feat in enumerate(parcel_features):
            p_id, _, _ = ParcelNormalizer.resolve_parcel_id(feat, idx)
            orig_geom = shape(feat["geometry"])
            proj_geom = transform(transformer_parcels.transform, orig_geom)
            parsed_parcels.append({
                "parcel_id": p_id,
                "orig_geom": orig_geom,
                "proj_geom": proj_geom,
                "properties": feat.get("properties", {}),
            })

        # Build Spatial Index (STRtree) over projected parcel geometries
        parcel_proj_geoms = [p["proj_geom"] for p in parsed_parcels]
        parcel_tree = STRtree(parcel_proj_geoms)

        # 5. Process Each Building
        association_results: List[BuildingAssociationResult] = []
        parcel_building_map: Dict[str, List[str]] = {p["parcel_id"]: [] for p in parsed_parcels}

        for idx, b_feat in enumerate(building_features):
            b_id, is_sys_id, _ = BuildingValidator.extract_building_id(b_feat, idx)
            orig_b_geom = shape(b_feat["geometry"])
            proj_b_geom = transform(transformer_buildings.transform, orig_b_geom)

            building_area_sqm = round(float(proj_b_geom.area), 2)
            if building_area_sqm <= 0:
                errors.append(f"Building '{b_id}' has non-positive area ({building_area_sqm} m²).")

            # Query candidate parcel indices from spatial index
            candidate_indices = parcel_tree.query(proj_b_geom)

            overlaps: List[ParcelOverlapDetail] = []
            for c_idx in candidate_indices:
                p_item = parsed_parcels[c_idx]
                p_proj = p_item["proj_geom"]

                if proj_b_geom.intersects(p_proj):
                    try:
                        inter = proj_b_geom.intersection(p_proj)
                        inter_area = float(inter.area)
                        # Filter out trivial floating point boundary touching (< 0.01 sqm)
                        if inter_area > 0.01 and building_area_sqm > 0:
                            pct = (inter_area / building_area_sqm) * 100.0
                            pct = min(100.0, round(pct, 2))
                            overlaps.append(
                                ParcelOverlapDetail(
                                    parcel_id=p_item["parcel_id"],
                                    intersection_area_sqm=round(inter_area, 2),
                                    overlap_percentage=pct,
                                )
                            )
                    except Exception as e:
                        logger.warning(f"Intersection failed between building {b_id} and parcel {p_item['parcel_id']}: {e}")

            # Determine Association Status & Primary Associated Parcel
            associated_parcel_id: Optional[str] = None
            primary_overlap_pct: float = 0.0

            if len(overlaps) == 0:
                status = BuildingAssociationStatus.OUTSIDE
            elif len(overlaps) == 1:
                associated_parcel_id = overlaps[0].parcel_id
                primary_overlap_pct = overlaps[0].overlap_percentage
                # If >= 99% inside single parcel, consider within
                if primary_overlap_pct >= 99.0 or proj_b_geom.within(parsed_parcels[candidate_indices[0]]["proj_geom"]):
                    status = BuildingAssociationStatus.WITHIN
                    primary_overlap_pct = 100.0
                else:
                    status = BuildingAssociationStatus.INTERSECTS
            else:
                # Multi-parcel intersection: sort descending by intersection area
                overlaps.sort(key=lambda x: x.intersection_area_sqm, reverse=True)
                associated_parcel_id = overlaps[0].parcel_id
                primary_overlap_pct = overlaps[0].overlap_percentage
                status = BuildingAssociationStatus.MULTI_PARCEL

            # Record in parcel_building_map if associated
            if associated_parcel_id and associated_parcel_id in parcel_building_map:
                parcel_building_map[associated_parcel_id].append(b_id)

            orig_bounds = tuple(orig_b_geom.bounds)
            orig_centroid = [round(orig_b_geom.centroid.x, 6), round(orig_b_geom.centroid.y, 6)]

            association_results.append(
                BuildingAssociationResult(
                    building_id=b_id,
                    is_system_generated_id=is_sys_id,
                    geometry_type=orig_b_geom.geom_type,
                    geometry=mapping(orig_b_geom),
                    bounds=orig_bounds,
                    building_area_sqm=building_area_sqm,
                    centroid=orig_centroid,
                    associated_parcel_id=associated_parcel_id,
                    association_status=status,
                    overlap_percentage=primary_overlap_pct,
                    overlaps=overlaps,
                    properties=b_feat.get("properties", {}),
                )
            )

        # 6. Summary Aggregation
        total_p = len(parsed_parcels)
        total_b = len(association_results)
        associated_count = sum(1 for a in association_results if a.associated_parcel_id is not None)
        outside_count = sum(1 for a in association_results if a.association_status == BuildingAssociationStatus.OUTSIDE)
        multi_parcel_count = sum(1 for a in association_results if a.association_status == BuildingAssociationStatus.MULTI_PARCEL)
        unresolved_count = sum(1 for a in association_results if a.association_status == BuildingAssociationStatus.UNRESOLVED)

        summary = BuildingAssociationSummary(
            total_parcels=total_p,
            total_buildings=total_b,
            associated_buildings=associated_count,
            unresolved_buildings=unresolved_count,
            outside_buildings=outside_count,
            multi_parcel_buildings=multi_parcel_count,
            projected_crs=chosen_metric_crs,
        )

        return SpatialAssociationResponse(
            summary=summary,
            associations=association_results,
            parcel_building_map=parcel_building_map,
            warnings=warnings,
            errors=errors,
        )
