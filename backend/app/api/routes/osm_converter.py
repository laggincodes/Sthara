from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, JSONResponse

from app.schemas.osm_converter import (
    Osm3DConversionConfig,
    Osm3DConversionResponse,
    HeightSourceOption,
    ExportFormatOption,
)
from app.services.osm_3d_converter import (
    Osm3DConverterService,
    OUTPUT_GLB_PATH,
    OUTPUT_GLTF_PATH,
    OUTPUT_METADATA_PATH,
)
from app.core.logging import logger

router = APIRouter(prefix="/osm", tags=["OSM to 3D Conversion & Export"])
export_router = APIRouter(prefix="/export", tags=["3D Model Exports"])


@router.post(
    "/convert-3d",
    response_model=Osm3DConversionResponse,
    summary="Execute end-to-end 3D conversion pipeline on active OSM dataset",
    description="Converts OSM or GeoJSON building footprints into watertight 3D solid models, exports GLB/GLTF, and reports all stage metrics.",
)
async def convert_osm_dataset(config: Osm3DConversionConfig) -> Osm3DConversionResponse:
    try:
        return Osm3DConverterService.convert_osm_to_3d(config)
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"OSM 3D conversion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"3D conversion failed: {str(e)}",
        )


@router.post(
    "/upload-and-convert",
    response_model=Osm3DConversionResponse,
    summary="Upload geospatial file (.osm, .geojson) and immediately convert to 3D model",
)
async def upload_and_convert_dataset(
    file: UploadFile = File(...),
    height_source: HeightSourceOption = Form(HeightSourceOption.AUTOMATIC),
    default_floor_height_m: float = Form(3.0),
    default_building_height_m: float = Form(9.0),
    target_crs: str = Form("auto"),
    export_format: ExportFormatOption = Form(ExportFormatOption.BOTH),
) -> Osm3DConversionResponse:
    filename = file.filename or "uploaded.osm"
    clean_name = Path(filename).name
    lower_name = clean_name.lower()

    if not (lower_name.endswith(".osm") or lower_name.endswith(".geojson") or lower_name.endswith(".json")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Upload an OpenStreetMap .osm XML file or GeoJSON .geojson/.json.",
        )

    try:
        content_bytes = await file.read(50 * 1024 * 1024 + 1024)
        if len(content_bytes) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File exceeds maximum permitted size of 50 MB.",
            )
        raw_text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be encoded in valid UTF-8 text.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read upload: {str(e)}",
        )

    config = Osm3DConversionConfig(
        height_source=height_source,
        default_floor_height_m=default_floor_height_m,
        default_building_height_m=default_building_height_m,
        target_crs=target_crs,
        export_format=export_format,
    )

    try:
        return Osm3DConverterService.convert_osm_to_3d(
            config=config,
            raw_xml_content=raw_text,
            source_name_override=clean_name,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Direct conversion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversion error: {str(e)}",
        )


@router.get(
    "/conversion-status",
    summary="Get status, stage logs, and performance metrics from the last 3D conversion",
)
async def get_conversion_status():
    report = Osm3DConverterService.get_last_report()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No 3D conversion has been executed in this session yet.",
        )
    return {"status": "success", "data": report}


# -------------------------------------------------------------
# EXPORT ENDPOINTS
# -------------------------------------------------------------

@export_router.get(
    "/glb/latest",
    summary="Download latest generated Binary GLB 2.0 3D model",
)
async def export_latest_glb():
    if not OUTPUT_GLB_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No GLB model generated yet. Run OSM -> 3D conversion first.",
        )
    return FileResponse(
        path=OUTPUT_GLB_PATH,
        media_type="model/gltf-binary",
        filename="city_model_3d.glb",
    )


@export_router.get(
    "/gltf/latest",
    summary="Download latest generated glTF JSON model descriptor",
)
async def export_latest_gltf():
    if not OUTPUT_GLTF_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No glTF model generated yet. Run OSM -> 3D conversion first.",
        )
    return FileResponse(
        path=OUTPUT_GLTF_PATH,
        media_type="model/gltf+json",
        filename="city_model_3d.gltf",
    )


@export_router.get(
    "/metadata/latest",
    summary="Download architectural metadata JSON for all 3D building entities",
)
async def export_latest_metadata():
    if not OUTPUT_METADATA_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No metadata exported yet. Run OSM -> 3D conversion first.",
        )
    return FileResponse(
        path=OUTPUT_METADATA_PATH,
        media_type="application/json",
        filename="city_metadata.json",
    )
