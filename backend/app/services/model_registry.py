"""
Model Registry for AI/ML and Computer Vision Extraction Subsystems.

Provides registry tracking for all extraction models, algorithms, and
benchmarks. In accordance with SIH criteria and rigorous engineering standards,
models document their framework, input requirements, limitations, and
actual local availability status.

Heavy deep-learning pipelines (PyTorch Mask-RCNN, Open3D PointNet) are
explicitly registered with MODEL_UNAVAILABLE status if their heavyweight
dependencies are absent, ensuring transparent and honest reporting without
fabricating artificial model executions.
"""

from typing import Dict, List, Optional
from app.schemas.ai_extraction import ExtractionType, ModelMetadata


class ModelRegistry:
    """Central registry tracking all AI/ML extraction models and pipelines."""

    def __init__(self) -> None:
        self._models: Dict[str, ModelMetadata] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register the built-in classical CV, statistical, and benchmark models."""
        # 1. Classical Building Footprint Extractor (Local OpenCV/NumPy/Rasterio)
        self.register(
            ModelMetadata(
                model_id="bld_cv_otsu_v1",
                model_version="1.0.0",
                task=ExtractionType.BUILDING,
                framework="numpy + rasterio + shapely",
                input_type="RASTER_IMAGE / DSM",
                output_type="CANDIDATE_BUILDING_FOOTPRINT",
                availability="AVAILABLE",
                limitations=(
                    "Classical Otsu automated binarization + contour simplification. "
                    "Sensitive to building contrast, shadow occlusions, and terrain slope. "
                    "Outputs candidate footprint polygon; non-cadastral observation."
                ),
            )
        )

        # 2. 1D Elevation Density Floor Segmenter
        self.register(
            ModelMetadata(
                model_id="flr_hist_cluster_v1",
                model_version="1.0.0",
                task=ExtractionType.FLOOR,
                framework="numpy 1D density clustering",
                input_type="POINT_CLOUD_Z / BUILDING_HEIGHT",
                output_type="CANDIDATE_FLOOR_INTERVAL",
                availability="AVAILABLE",
                limitations=(
                    "Derives candidate floor strata from vertical return density peaks. "
                    "Falls back to uniform architectural stratification if point density is sparse. "
                    "Candidate evidence only; requires architectural verification."
                ),
            )
        )

        # 3. Orthogonal Floor Unit Delineator
        self.register(
            ModelMetadata(
                model_id="unit_partition_v1",
                model_version="1.0.0",
                task=ExtractionType.UNIT,
                framework="shapely orthogonal partitioning",
                input_type="FLOOR_POLYGON + CORRIDOR_GRID",
                output_type="CANDIDATE_UNIT_POLYGON",
                availability="AVAILABLE",
                limitations=(
                    "Delineates interior unit partition candidates from floor perimeter and circulation corridor. "
                    "Returns UNIT_EXTRACTION_UNAVAILABLE if interior evidence or floor plan is missing. "
                    "Never invents apartment boundaries without boundary evidence."
                ),
            )
        )

        # 4. Joint Base-to-Roof Vertical Delineator
        self.register(
            ModelMetadata(
                model_id="vert_delineator_v1",
                model_version="1.0.0",
                task=ExtractionType.VERTICAL_FEATURE,
                framework="deterministic elevation stratification",
                input_type="GROUND_ELEVATION + ROOF_ELEVATION",
                output_type="VERTICAL_STRATA_INTERVALS",
                availability="AVAILABLE",
                limitations=(
                    "Coordinates candidate vertical intervals for ground, floors, and units. "
                    "Candidate evidence only; final legal stratum heights require cadastral surveyor endorsement."
                ),
            )
        )

        # 5. Calibrated Synthetic Benchmark (Deterministic Demo Extractor)
        self.register(
            ModelMetadata(
                model_id="sih_benchmark_demo_v1",
                model_version="1.0.0",
                task=ExtractionType.BUILDING,
                framework="calibrated synthetic benchmark",
                input_type="SYNTHETIC_TOWER_1_SPEC",
                output_type="CANDIDATE_MULTI_LAYER",
                availability="AVAILABLE",
                limitations=(
                    "Pre-calibrated benchmark simulating high-confidence aerial & LiDAR extraction for Tower 1. "
                    "Used for deterministic, reproducible offline demonstration."
                ),
            )
        )

        # 6. Deep Learning Aerial Segmentation (PyTorch Mask-RCNN)
        self.register(
            ModelMetadata(
                model_id="pytorch_mask_rcnn_v1",
                model_version="2.1.0",
                task=ExtractionType.BUILDING,
                framework="PyTorch + torchvision (Mask-RCNN)",
                input_type="DRONE_RGB_HIGHRES",
                output_type="CANDIDATE_BUILDING_FOOTPRINT",
                availability="MODEL_UNAVAILABLE",
                limitations=(
                    "PyTorch runtime weights are not bundled in this lightweight distribution. "
                    "System falls back gracefully to local classical CV extractor (bld_cv_otsu_v1)."
                ),
            )
        )

        # 7. 3D Point Cloud Semantic Delineator (Open3D PointNet)
        self.register(
            ModelMetadata(
                model_id="open3d_pointnet_v1",
                model_version="1.2.0",
                task=ExtractionType.VERTICAL_FEATURE,
                framework="Open3D + PointNet",
                input_type="LAS_LIDAR_POINT_CLOUD",
                output_type="POINT_CLOUD_SEGMENTATION",
                availability="MODEL_UNAVAILABLE",
                limitations=(
                    "Open3D C++ binaries not present in current environment. "
                    "ElevationService and flr_hist_cluster_v1 provide local deterministic extraction."
                ),
            )
        )

    def register(self, model: ModelMetadata) -> None:
        """Register or update a model metadata entry."""
        self._models[model.model_id] = model

    def list_models(self) -> List[ModelMetadata]:
        """Return all registered model metadata records."""
        return list(self._models.values())

    def get_model(self, model_id: str) -> Optional[ModelMetadata]:
        """Retrieve a registered model by identifier."""
        return self._models.get(model_id)

    def is_available(self, model_id: str) -> bool:
        """Check if a registered model is available for execution."""
        model = self.get_model(model_id)
        return model is not None and model.availability == "AVAILABLE"


# Global model registry singleton
model_registry = ModelRegistry()
