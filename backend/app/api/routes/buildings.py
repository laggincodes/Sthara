from typing import List, Dict
import tempfile
import os
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from app.schemas.building_height import (
    HeightCalculationRequest,
    HeightCalculationResult,
    FloorGenerationRequest,
    FloorGenerationResponse,
    BuildingVerticalSpec,
    HeightSource,
)
from app.services.building_height_service import BuildingHeightService

router = APIRouter(prefix="/buildings", tags=["Buildings & Vertical Heights"])

# Pre-defined synthetic vertical specs for Pune demo buildings
DEMO_BUILDING_SPECS: Dict[str, BuildingVerticalSpec] = {
    "BLD-DEMO-001": BuildingVerticalSpec(
        building_id="BLD-DEMO-001",
        name="Commercial Plaza A",
        structure_type="Commercial",
        roof_elevation=574.48,
        building_height=12.0,
        number_of_floors=4,
        floor_height=3.0,
        height_source=HeightSource.SYNTHETIC_DEMO,
        vertical_datum="AMSL",
        height_unit="meters",
    ),
    "BLD-DEMO-002": BuildingVerticalSpec(
        building_id="BLD-DEMO-002",
        name="Residential Tower 1",
        structure_type="Residential",
        roof_elevation=583.48,
        building_height=21.0,
        number_of_floors=7,
        floor_height=3.0,
        height_source=HeightSource.SYNTHETIC_DEMO,
        vertical_datum="AMSL",
        height_unit="meters",
    ),
    "BLD-DEMO-003": BuildingVerticalSpec(
        building_id="BLD-DEMO-003",
        name="Inter-Parcel Connector Annex",
        structure_type="Mixed Utility",
        roof_elevation=568.48,
        building_height=6.0,
        number_of_floors=2,
        floor_height=3.0,
        height_source=HeightSource.SYNTHETIC_DEMO,
        vertical_datum="AMSL",
        height_unit="meters",
    ),
    "BLD-DEMO-004": BuildingVerticalSpec(
        building_id="BLD-DEMO-004",
        name="Northern Outpost Pavilion",
        structure_type="Auxiliary",
        roof_elevation=566.48,
        building_height=4.0,
        number_of_floors=1,
        floor_height=4.0,
        height_source=HeightSource.SYNTHETIC_DEMO,
        vertical_datum="AMSL",
        height_unit="meters",
    ),
}


@router.post(
    "/calculate-height",
    response_model=HeightCalculationResult,
    summary="Calculate structural building height from roof and ground elevations",
    description="Validates ground and roof elevations, unit compatibility, and sanity constraints, returning building height = roof - ground.",
)
async def calculate_building_height(request: HeightCalculationRequest) -> HeightCalculationResult:
    try:
        return BuildingHeightService.calculate_height(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating building height: {str(e)}",
        )


@router.post(
    "/generate-floors",
    response_model=FloorGenerationResponse,
    summary="Generate deterministic floor levels from building height",
    description="Slices building vertical volume into structured floor levels using Mode A (known floor count) or Mode B (explicit floor heights).",
)
async def generate_building_floors(request: FloorGenerationRequest) -> FloorGenerationResponse:
    try:
        return BuildingHeightService.generate_floors(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating building floors: {str(e)}",
        )


@router.get(
    "/demo-specs",
    response_model=List[BuildingVerticalSpec],
    summary="List synthetic vertical specifications for demo buildings",
    description="Returns pre-configured deterministic roof elevations, building heights, and floor counts for testing.",
)
async def get_demo_building_specs() -> List[BuildingVerticalSpec]:
    return list(DEMO_BUILDING_SPECS.values())


from pathlib import Path
import json
from shapely.geometry import shape
from app.schemas.geometry_3d import (
    BatchBuilding3DRequest,
    Generate3DResponse,
    Building3DRequest,
    SCHEMA_VERSION,
    BatchSummary3D,
)
from app.schemas.elevation import ElevationSamplePoint
from app.services.extrusion_service import ExtrusionService
from app.services.elevation_service import ElevationService

DATA_PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "processed"


@router.post(
    "/generate-3d",
    response_model=Generate3DResponse,
    summary="Generate canonical 3D polyhedral mesh geometry for batch of building footprints",
    description="Extrudes 2D building footprints into closed, watertight 3D solid meshes conforming to 3D Geometry Contract v1.0.",
)
async def generate_3d_buildings(request: BatchBuilding3DRequest) -> Generate3DResponse:
    try:
        return ExtrusionService.extrude_batch(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating 3D buildings: {str(e)}",
        )


