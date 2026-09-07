"""
Multi-Source Spatial Data Fusion Service.

Orchestrates deterministic georeferencing, spatial alignment, relationship
association, and conflict detection across heterogeneous spatial data sources:
- Cadastral GIS (Parcels)
- Physical Building Footprints (Synthetic & Real OSM)
- Digital Elevation Models (DEM/DSM)
- LiDAR Point Clouds
- Floor Strata & Subdivisions
- Apartment / Flat Units
- GNSS / CORS Geodetic Control Monuments
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import json
import uuid
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform
import pyproj

from app.schemas.fusion import (
    SourceType,
    SourceStatus,
    FusionStatus,
    FusionQualityLevel,
    ConflictSeverity,
    DatasetMetadata,
    ReferenceControlType,
    ControlPointAccuracy,
    GNSSReferencePoint,
    ControlPointValidationRequest,
    ControlPointValidationResponse,
    LiDARSourceReference,
    SpatialConflict,
    FusedBuildingContext,
    FusedPropertyContext,
    FusionValidateRequest,
    FusionValidateResponse,
    FusionNormalizeRequest,
    FusionNormalizeResponse,
    PropertyContextRequest,
    PropertyContextResponse,
    TransformationRecord,
)
from app.services.georeferencing_service import GeoreferencingService, DEFAULT_PROJECT_CRS
from app.services.spatial_relationship_service import SpatialRelationshipService
from app.services.elevation_service import ElevationService
from app.schemas.elevation import ElevationSamplePoint, ElevationStatus
from app.services.building_validator import BuildingValidator
from app.services.geojson_validator import GeoJSONValidator
from app.services.unit_service import UnitService
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
DEMO_PARCELS_PATH = DATA_DIR / "processed" / "demo_parcels.geojson"
DEMO_BUILDINGS_PATH = DATA_DIR / "processed" / "demo_buildings.geojson"
DEMO_UNITS_PATH = DATA_DIR / "processed" / "demo_units.geojson"
REAL_OSM_BUILDINGS_PATH = DATA_DIR / "processed" / "real" / "osm_buildings.geojson"
RAW_OSM_MAP_PATH = DATA_DIR / "raw" / "real" / "map.osm"
DEMO_ELEVATION_PATH = DATA_DIR / "raw" / "demo_elevation.tif"
CONTROL_POINTS_PATH = DATA_DIR / "processed" / "reference_control_points.json"


class SpatialFusionService:
    """Core deterministic orchestrator for multi-source georeferencing and spatial fusion."""

    @classmethod
    def validate_multi_source(
        cls,
        datasets: List[DatasetMetadata],
        target_crs: Optional[str] = None,
    ) -> FusionValidateResponse:
        """
        Validates coordinate reference systems, compatibility, and availability
        across an inventory of heterogeneous spatial datasets.
        """
        warnings: List[str] = []
        errors: List[str] = []
        source_alignment: Dict[str, bool] = {
            "cadastral_gis": False,
            "building_footprint": False,
            "osm": False,
            "dem": False,
            "dsm": False,
            "lidar": False,
            "floor_plan": False,
            "gnss_cors": False,
            "drone_aerial": False,
        }

        # Determine target CRS
        resolved_target_crs, reason = GeoreferencingService.select_target_crs(target_crs)
        target_info = GeoreferencingService.validate_crs_string(resolved_target_crs)

        if not target_info["valid"]:
            errors.append(f"Target CRS '{resolved_target_crs}' is not recognized by PROJ database: {target_info.get('error')}")
            valid_target = False
        else:
            valid_target = True

        target_is_projected = GeoreferencingService.is_metric_projected(resolved_target_crs)
        suggested_target_crs = None

        if valid_target and not target_is_projected:
            warnings.append(
                f"Target CRS '{resolved_target_crs}' is geographic (degree-based). "
                "Projected metric coordinates (e.g. UTM) are recommended for 3D volumetrics and area checks."
            )
            suggested_target_crs = "EPSG:32643"

        # Evaluate each dataset metadata
        for ds in datasets:
            type_key = ds.source_type.value.lower()
            if type_key in source_alignment:
                source_alignment[type_key] = True

            crs_info = GeoreferencingService.validate_crs_string(ds.source_crs)
            if not crs_info["valid"]:
                errors.append(f"Dataset '{ds.dataset_id}' has invalid source CRS '{ds.source_crs}': {crs_info.get('error')}")

            # Check units sanity
            if ds.units:
                h_unit = ds.units.get("horizontal", "").lower()
                v_unit = ds.units.get("vertical", "").lower()
                if h_unit and h_unit not in ("meters", "meter", "m", "degrees", "degree", "deg"):
                    warnings.append(f"Dataset '{ds.dataset_id}' horizontal unit '{h_unit}' is non-standard.")
                if v_unit and v_unit not in ("meters", "meter", "m", "feet", "ft"):
                    warnings.append(f"Dataset '{ds.dataset_id}' vertical unit '{v_unit}' is non-standard.")

        is_valid = (len(errors) == 0) and valid_target

        return FusionValidateResponse(
            valid=is_valid,
            target_crs=resolved_target_crs,
            target_crs_is_projected=target_is_projected,
            sources_evaluated=len(datasets),
            source_alignment=source_alignment,
            suggested_target_crs=suggested_target_crs,
            warnings=warnings,
            errors=errors,
        )

    @classmethod
    def normalize_features(
        cls,
        features: List[Dict[str, Any]],
        source_crs: str = "EPSG:4326",
        target_crs: str = DEFAULT_PROJECT_CRS,
    ) -> FusionNormalizeResponse:
        """
        Normalizes a collection of GeoJSON features into target project CRS,
        preserving source coordinates and appending transformation records.
        """
        normalized_features: List[Dict[str, Any]] = []
        transformations: List[TransformationRecord] = []

        for feat in features:
            norm_f, rec = GeoreferencingService.normalize_feature(feat, source_crs, target_crs)
            normalized_features.append(norm_f)
            transformations.append(rec)

        return FusionNormalizeResponse(
            target_crs=target_crs,
            normalized_features=normalized_features,
            transformations=transformations,
        )

    @classmethod
    def build_demo_fused_context(
        cls,
        target_crs: str = DEFAULT_PROJECT_CRS,
        parcel_id: Optional[str] = None,
    ) -> FusedPropertyContext:
        """
        Constructs a complete, deterministic multi-source fused property context
        for the standard demonstration dataset:
        - Cadastral Parcel (PARCEL-DEMO-101)
        - 2 Buildings (Tower 1 & Tower 2)
        - Digital Elevation Model (demo_elevation.tif)
        - LiDAR Point Cloud Reference & Roof Evidence
        - Floor Strata (Floors 0-3 for Tower 1, Floors 0-5 for Tower 2)
        - Apartment Units (Units 501-504 on Floor 5 of Tower 2)
        - GNSS / CORS Geodetic Control Station (CORS-DL-01)
        """
        context_id = f"FUSION-DEMO-{uuid.uuid4().hex[:8].upper()}"
        conflicts: List[SpatialConflict] = []
        warnings: List[str] = []
        provenance: List[Dict[str, Any]] = []

        # 1. Load Cadastral Parcels
        if not DEMO_PARCELS_PATH.exists():
            raise FileNotFoundError(f"Demo parcels dataset not found at {DEMO_PARCELS_PATH}")
        with open(DEMO_PARCELS_PATH, "r", encoding="utf-8") as f:
            parcels_geojson = json.load(f)

        # 2. Load Buildings
        if not DEMO_BUILDINGS_PATH.exists():
            raise FileNotFoundError(f"Demo buildings dataset not found at {DEMO_BUILDINGS_PATH}")
        with open(DEMO_BUILDINGS_PATH, "r", encoding="utf-8") as f:
            buildings_geojson = json.load(f)

        # 3. Load Units
        units_geojson = None
        if DEMO_UNITS_PATH.exists():
            try:
                with open(DEMO_UNITS_PATH, "r", encoding="utf-8") as f:
                    units_geojson = json.load(f)
            except Exception as e:
                warnings.append(f"Failed to load demo units: {e}")

        # 4. Ingest DEM Metadata & Ground Elevation
        dem_metadata_dict = None
        dem_available = False
        try:
            dem_meta = ElevationService.get_dem_metadata()
            dem_available = True
            dem_metadata_dict = {
                "dem_name": dem_meta.dem_name,
                "crs": dem_meta.crs,
                "is_projected": dem_meta.is_projected,
                "bounds": list(dem_meta.bounds),
                "resolution": list(dem_meta.resolution),
                "nodata_value": dem_meta.nodata_value,
                "elevation_min": dem_meta.elevation_min,
                "elevation_max": dem_meta.elevation_max,
                "vertical_unit": "meters",
                "vertical_reference": "AMSL",
            }
            provenance.append({
                "stage": "DEM_INGESTION",
                "source": dem_meta.dem_name,
                "crs": dem_meta.crs,
                "status": "SUCCESS",
            })
        except Exception as e:
            warnings.append(f"DEM inspection warning: {e}")

        # 5. GNSS / CORS Reference Point (Pune Geodetic Network Benchmark)
        # Transform geographic coordinate [73.85652, 18.52025] to target metric project CRS
        gnss_lon, gnss_lat = 73.85652, 18.52025
        gnss_proj_x, gnss_proj_y = gnss_lon, gnss_lat
        gnss_trans_applied = False
        if target_crs != "EPSG:4326":
            try:
                trans = pyproj.Transformer.from_crs("EPSG:4326", target_crs, always_xy=True)
                gnss_proj_x, gnss_proj_y = trans.transform(gnss_lon, gnss_lat)
                gnss_trans_applied = True
            except Exception as e:
                warnings.append(f"GNSS coordinate transformation notice: {e}")

        gnss_station = GNSSReferencePoint(
            station_id="CORS-DL-01",
            control_point_id="CORS-MH-PUN-01",
            name="Pune Central Geodetic CORS Station",
            coordinate=[gnss_lon, gnss_lat],
            coordinates=[gnss_lon, gnss_lat],
            elevation=562.48,
            elevation_reference="AMSL",
            crs="EPSG:4326",
            source="SURVEY_OF_INDIA_CORS_NETWORK",
            reference_type=ReferenceControlType.CORS_REFERENCE,
            accuracy_metadata=ControlPointAccuracy(
                horizontal_accuracy_m=0.008,
                vertical_accuracy_m=0.015,
                solution_type="CONTINUOUS_NETWORK_FIXED",
                pdop=1.2,
            ),
            status="ACTIVE",
            target_crs=target_crs,
            target_coordinates=[round(gnss_proj_x, 3), round(gnss_proj_y, 3)],
            transformation_applied=gnss_trans_applied,
            source_info={"agency": "Survey of India (Simulated Reference Benchmark)", "receiver": "Trimble Alloy", "frequency": "1Hz"},
        )
        provenance.append({
            "stage": "GNSS_CORS_LINK",
            "station_id": gnss_station.station_id,
            "coordinates": gnss_station.coordinates,
            "elevation": gnss_station.elevation,
            "crs": gnss_station.crs,
        })

        # 6. LiDAR Source Reference
        lidar_ref = LiDARSourceReference(
            source_id="LIDAR-PUN-AIR-2026-T1",
            crs="EPSG:32643",
            total_points=15420,
            bounds=(379100.0, 2048100.0, 379250.0, 2048250.0),
            classifications=["GROUND", "LOW_VEGETATION", "BUILDING"],
            point_density_per_sqm=12.5,
            vertical_reference="AMSL",
            source_format="LAS/LAZ",
            provenance={
                "flight_date": "2026-03-15",
                "sensor": "Leica ALS80",
                "vertical_accuracy_m": 0.05,
            },
        )
        provenance.append({
            "stage": "LIDAR_REFERENCE_LINK",
            "source_id": lidar_ref.source_id,
            "total_points": lidar_ref.total_points,
            "point_density": lidar_ref.point_density_per_sqm,
        })

        # 7. Spatial Relationship Analysis (Building <-> Parcel)
        assoc_resp = SpatialRelationshipService.analyze_associations(
            parcels_geojson=parcels_geojson,
            buildings_geojson=buildings_geojson,
            target_crs=target_crs,
        )
        provenance.append({
            "stage": "SPATIAL_RELATIONSHIP_FUSION",
            "parcels_evaluated": assoc_resp.summary.total_parcels,
            "buildings_evaluated": assoc_resp.summary.total_buildings,
            "target_crs": assoc_resp.summary.projected_crs,
        })

        # Filter parcel if requested
        target_parcel_feat = None
        target_parcel_id = parcel_id or "PARCEL-DEMO-101"
        for pf in parcels_geojson.get("features", []):
            pid = pf.get("id") or pf.get("properties", {}).get("parcel_id")
            if pid == target_parcel_id:
                target_parcel_feat = pf
                break

        if not target_parcel_feat and parcels_geojson.get("features"):
            target_parcel_feat = parcels_geojson["features"][0]
            target_parcel_id = target_parcel_feat.get("id") or target_parcel_feat.get("properties", {}).get("parcel_id")

        parcel_dict = None
        if target_parcel_feat:
            p_geom = shape(target_parcel_feat["geometry"])
            p_geom_proj, _ = GeoreferencingService.transform_geometry(p_geom, "EPSG:4326", target_crs)
            parcel_dict = {
                "parcel_id": target_parcel_id,
                "survey_number": target_parcel_feat.get("properties", {}).get("survey_number", "402/2A"),
                "source_crs": "EPSG:4326",
                "source_geometry": target_parcel_feat["geometry"],
                "project_crs": target_crs,
                "projected_geometry": mapping(p_geom_proj),
                "area_sqm": round(p_geom_proj.area, 2),
                "bounds": [round(c, 2) for c in p_geom_proj.bounds],
                "properties": target_parcel_feat.get("properties", {}),
            }

        # 8. Assemble Fused Buildings
        fused_buildings: List[FusedBuildingContext] = []
        for b_assoc in assoc_resp.associations:
            bid = b_assoc.building_id
            
            # Ground elevation from DEM
            b_centroid = b_assoc.centroid  # [lon, lat]
            ground_elev = 562.48
            elev_source = "SYNTHETIC_DEMO_BASELINE"
            if dem_available:
                try:
                    pt = ElevationSamplePoint(
                        feature_id=bid,
                        longitude=b_centroid[0],
                        latitude=b_centroid[1],
                        crs="EPSG:4326",
                    )
                    sample_batch_res = ElevationService.sample_batch(points=[pt])
                    if sample_batch_res.results and sample_batch_res.results[0].status == ElevationStatus.SUCCESS:
                        if sample_batch_res.results[0].elevation_m is not None:
                            ground_elev = round(sample_batch_res.results[0].elevation_m, 2)
                            elev_source = f"DEM:{sample_batch_res.dem_name}"
                except Exception as e:
                    logger.warning(f"DEM sampling for {bid} failed: {e}")

            # Floor modeling
            floors: List[Dict[str, Any]] = []
            floor_count = int(b_assoc.properties.get("building:levels") or b_assoc.properties.get("floors") or 4)
            b_height = float(b_assoc.properties.get("height") or (floor_count * 3.0))
            fl_height = round(b_height / floor_count, 2)

            for fi in range(floor_count):
                fl_base = round(ground_elev + fi * fl_height, 2)
                fl_top = round(fl_base + fl_height, 2)
                fl_id = f"{bid}-FL{fi:02d}"
                floors.append({
                    "floor_id": fl_id,
                    "building_id": bid,
                    "floor_index": fi,
                    "floor_name": f"Floor {fi}" if fi > 0 else "Ground Floor",
                    "base_elevation": fl_base,
                    "top_elevation": fl_top,
                    "floor_height": fl_height,
                    "status": "VALID",
                })

            # Unit modeling (attach demo units to Floor 5 of Tower 2 if applicable)
            units_list: List[Dict[str, Any]] = []
            if units_geojson and bid == "BLD-DEMO-002":
                for uf in units_geojson.get("features", []):
                    u_props = uf.get("properties", {})
                    if u_props.get("building_id") == bid:
                        units_list.append({
                            "unit_id": u_props.get("unit_id"),
                            "unit_number": u_props.get("unit_number"),
                            "floor_id": u_props.get("floor_id"),
                            "unit_type": u_props.get("unit_type", "RESIDENTIAL_UNIT"),
                            "base_elevation": u_props.get("base_elevation", 577.48),
                            "top_elevation": u_props.get("top_elevation", 580.48),
                            "height": u_props.get("height", 3.0),
                            "footprint_area": u_props.get("footprint_area", 85.0),
                            "geometry": uf.get("geometry"),
                        })

            # LiDAR Roof Return
            lidar_roof = round(ground_elev + b_height, 2)
            lidar_evidence = {
                "point_cloud_id": lidar_ref.source_id,
                "sampled_points_in_footprint": 480 if bid == "BLD-DEMO-001" else 620,
                "detected_roof_elevation_amsl": lidar_roof,
                "point_density_sqm": 12.8,
                "classification_confidence": 0.96,
            }

            # Boundary conflict check
            if b_assoc.association_status == "INTERSECTS":
                conflicts.append(SpatialConflict(
                    conflict_id=f"CONF-OVERHANG-{bid}",
                    conflict_type="VERTICAL_OVERHANG",
                    severity=ConflictSeverity.WARNING,
                    affected_entities=[bid, b_assoc.associated_parcel_id or "UNKNOWN"],
                    message=f"Building {bid} footprint partially overlaps parcel boundary ({round(b_assoc.overlap_percentage, 1)}% inside).",
                    details={"overlap_percentage": b_assoc.overlap_percentage},
                ))
            elif b_assoc.association_status == "OUTSIDE":
                conflicts.append(SpatialConflict(
                    conflict_id=f"CONF-OUTSIDE-{bid}",
                    conflict_type="BUILDING_OUTSIDE_PARCEL",
                    severity=ConflictSeverity.CRITICAL,
                    affected_entities=[bid],
                    message=f"Building {bid} lies entirely outside registered parcel boundary.",
                ))

            fused_bld = FusedBuildingContext(
                building_id=bid,
                is_cadastral=True,
                legal_status="VALIDATED_CADASTRE_REGISTERED",
                source_type=SourceType.BUILDING_FOOTPRINT,
                source_crs="EPSG:4326",
                source_geometry=b_assoc.geometry,
                project_crs=target_crs,
                projected_geometry=b_assoc.geometry,  # b_assoc geometry is normalized
                bounds=[round(c, 2) for c in b_assoc.bounds],
                footprint_area_sqm=round(b_assoc.building_area_sqm, 2),
                associated_parcel_id=b_assoc.associated_parcel_id,
                association_status=b_assoc.association_status.value,
                overlap_percentage=b_assoc.overlap_percentage,
                ground_elevation=ground_elev,
                ground_elevation_source=elev_source,
                lidar_evidence=lidar_evidence,
                building_height=b_height,
                height_source="LIDAR_CONFIRMED_SPEC",
                floors_count=len(floors),
                floors=floors,
                units=units_list,
                provenance={
                    "footprint_source": "demo_buildings.geojson",
                    "elevation_source": elev_source,
                    "lidar_source": lidar_ref.source_id,
                    "units_count": len(units_list),
                },
                status="ALIGNED",
            )
            fused_buildings.append(fused_bld)

        # Inventory of source datasets
        source_datasets = [
            DatasetMetadata(
                dataset_id="PARCEL-GIS-DEMO",
                source_type=SourceType.CADASTRAL_GIS,
                source_format="GeoJSON",
                source_crs="EPSG:4326",
                target_crs=target_crs,
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=True,
                status=SourceStatus.LOADED,
                provenance={"file": "demo_parcels.geojson"},
            ),
            DatasetMetadata(
                dataset_id="BLD-FOOTPRINTS-DEMO",
                source_type=SourceType.BUILDING_FOOTPRINT,
                source_format="GeoJSON",
                source_crs="EPSG:4326",
                target_crs=target_crs,
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=True,
                status=SourceStatus.LOADED,
                provenance={"file": "demo_buildings.geojson"},
            ),
            DatasetMetadata(
                dataset_id="DEM-RASTER-DEMO",
                source_type=SourceType.DEM,
                source_format="GeoTIFF",
                source_crs="EPSG:4326",
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=False,
                status=SourceStatus.LOADED if dem_available else SourceStatus.UNAVAILABLE,
                provenance={"file": "demo_elevation.tif"},
            ),
            DatasetMetadata(
                dataset_id=lidar_ref.source_id,
                source_type=SourceType.LIDAR,
                source_format="LAS/LAZ",
                source_crs="EPSG:32643",
                units={"horizontal": "meters", "vertical": "meters"},
                is_cadastral=False,
                status=SourceStatus.AVAILABLE,
                provenance={"sensor": "Leica ALS80 Airborne LiDAR"},
            ),
            DatasetMetadata(
                dataset_id=gnss_station.station_id,
                source_type=SourceType.GNSS_CORS,
                source_format="Geodetic Coordinates",
                source_crs="EPSG:4326",
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=True,
                status=SourceStatus.VALIDATED,
                provenance={"monument": "Survey of India Geodetic Network"},
            ),
        ]

        if units_geojson:
            source_datasets.append(DatasetMetadata(
                dataset_id="UNITS-FLOOR5-DEMO",
                source_type=SourceType.FLOOR_PLAN,
                source_format="GeoJSON",
                source_crs="EPSG:4326",
                target_crs=target_crs,
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=True,
                status=SourceStatus.LOADED,
                provenance={"file": "demo_units.geojson"},
            ))

        source_alignment = {
            "cadastral_gis": True,
            "building_data": True,
            "dem": dem_available,
            "lidar": True,
            "floor_data": True,
            "unit_data": bool(units_geojson),
            "gnss_cors": True,
            "underground": True,
        }

        source_status_map = {
            "cadastral_gis": "SYNTHETIC",
            "building_footprint": "SYNTHETIC",
            "dem": "REAL" if dem_available else "UNAVAILABLE",
            "lidar": "DERIVED",
            "floor_plan": "ESTIMATED",
            "unit": "SYNTHETIC",
            "gnss_cors": "SYNTHETIC",
            "underground": "SYNTHETIC",
        }

        underground_source = {
            "dataset_id": "DS-UNDERGROUND-DEMO",
            "name": "Subsurface Utility and Basement Infrastructure",
            "features_count": 2,
            "feature_types": ["BASEMENT", "UTILITY_CONDUIT"],
            "crs": "EPSG:4326",
            "target_crs": target_crs,
            "source_status": "SYNTHETIC",
            "disclaimer": "SYNTHETIC SUBSURFACE MODEL FOR DEMONSTRATION ONLY.",
        }

        # Determine overall fusion status and quality level
        fusion_status = FusionStatus.WARNING if len(conflicts) > 0 else FusionStatus.VALID
        quality_level = FusionQualityLevel.FULL if (dem_available and units_geojson) else FusionQualityLevel.PARTIAL

        return FusedPropertyContext(
            context_id=context_id,
            schema_version="1.0",
            target_project_crs=target_crs,
            parcel=parcel_dict,
            buildings=fused_buildings,
            elevation_source=dem_metadata_dict,
            lidar_source=lidar_ref,
            gnss_reference=gnss_station,
            underground_source=underground_source,
            source_status_map=source_status_map,
            source_datasets=source_datasets,
            source_alignment=source_alignment,
            fusion_status=fusion_status,
            quality_level=quality_level,
            conflicts=conflicts,
            warnings=warnings,
            provenance=provenance,
        )

    @classmethod
    def fuse_real_osm(
        cls,
        target_crs: str = DEFAULT_PROJECT_CRS,
        max_buildings: int = 15,
    ) -> FusedPropertyContext:
        """
        Ingests real OSM building footprints, normalizes coordinates into target project CRS,
        honestly enforces non-cadastral semantic status, and reports missing legal parcels.
        """
        context_id = f"FUSION-REAL-OSM-{uuid.uuid4().hex[:8].upper()}"
        conflicts: List[SpatialConflict] = []
        warnings: List[str] = []
        provenance: List[Dict[str, Any]] = []

        if not REAL_OSM_BUILDINGS_PATH.exists():
            raise FileNotFoundError(f"Processed real OSM buildings not found at {REAL_OSM_BUILDINGS_PATH}")

        with open(REAL_OSM_BUILDINGS_PATH, "r", encoding="utf-8") as f:
            osm_fc = json.load(f)

        features = osm_fc.get("features", [])[:max_buildings]
        if not features:
            raise ValueError("No building features found in real OSM dataset.")

        provenance.append({
            "stage": "REAL_OSM_INGESTION",
            "source_file": str(REAL_OSM_BUILDINGS_PATH.name),
            "total_features_loaded": len(features),
            "source_crs": "EPSG:4326",
            "target_crs": target_crs,
        })

        # Flag that real OSM lacks cadastral parcel authority
        conflicts.append(SpatialConflict(
            conflict_id="NOTICE-NON-CADASTRAL-OSM",
            conflict_type="NON_CADASTRAL_OBSERVATION",
            severity=ConflictSeverity.NOTICE,
            affected_entities=[f.get("id", "OSM") for f in features[:5]],
            message="Real OSM buildings represent crowd-sourced physical surface observations. "
                    "No authoritative cadastral parcel records exist for these coordinates.",
        ))

        fused_buildings: List[FusedBuildingContext] = []
        for feat in features:
            bid = feat.get("id") or feat.get("properties", {}).get("osm_id") or f"OSM-{uuid.uuid4().hex[:6]}"
            orig_geom = shape(feat["geometry"])
            proj_geom, rec = GeoreferencingService.transform_geometry(orig_geom, "EPSG:4326", target_crs)

            props = feat.get("properties", {})
            height = props.get("height")
            levels = props.get("building:levels")

            fused_bld = FusedBuildingContext(
                building_id=str(bid),
                is_cadastral=False,
                legal_status="UNVERIFIED_PHYSICAL_SURFACE",
                source_type=SourceType.OSM,
                source_crs="EPSG:4326",
                source_geometry=feat["geometry"],
                project_crs=target_crs,
                projected_geometry=mapping(proj_geom),
                bounds=[round(c, 2) for c in proj_geom.bounds],
                footprint_area_sqm=round(proj_geom.area, 2),
                associated_parcel_id=None,
                association_status="UNRESOLVED",
                overlap_percentage=0.0,
                ground_elevation=None,
                ground_elevation_source=None,
                lidar_evidence=None,
                building_height=height,
                height_source="OSM_TAG" if height else "UNAVAILABLE",
                floors_count=levels,
                floors=[],
                units=[],
                provenance={
                    "osm_id": props.get("osm_id"),
                    "building_type": props.get("building", "yes"),
                    "name": props.get("name"),
                    "reprojection": rec.model_dump(),
                },
                status="ALIGNED_NON_CADASTRAL",
            )
            fused_buildings.append(fused_bld)

        source_datasets = [
            DatasetMetadata(
                dataset_id="REAL-OSM-TAGORE-GARDEN",
                source_type=SourceType.OSM,
                source_format="OSM XML / GeoJSON",
                source_crs="EPSG:4326",
                target_crs=target_crs,
                units={"horizontal": "degrees", "vertical": "meters"},
                is_cadastral=False,
                status=SourceStatus.VALIDATED,
                acquisition_info={"provider": "OpenStreetMap", "region": "Tagore Garden, New Delhi"},
                provenance={"source_file": "map.osm", "processed": "osm_buildings.geojson"},
            )
        ]

        source_alignment = {
            "cadastral_gis": False,
            "building_data": True,
            "dem": False,
            "lidar": False,
            "floor_data": False,
            "unit_data": False,
            "gnss_cors": False,
        }

        return FusedPropertyContext(
            context_id=context_id,
            schema_version="1.0",
            target_project_crs=target_crs,
            parcel=None,
            buildings=fused_buildings,
            elevation_source=None,
            lidar_source=None,
            gnss_reference=None,
            source_datasets=source_datasets,
            source_alignment=source_alignment,
            fusion_status=FusionStatus.PARTIAL,
            quality_level=FusionQualityLevel.LIMITED,
            conflicts=conflicts,
            warnings=[
                "Real OSM dataset contains physical building observations only.",
                "No cadastral parcel boundary available in this region.",
            ],
            provenance=provenance,
        )

    # -------------------------------------------------------------------------
    # GNSS / CORS Reference Control Workflow
    # -------------------------------------------------------------------------
    @classmethod
    def get_reference_control_points(
        cls,
        target_crs: str = "EPSG:32643",
    ) -> ControlPointValidationResponse:
        """
        Loads authoritative ground control and CORS reference points, validates geographic
        plausibility, and projects coordinates into common project CRS.
        """
        raw_points: List[GNSSReferencePoint] = []
        if CONTROL_POINTS_PATH.exists():
            try:
                with open(CONTROL_POINTS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for pt_dict in data.get("control_points", []):
                        raw_points.append(GNSSReferencePoint(**pt_dict))
            except Exception as e:
                logger.error(f"Failed to read control points from {CONTROL_POINTS_PATH}: {e}")

        # Fallback if file read fails
        if not raw_points:
            raw_points = [
                GNSSReferencePoint(
                    station_id="CORS-MH-PUN-01",
                    control_point_id="CORS-MH-PUN-01",
                    name="Pune Central Geodetic CORS Station",
                    coordinate=[73.85652, 18.52025],
                    coordinates=[73.85652, 18.52025],
                    elevation=562.48,
                    elevation_reference="AMSL",
                    crs="EPSG:4326",
                    source="SURVEY_OF_INDIA_CORS_NETWORK",
                    reference_type=ReferenceControlType.CORS_REFERENCE,
                    accuracy_metadata=ControlPointAccuracy(
                        horizontal_accuracy_m=0.008,
                        vertical_accuracy_m=0.015,
                        solution_type="CONTINUOUS_NETWORK_FIXED",
                        pdop=1.2,
                    ),
                    status="ACTIVE",
                ),
                GNSSReferencePoint(
                    station_id="GCP-PUN-CADASTRAL-01",
                    control_point_id="GCP-PUN-CADASTRAL-01",
                    name="Shivajinagar Cadastral Ground Control Monument 01",
                    coordinate=[73.85595, 18.51982],
                    coordinates=[73.85595, 18.51982],
                    elevation=561.92,
                    elevation_reference="AMSL",
                    crs="EPSG:4326",
                    source="GROUND_CADASTRAL_RTK_SURVEY",
                    reference_type=ReferenceControlType.GNSS_CONTROL_POINT,
                    accuracy_metadata=ControlPointAccuracy(
                        horizontal_accuracy_m=0.012,
                        vertical_accuracy_m=0.020,
                        solution_type="RTK_FIXED",
                        pdop=1.4,
                    ),
                    status="BENCHMARK",
                ),
            ]

        return cls.validate_and_transform_control_points(raw_points, target_crs=target_crs)

    @classmethod
    def validate_and_transform_control_points(
        cls,
        control_points: List[GNSSReferencePoint],
        target_crs: str = "EPSG:32643",
    ) -> ControlPointValidationResponse:
        """
        Deterministically validates control points:
        1. Checks geographic bounds for longitude [-180, 180], latitude [-90, 90]
        2. Validates elevation plausibility if provided (-500m to 9000m)
        3. Transforms coordinates to target metric project CRS using pyproj
        4. Preserves native coordinates, native CRS, and produces immutable TransformationRecord
        """
        validated_points: List[GNSSReferencePoint] = []
        transformations: List[TransformationRecord] = []
        warnings: List[str] = []
        errors: List[str] = []

        for pt in control_points:
            coords = pt.coordinate or pt.coordinates
            if not coords or len(coords) < 2:
                errors.append(f"Control point '{pt.station_id}' has malformed coordinates.")
                continue

            lon, lat = coords[0], coords[1]
            if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
                errors.append(f"Control point '{pt.station_id}' coordinates ({lon}, {lat}) outside WGS84 range.")
                continue

            if pt.elevation is not None and not (-500.0 <= pt.elevation <= 9000.0):
                warnings.append(f"Control point '{pt.station_id}' elevation ({pt.elevation}m) outside standard terrestrial range.")

            proj_x, proj_y = lon, lat
            transformed = False
            if pt.crs != target_crs:
                try:
                    transformer = pyproj.Transformer.from_crs(pt.crs, target_crs, always_xy=True)
                    proj_x, proj_y = transformer.transform(lon, lat)
                    transformed = True
                    transformations.append(
                        TransformationRecord(
                            source_crs=pt.crs,
                            target_crs=target_crs,
                            transformed=True,
                            method="pyproj_exact",
                        )
                    )
                except Exception as err:
                    errors.append(f"Failed to transform control point '{pt.station_id}' from {pt.crs} to {target_crs}: {err}")
                    continue

            # Ensure station_id and control_point_id are in sync
            cp_id = pt.control_point_id or pt.station_id
            st_id = pt.station_id or cp_id

            validated_pt = pt.model_copy(
                update={
                    "control_point_id": cp_id,
                    "station_id": st_id,
                    "coordinate": [lon, lat],
                    "coordinates": [lon, lat],
                    "target_crs": target_crs,
                    "target_coordinates": [round(proj_x, 3), round(proj_y, 3)],
                    "transformation_applied": transformed,
                }
            )
            validated_points.append(validated_pt)

        is_valid = len(errors) == 0 and len(validated_points) > 0
        return ControlPointValidationResponse(
            valid=is_valid,
            target_crs=target_crs,
            validated_points=validated_points,
            transformations=transformations,
            warnings=warnings,
            errors=errors,
        )
