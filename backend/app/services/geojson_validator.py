from typing import Dict, Any, List, Optional
import json
from shapely.geometry import shape
from shapely.validation import explain_validity

from app.schemas.cadastre import (
    GeoJSONValidationResult,
    GeometryValidationIssue,
)
from app.utils.crs import inspect_crs, validate_crs, suggest_utm_crs


SUPPORTED_GEOMETRY_TYPES = {"Polygon", "MultiPolygon"}


class GeoJSONValidator:
    """Service for validating cadastral GeoJSON feature collections and geometry topology."""

    @staticmethod
    def validate_dataset(geojson_data: Dict[str, Any]) -> GeoJSONValidationResult:
        errors: List[GeometryValidationIssue] = []
        warnings: List[str] = []
        geometry_types_found = set()
        
        # 1. Structure Verification
        if not isinstance(geojson_data, dict):
            errors.append(
                GeometryValidationIssue(
                    feature_index=-1,
                    issue_type="MALFORMED_STRUCTURE",
                    message="Root element must be a JSON object",
                )
            )
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=errors,
                warnings=warnings,
            )

        root_type = geojson_data.get("type")
        if root_type != "FeatureCollection":
            errors.append(
                GeometryValidationIssue(
                    feature_index=-1,
                    issue_type="INVALID_GEOJSON_TYPE",
                    message=f"Expected 'FeatureCollection' at root, got '{root_type}'",
                )
            )
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=errors,
                warnings=warnings,
            )

        features = geojson_data.get("features")
        if not isinstance(features, list):
            errors.append(
                GeometryValidationIssue(
                    feature_index=-1,
                    issue_type="MISSING_FEATURES",
                    message="'features' member must be a JSON array",
                )
            )
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=errors,
                warnings=warnings,
            )

        if len(features) == 0:
            errors.append(
                GeometryValidationIssue(
                    feature_index=-1,
                    issue_type="EMPTY_DATASET",
                    message="FeatureCollection contains 0 features; at least one cadastral parcel required",
                )
            )

        # 2. CRS Inspection
        crs_id, crs_source = inspect_crs(geojson_data)
        crs_info = validate_crs(crs_id)
        if not crs_info["valid"]:
            warnings.append(f"CRS '{crs_id}' could not be verified by PROJ: {crs_info['error']}")

        is_projected = crs_info.get("is_projected", False)
        if not is_projected:
            warnings.append(
                f"Coordinates are in geographic reference system ({crs_id}). "
                "Reprojection to a projected metric coordinate system (e.g. UTM) is recommended for 3D extrusion."
            )

        # Centroid accumulator for UTM suggestion
        total_x = 0.0
        total_y = 0.0
        valid_centroid_count = 0

        # 3. Individual Feature & Geometry Validation
        for idx, feature in enumerate(features):
            if not isinstance(feature, dict):
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="INVALID_FEATURE",
                        message="Feature must be a JSON object",
                    )
                )
                continue

            if feature.get("type") != "Feature":
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="INVALID_FEATURE_TYPE",
                        message=f"Feature type must be 'Feature', got '{feature.get('type')}'",
                    )
                )
                continue

            geometry = feature.get("geometry")
            if geometry is None:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="MISSING_GEOMETRY",
                        message="Feature is missing required 'geometry' object",
                    )
                )
                continue

            if not isinstance(geometry, dict):
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="MALFORMED_GEOMETRY",
                        message="'geometry' must be a JSON object",
                    )
                )
                continue

            geom_type = geometry.get("type")
            if not geom_type:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="MISSING_GEOMETRY_TYPE",
                        message="Geometry is missing 'type' member",
                    )
                )
                continue

            geometry_types_found.add(geom_type)

            if geom_type not in SUPPORTED_GEOMETRY_TYPES:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="UNSUPPORTED_GEOMETRY_TYPE",
                        message=f"Geometry type '{geom_type}' is unsupported for cadastral parcels. Expected 'Polygon' or 'MultiPolygon'",
                    )
                )
                continue

            coords = geometry.get("coordinates")
            if coords is None or len(coords) == 0:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="EMPTY_COORDINATES",
                        message="Polygon coordinates array is empty",
                    )
                )
                continue

            # 4. Shapely Topological Validation
            try:
                shapely_geom = shape(geometry)
                
                if shapely_geom.is_empty:
                    errors.append(
                        GeometryValidationIssue(
                            feature_index=idx,
                            issue_type="EMPTY_GEOMETRY",
                            message="Geometry contains no geometric points/vertices",
                        )
                    )
                    continue

                if not shapely_geom.is_valid:
                    reason = explain_validity(shapely_geom)
                    centroid = [shapely_geom.centroid.x, shapely_geom.centroid.y] if not shapely_geom.centroid.is_empty else None
                    errors.append(
                        GeometryValidationIssue(
                            feature_index=idx,
                            issue_type="TOPOLOGICAL_VIOLATION",
                            message=f"Invalid geometry topology: {reason}",
                            coordinates_hint=centroid,
                        )
                    )
                else:
                    # Accumulate centroid for UTM suggestion
                    total_x += shapely_geom.centroid.x
                    total_y += shapely_geom.centroid.y
                    valid_centroid_count += 1

            except Exception as e:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="GEOMETRY_PARSING_ERROR",
                        message=f"Failed to parse geometry structure: {str(e)}",
                    )
                )

        # 5. Determine Suggested Projected CRS
        suggested_crs = None
        if valid_centroid_count > 0 and not is_projected:
            mean_lon = total_x / valid_centroid_count
            mean_lat = total_y / valid_centroid_count
            suggested_crs = suggest_utm_crs(mean_lon, mean_lat)

        is_valid = len(errors) == 0

        return GeoJSONValidationResult(
            valid=is_valid,
            feature_count=len(features),
            geometry_types=sorted(list(geometry_types_found)),
            crs=crs_id,
            crs_source=crs_source,
            crs_is_projected=is_projected,
            suggested_projected_crs=suggested_crs,
            errors=errors,
            warnings=warnings,
        )