@router.post(
    "/extrude-demo",
    response_model=Generate3DResponse,
    summary="Extrude all preloaded demo buildings into canonical 3D solids",
    description="Samples ground elevation from demo DEM for each demo building footprint and extrudes using verified vertical specifications.",
)
async def extrude_demo_buildings() -> Generate3DResponse:
    demo_file = DATA_PROCESSED_DIR / "demo_buildings.geojson"
    if not demo_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo building dataset demo_buildings.geojson not found on disk.",
        )

    try:
        with open(demo_file, "r", encoding="utf-8-sig") as f:
            geojson_data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read demo_buildings.geojson: {str(e)}",
        )

    features = geojson_data.get("features", [])
    if not features:
        return Generate3DResponse(
            schema_version=SCHEMA_VERSION,
            results=[],
            summary=BatchSummary3D(requested=0, successful=0, failed=0),
        )


    # 1. Sample centroids for ground elevations
    sample_points: List[ElevationSamplePoint] = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"
        try:
            poly = shape(geom)
            centroid = poly.centroid
            sample_points.append(
                ElevationSamplePoint(
                    point_id=b_id,
                    longitude=centroid.x,
                    latitude=centroid.y,
                )
            )
        except Exception:
            pass

    sampled_elevations = {}
    if sample_points:
        try:
            sample_res = ElevationService.sample_batch(sample_points)
            for r in sample_res.results:
                if r.status.value == "SUCCESS" and r.elevation_m is not None:
                    sampled_elevations[r.point_id] = r.elevation_m
        except Exception:
            pass

    # 2. Build 3D extrusion requests
    building_requests: List[Building3DRequest] = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"

        # Fallback to demo spec if properties are missing
        spec = DEMO_BUILDING_SPECS.get(b_id)
        ground_z = sampled_elevations.get(b_id, 562.48)
        roof_z = props.get("roof_elevation") or (spec.roof_elevation if spec else None)
        height = props.get("building_height") or (spec.building_height if spec else None)

        building_requests.append(
            Building3DRequest(
                building_id=b_id,
                footprint_geometry=geom,
                ground_elevation=ground_z,
                roof_elevation=roof_z,
                building_height=height,
                source_crs="EPSG:4326",
                target_crs="EPSG:32643",
            )
        )

    batch_req = BatchBuilding3DRequest(
        buildings=building_requests,
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )

    return ExtrusionService.extrude_batch(batch_req)


from app.schemas.property_volume import (
    BatchBuildingFloors3DRequest,
    BuildingFloors3DRequest,
    GenerateFloors3DResponse,
)
from app.services.floor_volume_service import FloorVolumeService


@router.post(
    "/generate-floors-3d",
    response_model=GenerateFloors3DResponse,
    summary="Generate canonical 3D floor solids for batch of building footprints",
    description="Extrudes independent watertight 3D floor solids for each building according to verified vertical elevations.",
)
async def generate_3d_floors(request: BatchBuildingFloors3DRequest) -> GenerateFloors3DResponse:
    try:
        return FloorVolumeService.generate_floors_batch(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating 3D floor solids: {str(e)}",
        )


