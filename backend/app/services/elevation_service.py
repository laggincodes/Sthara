from typing import Dict, Any, List, Optional, Tuple
import os
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window
import pyproj

from app.schemas.elevation import (
    ElevationStatus,
    ElevationSamplePoint,
    ElevationSampleResult,
    ElevationBatchSampleResponse,
    DEMMetadata,
)
from app.core.logging import logger

DATA_RAW_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"
DEFAULT_DEM_PATH = DATA_RAW_DIR / "demo_elevation.tif"


class ElevationService:
    """
    Deterministic service for Digital Elevation Model (DEM) inspection,
    CRS transformation, and centroid ground elevation sampling.
    """

    @staticmethod
    def resolve_dem_path(dem_name: Optional[str] = None) -> Path:
        """Safely resolves DEM path within allowed data directory."""
        if not dem_name or dem_name.strip() in ("", "default", "demo_elevation.tif"):
            path = DEFAULT_DEM_PATH
        else:
            # Prevent path traversal
            safe_name = os.path.basename(dem_name)
            path = DATA_RAW_DIR / safe_name

        if not path.exists():
            raise FileNotFoundError(f"DEM raster not found at '{path.name}'.")
        return path

    @classmethod
    def get_dem_metadata(cls, dem_name: Optional[str] = None) -> DEMMetadata:
        """Inspects and validates DEM raster properties, CRS, and elevation statistics."""
        path = cls.resolve_dem_path(dem_name)

        try:
            with rasterio.open(path) as src:
                if src.count < 1:
                    raise ValueError(f"Raster '{path.name}' has 0 raster bands.")

                crs_str = src.crs.to_string() if src.crs else "UNKNOWN"
                is_proj = src.crs.is_projected if src.crs else False
                bounds = (float(src.bounds.left), float(src.bounds.bottom), float(src.bounds.right), float(src.bounds.top))
                res = (float(src.res[0]), float(src.res[1]))
                nodata = float(src.nodata) if src.nodata is not None else None

                # Read band 1 with masked array for accurate statistics ignoring NoData
                band_data = src.read(1, masked=True)
                if band_data.count() == 0:
                    raise ValueError(f"Raster '{path.name}' contains only NoData values.")

                min_elev = round(float(band_data.min()), 2)
                max_elev = round(float(band_data.max()), 2)
                mean_elev = round(float(band_data.mean()), 2)

                tags = src.tags()
                vert_unit = tags.get("VERTICAL_UNIT", "meters")
                vert_ref = tags.get("VERTICAL_REFERENCE", "AMSL (Above Mean Sea Level)")

                return DEMMetadata(
                    filename=path.name,
                    format=src.driver,
                    width=src.width,
                    height=src.height,
                    crs=crs_str,
                    crs_is_projected=is_proj,
                    bounds=bounds,
                    resolution=res,
                    nodata_value=nodata,
                    min_elevation_m=min_elev,
                    max_elevation_m=max_elev,
                    mean_elevation_m=mean_elev,
                    vertical_unit=vert_unit,
                    vertical_reference=vert_ref,
                    tags=tags,
                )
        except rasterio.errors.RasterioError as e:
            raise ValueError(f"Invalid DEM GeoTIFF raster: {str(e)}")

    @classmethod
    def sample_batch(
        cls,
        points: List[ElevationSamplePoint],
        dem_name: Optional[str] = None,
    ) -> ElevationBatchSampleResponse:
        """Samples elevation for a batch of coordinates from the specified DEM."""
        path = cls.resolve_dem_path(dem_name)

        with rasterio.open(path) as src:
            dem_crs = src.crs.to_string() if src.crs else "EPSG:4326"
            bounds = src.bounds
            nodata = src.nodata
            tags = src.tags()
            vert_unit = tags.get("VERTICAL_UNIT", "meters")
            vert_ref = tags.get("VERTICAL_REFERENCE", "AMSL (Above Mean Sea Level)")

            results: List[ElevationSampleResult] = []
            success_count = 0
            outside_count = 0
            nodata_count = 0

            # Cache transformers by source CRS
            transformers: Dict[str, pyproj.Transformer] = {}

            for p in points:
                orig_x, orig_y = p.longitude, p.latitude
                point_crs = p.crs or "EPSG:4326"

                # 1. Coordinate Reprojection if point CRS != DEM CRS
                transformed_coords: Optional[Tuple[float, float]] = None
                query_x, query_y = orig_x, orig_y

                if point_crs.upper() != dem_crs.upper():
                    if point_crs not in transformers:
                        transformers[point_crs] = pyproj.Transformer.from_crs(
                            point_crs, dem_crs, always_xy=True
                        )
                    tf = transformers[point_crs]
                    query_x, query_y = tf.transform(orig_x, orig_y)
                    transformed_coords = (round(query_x, 6), round(query_y, 6))

                # 2. Check Bounding Box Coverage
                if (
                    query_x < bounds.left
                    or query_x > bounds.right
                    or query_y < bounds.bottom
                    or query_y > bounds.top
                ):
                    results.append(
                        ElevationSampleResult(
                            feature_id=p.feature_id,
                            elevation_m=None,
                            status=ElevationStatus.OUTSIDE_COVERAGE,
                            source_dem=path.name,
                            dem_crs=dem_crs,
                            query_coords=(round(orig_x, 6), round(orig_y, 6)),
                            transformed_coords=transformed_coords,
                            sampling_method="centroid_nearest",
                            vertical_unit=vert_unit,
                            vertical_reference=vert_ref,
                            metadata={"reason": "Point falls outside raster bounding extents"},
                        )
                    )
                    outside_count += 1
                    continue

                # 3. Sample raster cell
                row, col = src.index(query_x, query_y)
                # Clamp within raster bounds
                row = min(max(0, row), src.height - 1)
                col = min(max(0, col), src.width - 1)

                val_arr = src.read(1, window=Window(col, row, 1, 1))
                val = float(val_arr[0, 0])

                # 4. Check NoData
                if (nodata is not None and np.isclose(val, nodata)) or np.isnan(val):
                    results.append(
                        ElevationSampleResult(
                            feature_id=p.feature_id,
                            elevation_m=None,
                            status=ElevationStatus.NODATA,
                            source_dem=path.name,
                            dem_crs=dem_crs,
                            query_coords=(round(orig_x, 6), round(orig_y, 6)),
                            transformed_coords=transformed_coords,
                            sampling_method="centroid_nearest",
                            vertical_unit=vert_unit,
                            vertical_reference=vert_ref,
                            metadata={"reason": "Raster cell contains designated NoData sentinel"},
                        )
                    )
                    nodata_count += 1
                    continue

                # 5. Success
                elev_m = round(val, 2)
                results.append(
                    ElevationSampleResult(
                        feature_id=p.feature_id,
                        elevation_m=elev_m,
                        status=ElevationStatus.SUCCESS,
                        source_dem=path.name,
                        dem_crs=dem_crs,
                        query_coords=(round(orig_x, 6), round(orig_y, 6)),
                        transformed_coords=transformed_coords,
                        sampling_method="centroid_nearest",
                        vertical_unit=vert_unit,
                        vertical_reference=vert_ref,
                        metadata={
                            "raster_row": row,
                            "raster_col": col,
                        },
                    )
                )
                success_count += 1

            return ElevationBatchSampleResponse(
                dem_name=path.name,
                total_samples=len(points),
                successful_samples=success_count,
                outside_coverage_samples=outside_count,
                nodata_samples=nodata_count,
                results=results,
            )
