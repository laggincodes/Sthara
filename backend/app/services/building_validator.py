from typing import Dict, Any, List, Optional, Tuple
from shapely.geometry import shape
from shapely.validation import explain_validity

from app.schemas.cadastre import (
    GeoJSONValidationResult,
    GeometryValidationIssue,
)
from app.utils.crs import inspect_crs, validate_crs, suggest_utm_crs

SUPPORTED_BUILDING_GEOMETRY_TYPES = {"Polygon", "MultiPolygon"}
BUILDING_ID_KEYS = ["building_id", "bld_id", "id", "buildingId", "footprint_id", "name", "code"]


class BuildingValidator:
    """Service for validating building footprint GeoJSON collections and geometry topology."""

    @staticmethod
    def extract_building_id(feature: Dict[str, Any], index: int) -> Tuple[str, bool, Optional[str]]:
        """
        Extracts or generates an identifier for the building feature.
        Returns: (building_id, is_system_generated, detected_field_name).
        """
        # 1. Top-level feature id
        top_id = feature.get("id")
        if top_id is not None and str(top_id).strip():
            return str(top_id).strip(), False, "feature.id"

        # 2. Properties lookup
        props = feature.get("properties")
        if isinstance(props, dict):
            for key in BUILDING_ID_KEYS:
                if key in props and props[key] is not None and str(props[key]).strip():
                    return str(props[key]).strip(), False, f"properties.{key}"

        # 3. Deterministic system-generated fallback
        return f"BLD-SYS-{index + 1:03d}", True, None

    @classmethod
    def validate_buildings(cls, geojson_data: Dict[str, Any]) -> GeoJSONValidationResult:
        errors: List[GeometryValidationIssue] = []
        warnings: List[str] = []
        geometry_types_found = set()

        if not isinstance(geojson_data, dict):
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=[
                    GeometryValidationIssue(
                        feature_index=-1,
                        issue_type="MALFORMED_STRUCTURE",
                        message="Building collection root element must be a JSON object",
                    )
                ],
                warnings=[],
            )

        root_type = geojson_data.get("type")
        if root_type != "FeatureCollection":
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=[
                    GeometryValidationIssue(
                        feature_index=-1,
                        issue_type="INVALID_GEOJSON_TYPE",
                        message=f"Expected 'FeatureCollection' at root, got '{root_type}'",
                    )
                ],
                warnings=[],
            )

        features = geojson_data.get("features")
        if not isinstance(features, list):
            return GeoJSONValidationResult(
                valid=False,
                feature_count=0,
                geometry_types=[],
                crs="UNKNOWN",
                crs_source="unresolved",
                errors=[
                    GeometryValidationIssue(
                        feature_index=-1,
                        issue_type="MISSING_FEATURES",
                        message="'features' member must be a JSON array",
                    )
                ],
                warnings=[],
            )

        if len(features) == 0:
            errors.append(
                GeometryValidationIssue(
                    feature_index=-1,
                    issue_type="EMPTY_DATASET",
                    message="FeatureCollection contains 0 features; at least one building footprint required",
                )
            )

        crs_id, crs_source = inspect_crs(geojson_data)
        crs_info = validate_crs(crs_id)
        if not crs_info["valid"]:
            warnings.append(f"CRS '{crs_id}' could not be verified by PROJ: {crs_info['error']}")

        is_projected = crs_info.get("is_projected", False)
        if not is_projected:
            warnings.append(
                f"Coordinates are in geographic reference system ({crs_id}). Area and distance calculations require metric projection."
            )

        total_x = 0.0
        total_y = 0.0
        valid_centroid_count = 0

        for idx, feature in enumerate(features):
            if not isinstance(feature, dict):
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="INVALID_FEATURE",
                        message="Building feature must be a JSON object",
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
                        message="Building feature is missing required 'geometry' object",
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

            if geom_type not in SUPPORTED_BUILDING_GEOMETRY_TYPES:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="UNSUPPORTED_GEOMETRY_TYPE",
                        message=f"Geometry type '{geom_type}' is unsupported for building footprints. Expected 'Polygon' or 'MultiPolygon'",
                    )
                )
                continue

            coords = geometry.get("coordinates")
            if coords is None or len(coords) == 0:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="EMPTY_COORDINATES",
                        message="Building polygon coordinates array is empty",
                    )
                )
                continue

            try:
                shapely_geom = shape(geometry)

                if shapely_geom.is_empty:
                    errors.append(
                        GeometryValidationIssue(
                            feature_index=idx,
                            issue_type="EMPTY_GEOMETRY",
                            message="Building geometry contains no geometric points/vertices",
                        )
                    )
                    continue

                if not shapely_geom.is_valid:
                    reason = explain_validity(shapely_geom)
                    errors.append(
                        GeometryValidationIssue(
                            feature_index=idx,
                            issue_type="TOPOLOGICAL_INVALIDITY",
                            message=f"Invalid building polygon topology: {reason}",
                        )
                    )
                    continue

                if shapely_geom.area <= 0:
                    errors.append(
                        GeometryValidationIssue(
                            feature_index=idx,
                            issue_type="ZERO_AREA",
                            message="Building geometry has non-positive area (degenerate polygon)",
                        )
                    )
                    continue

                centroid = shapely_geom.centroid
                total_x += centroid.x
                total_y += centroid.y
                valid_centroid_count += 1

            except Exception as e:
                errors.append(
                    GeometryValidationIssue(
                        feature_index=idx,
                        issue_type="UNPARSABLE_GEOMETRY",
                        message=f"Failed to parse building geometry with Shapely: {str(e)}",
                    )
                )

        suggested_utm = None
        if valid_centroid_count > 0 and not is_projected:
            avg_lon = total_x / valid_centroid_count
            avg_lat = total_y / valid_centroid_count
            suggested_utm = suggest_utm_crs(avg_lon, avg_lat)

        return GeoJSONValidationResult(
            valid=len(errors) == 0,
            feature_count=len(features),
            geometry_types=sorted(list(geometry_types_found)),
            crs=crs_id,
            crs_source=crs_source,
            crs_is_projected=is_projected,
            suggested_projected_crs=suggested_utm,
            errors=errors,
            warnings=warnings,
        )