@router.post(
    "/extrude-demo-floors",
    response_model=GenerateFloors3DResponse,
    summary="Extrude 3D floor solids for all preloaded demo buildings",
    description="Samples DEM ground elevations, resolves floor specifications from demo building specs, and generates canonical 3D floor solids.",
)
async def extrude_demo_floors() -> GenerateFloors3DResponse:
    demo_file = DATA_PROCESSED_DIR / "demo_buildings.geojson"
    if not demo_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo building dataset demo_buildings.geojson not found on disk.",
        )

    try:
        with open(demo_file, "r", encoding="utf-8-sig") as f:
            geojson_data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read demo_buildings.geojson: {str(e)}",
        )

    features = geojson_data.get("features", [])
    if not features:
        return GenerateFloors3DResponse(
            schema_version=SCHEMA_VERSION,
            results=[],
            summary=BatchSummary3D(requested=0, successful=0, failed=0),
        )

    # 1. Sample centroids for ground elevations
    sample_points: List[ElevationSamplePoint] = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"
        try:
            poly = shape(geom)
            centroid = poly.centroid
            sample_points.append(
                ElevationSamplePoint(
                    point_id=b_id,
                    longitude=centroid.x,
                    latitude=centroid.y,
                )
            )
        except Exception:
            pass

    sampled_elevations = {}
    if sample_points:
        try:
            sample_res = ElevationService.sample_batch(sample_points)
            for r in sample_res.results:
                if r.status.value == "SUCCESS" and r.elevation_m is not None:
                    sampled_elevations[r.point_id] = r.elevation_m
        except Exception:
            pass

    # 2. Build 3D floor extrusion requests
    building_floor_requests: List[BuildingFloors3DRequest] = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"

        spec = DEMO_BUILDING_SPECS.get(b_id)
        ground_z = sampled_elevations.get(b_id, 562.48)
        roof_z = props.get("roof_elevation") or (spec.roof_elevation if spec else None)
        height = props.get("building_height") or (spec.building_height if spec else None)
        num_floors = props.get("number_of_floors") or (spec.number_of_floors if spec else 4)
        floor_h = props.get("floor_height") or (spec.floor_height if spec else 3.0)

        # Map to associated parcel
        p_id = "PARCEL-DEMO-101" if b_id in ["BLD-DEMO-001", "BLD-DEMO-003", "BLD-DEMO-004"] else "PARCEL-DEMO-102"

        building_floor_requests.append(
            BuildingFloors3DRequest(
                building_id=b_id,
                parcel_id=p_id,
                footprint_geometry=geom,
                ground_elevation=ground_z,
                roof_elevation=roof_z,
                building_height=height,
                number_of_floors=num_floors,
                floor_height=floor_h,
                source_crs="EPSG:4326",
                target_crs="EPSG:32643",
            )
        )

    batch_req = BatchBuildingFloors3DRequest(
        buildings=building_floor_requests,
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )

    return FloorVolumeService.generate_floors_batch(batch_req)




import xml.etree.ElementTree as _ET

from app.services.osm_service import (
    OSMBuildingExtractor,
    DEFAULT_RAW_OSM_PATH,
    DEFAULT_PROCESSED_BUILDINGS_PATH,
)

# Maximum .osm upload size: 50 MB (OSM exports can be large)
OSM_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


