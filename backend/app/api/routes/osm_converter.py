from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse, JSONResponse

from app.schemas.osm_converter import (
    Osm3DConversionConfig,
    Osm3DConversionResponse,
    OsmDatasetItem,
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


@router.get(
    "/datasets",
    response_model=List[OsmDatasetItem],
    summary="List all registered datasets and their conversion states",
)
async def list_datasets() -> List[OsmDatasetItem]:
    return Osm3DConverterService.list_datasets()


@router.post(
    "/upload",
    response_model=OsmDatasetItem,
    summary="Upload and register geospatial file (.osm, .geojson) without executing conversion yet",
)
async def upload_dataset_file(
    file: UploadFile = File(...),
) -> OsmDatasetItem:
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

    return Osm3DConverterService.register_dataset(dataset_name=clean_name, content=content_bytes)


@router.post(
    "/convert-3d",
    response_model=Osm3DConversionResponse,
    summary="Execute end-to-end 3D conversion pipeline on active or specified OSM dataset",
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
    summary="Get status, stage logs, and performance metrics from the last or specific 3D conversion",
)
async def get_conversion_status(
    dataset_id: Optional[str] = Query(None, description="Optional dataset_id to filter report for")
):
    report = Osm3DConverterService.get_last_report(dataset_id=dataset_id)
    if not report:
        detail_msg = (
            f"No 3D conversion found for dataset '{dataset_id}'."
            if dataset_id
            else "No 3D conversion has been executed in this session yet."
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail_msg,
        )
    return {"status": "success", "data": report}


# -------------------------------------------------------------
# EXPORT ENDPOINTS (Specific Dataset & Latest)
# -------------------------------------------------------------

@export_router.get(
    "/glb/{dataset_id}",
    summary="Download Binary GLB 2.0 3D model for specific dataset or latest",
)
async def export_dataset_glb(dataset_id: str):
    path = Osm3DConverterService.get_glb_path(dataset_id)
    if not path or not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GLB model found for dataset '{dataset_id}'. Run 3D conversion first.",
        )
    return FileResponse(
        path=path,
        media_type="model/gltf-binary",
        filename=f"{dataset_id}_model_3d.glb" if dataset_id != "latest" else "city_model_3d.glb",
    )


@export_router.get(
    "/gltf/{dataset_id}",
    summary="Download glTF JSON model descriptor for specific dataset or latest",
)
async def export_dataset_gltf(dataset_id: str):
    path = Osm3DConverterService.get_gltf_path(dataset_id)
    if not path or not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No glTF model found for dataset '{dataset_id}'. Run 3D conversion first.",
        )
    return FileResponse(
        path=path,
        media_type="model/gltf+json",
        filename=f"{dataset_id}_model_3d.gltf" if dataset_id != "latest" else "city_model_3d.gltf",
    )


@export_router.get(
    "/metadata/{dataset_id}",
    summary="Download architectural metadata JSON for all 3D building entities of dataset",
)
async def export_dataset_metadata(dataset_id: str):
    path = Osm3DConverterService.get_metadata_path(dataset_id)
    if not path or not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No metadata found for dataset '{dataset_id}'. Run 3D conversion first.",
        )
    return FileResponse(
        path=path,
        media_type="application/json",
        filename=f"{dataset_id}_metadata.json" if dataset_id != "latest" else "city_metadata.json",
    )