@router.post(
    "/import-osm",
    summary="Import and convert real OpenStreetMap building data",
    description="Parses raw map.osm XML, extracts validated closed 2D building polygons with OSM metadata, and writes to processed storage.",
)
async def import_osm_buildings():
    if not DEFAULT_RAW_OSM_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw OSM file not found at {DEFAULT_RAW_OSM_PATH}",
        )
    try:
        geojson_data, summary = OSMBuildingExtractor.convert_and_save(
            osm_source_path=DEFAULT_RAW_OSM_PATH,
            output_geojson_path=DEFAULT_PROCESSED_BUILDINGS_PATH,
        )
        return {
            "status": "success",
            "message": f"Successfully extracted and converted {summary['total_extracted_buildings']} real OSM buildings.",
            "data": {
                "summary": summary,
                "output_file": str(DEFAULT_PROCESSED_BUILDINGS_PATH),
                "feature_count": summary["total_extracted_buildings"],
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import OSM buildings: {str(e)}",
        )


@router.post(
    "/upload-osm",
    summary="Upload a user-provided .osm file and extract real building footprints",
    description=(
        "Accepts a multipart .osm file upload, validates structure, safely replaces "
        "the canonical raw OSM source, extracts validated building polygons via the "
        "existing OSMBuildingExtractor, and writes processed GeoJSON to storage. "
        "Does NOT fabricate data. OSM data is NOT cadastral."
    ),
)
async def upload_osm_file(file: UploadFile = File(...)):
    """
    Upload endpoint for user-provided .osm files.
    Validation order:
      1. Extension must be .osm
      2. File size must be <= OSM_MAX_UPLOAD_BYTES (50 MB)
      3. Content must be valid UTF-8
      4. Content must be parseable XML
      5. XML root element must be <osm>
    On success: saves to DEFAULT_RAW_OSM_PATH (atomic), runs extractor, returns summary.
    """
    from app.core.logging import logger

    # 1. Extension check
    filename = file.filename or "unknown"
    clean_name = os.path.basename(filename)
    if not clean_name.lower().endswith(".osm"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .osm (OpenStreetMap XML) files are accepted here.",
        )

    # 2. Read bytes with size guard
    try:
        content_bytes = await file.read(OSM_MAX_UPLOAD_BYTES + 1024)
        if len(content_bytes) > OSM_MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum permitted size of {OSM_MAX_UPLOAD_BYTES // (1024 * 1024)} MB for OSM uploads.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading uploaded OSM file '{clean_name}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded file.",
        )

    # 3. UTF-8 decode check
    try:
        raw_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OSM file must be UTF-8 encoded. The uploaded file could not be decoded.",
        )

    # 4. XML parse check
    try:
        root = _ET.fromstring(raw_text)
    except _ET.ParseError as xml_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed XML: {xml_err}. Upload a valid OpenStreetMap .osm file.",
        )

    # 5. OSM root element check
    if root.tag != "osm":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File root element is <{root.tag}>, expected <osm>. Upload a valid OpenStreetMap .osm file.",
        )

    # Check for minimal OSM elements (at least one node, way, or relation)
    has_nodes = root.find("node") is not None
    has_ways = root.find("way") is not None
    has_relations = root.find("relation") is not None
    if not (has_nodes or has_ways or has_relations):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The OSM file contains no nodes, ways, or relations. It appears to be empty or invalid.",
        )

    # 6. Atomically write to the canonical raw OSM path via temp file
    dest_dir = DEFAULT_RAW_OSM_PATH.parent
    dest_dir.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=str(dest_dir), suffix=".osm.tmp")
    try:
        try:
            with os.fdopen(tmp_fd, "wb") as tmp_f:
                tmp_f.write(content_bytes)
        except Exception as e:
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write uploaded OSM file to temporary storage: {str(e)}",
            )
        # Atomic rename (same filesystem)
        try:
            os.replace(tmp_path, str(DEFAULT_RAW_OSM_PATH))
        except Exception as e:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to commit uploaded OSM file: {str(e)}",
            )
    except HTTPException:
        raise
    except Exception as e:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error saving OSM file: {str(e)}",
        )

    # 7. Run the existing extractor
    try:
        geojson_data, summary = OSMBuildingExtractor.convert_and_save(
            osm_source_path=DEFAULT_RAW_OSM_PATH,
            output_geojson_path=DEFAULT_PROCESSED_BUILDINGS_PATH,
        )
        logger.info(
            f"upload-osm: '{clean_name}' -> {summary['total_extracted_buildings']} buildings, "
            f"valid={summary['validation']['valid']}"
        )
        return {
            "status": "success",
            "message": (
                f"Successfully imported '{clean_name}': "
                f"{summary['total_extracted_buildings']} building(s) extracted."
            ),
            "source_filename": clean_name,
            "output_file": str(DEFAULT_PROCESSED_BUILDINGS_PATH),
            "data": {
                "summary": summary,
                "feature_count": summary["total_extracted_buildings"],
                "is_cadastral": False,
                "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
                "data_type": "NON_CADASTRAL_PHYSICAL_BUILDING_DATA",
                "source": "OpenStreetMap",
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OSM extraction failed after upload: {str(e)}",
        )


@router.get(
    "/real-osm",
    summary="Get processed real OpenStreetMap building footprints GeoJSON",
    description="Returns canonical GeoJSON FeatureCollection of extracted real OSM buildings.",
)
async def get_real_osm_buildings():
    if not DEFAULT_PROCESSED_BUILDINGS_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processed OSM buildings dataset not found. Call POST /buildings/import-osm first.",
        )
    try:
        with open(DEFAULT_PROCESSED_BUILDINGS_PATH, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
        return {
            "status": "success",
            "dataset_id": "real_osm_buildings",
            "feature_count": len(data.get("features", [])),
            "is_cadastral": False,
            "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
            "data": data,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read processed OSM buildings: {str(e)}",
        )


@router.get(
    "/real-osm/summary",
    summary="Get real OpenStreetMap building extraction and validation summary",
    description="Returns metadata statistics, bounding box, and geometry validation report for real OSM dataset.",
)
async def get_real_osm_summary():
    if not DEFAULT_RAW_OSM_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw OSM file not found at {DEFAULT_RAW_OSM_PATH}",
        )
    try:
        _, summary = OSMBuildingExtractor.extract_from_file(DEFAULT_RAW_OSM_PATH)
        return {
            "status": "success",
            "data": summary,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze OSM file: {str(e)}",
        )
