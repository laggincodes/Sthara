# AI/ML Extraction Subsystem & Deterministic Validation Boundary

## 1. Executive Summary & SIH Architectural Principle

The **AI/ML Extraction Subsystem** in **3D Cadastral Intelligence** conforms strictly to the core architectural separation defined in the Smart India Hackathon (SIH) technical approach:

$$\\mathbf{AI/ML} = \\textbf{Candidate Feature Extraction}$$
$$\\mathbf{3D\\ Engine} = \\textbf{Deterministic Modelling}$$
$$\\mathbf{Topology\\ Engine} = \\textbf{Deterministic Validation Gate}$$
$$\\mathbf{Cadastre} = \\textbf{Authoritative Legal Records}$$

Under this architecture:
1. **AI Never Possesses Direct Geometry Authority**: The output of any computer-vision, neural network, or statistical model is classified as **Candidate Evidence** (`status: CANDIDATE`).
2. **Candidates Never Silently Become Legal Facts**: No candidate feature can be automatically converted into a canonical 3D mesh (`Mesh3D`), legal property volume, or 3D ULPIN without passing through deterministic geometric and topological validation.
3. **Transparent Model Registry & Honest Failure**: Algorithms and models document their frameworks, requirements, and limitations. When required dependencies (e.g. PyTorch Mask-RCNN, Open3D PointNet) or inputs are absent, the system honestly reports `MODEL_UNAVAILABLE` or `UNIT_EXTRACTION_UNAVAILABLE` rather than fabricating synthetic or artificial geometry.

---

## 2. Extraction Pipeline Architecture

The end-to-end dataflow enforces deterministic verification between raw observation and cadastral modeling:

```
+-----------------------------------------------------------------------+
|                            INPUT SOURCES                              |
|  Aerial Orthophotos | LiDAR DSM/DTM | Architectural Plans | Real OSM  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                       AI / ML EXTRACTION LAYER                        |
|                                                                       |
|  - Task 1: Building Footprint Extraction (Otsu CV / Benchmark)        |
|  - Task 2: Floor Strata Segmentation (1D Density Clustering)          |
|  - Task 3: Unit Interior Delineation (Orthogonal Plan Partitioning)    |
|  - Task 4: Vertical Strata Coordination (Base-to-Roof Envelopes)      |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    CANDIDATE FEATURES (ISOLATED)                      |
|       CandidateFeature { id, geom, attributes, confidence, prov }    |
|       Status: CANDIDATE — NOT YET AUTHORITATIVE                       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                 DETERMINISTIC VALIDATION GATE (Python)                |
|                                                                       |
|  1. 2D Geometry Validity: Shapely is_valid & 2-manifold check         |
|  2. Parcel Containment: Candidate within legal cadastral boundary     |
|  3. Unit Non-Overlap: Party-wall touching allowed; interior overlap=0 |
|  4. Vertical Strata Bounds: Contiguous stacking; Z_base < Z_top       |
|  5. Confidence Policy: Scores < 0.60 flagged for REVIEW_REQUIRED     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                   DETERMINISTIC 3D MODELLING ENGINE                   |
|  Canonical Mesh Extrusion (Mesh3D) | Watertightness | Divergence Thm  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    PROPERTY VOLUME & 3D ULPIN (BETA)                  |
|  Cadastral Land Registry Association | Prototype Spatial ULPIN        |
+-----------------------------------------------------------------------+
```

---

## 3. Registered Models & Algorithmic Registry

The subsystem includes an explicit **Model Registry** (`backend/app/services/model_registry.py`):

| Model ID | Version | Task | Framework | Availability | Algorithmic Method & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bld_cv_otsu_v1` | 1.0.0 | BUILDING | `numpy + rasterio + shapely` | **AVAILABLE** | Classical Otsu automated binarization + contour simplification. Sensitive to roof-ground contrast and tree shadows. |
| `flr_hist_cluster_v1` | 1.0.0 | FLOOR | `numpy 1D clustering` | **AVAILABLE** | 1D elevation density peak detection. Uniform architectural strata fallback if vertical return signal is sparse. |
| `unit_partition_v1` | 1.0.0 | UNIT | `shapely partitioning` | **AVAILABLE** | Orthogonal unit subdivision with central circulation corridor buffer. Requires floor layout; returns `UNIT_EXTRACTION_UNAVAILABLE` if missing. |
| `vert_delineator_v1` | 1.0.0 | VERTICAL_FEATURE | `deterministic stratification` | **AVAILABLE** | Coordinated base and top elevation strata envelopes. Candidate evidence only; requires surveyor endorsement. |
| `sih_benchmark_demo_v1` | 1.0.0 | BUILDING | `calibrated benchmark` | **AVAILABLE** | Pre-calibrated high-confidence benchmark for Tower 1 in UTM 43N. Used for deterministic SIH offline presentations. |
| `pytorch_mask_rcnn_v1` | 2.1.0 | BUILDING | `PyTorch + torchvision` | **MODEL_UNAVAILABLE** | Deep learning instance segmentation from high-res drone RGB. Weights not bundled in lightweight local runtime. |
| `open3d_pointnet_v1` | 1.2.0 | VERTICAL_FEATURE | `Open3D + PointNet` | **MODEL_UNAVAILABLE** | 3D point cloud semantic segmentation. Open3D C++ binaries not bundled; system falls back to ElevationService. |

---

## 4. Extraction Contracts & Candidate Data Model

### CandidateFeature Envelope
```json
{
  "candidate_id": "AI-BLD-CAND-001",
  "feature_type": "BUILDING",
  "source_reference": "AERIAL_SURFACE_DEMO",
  "geometry_2d": {
    "type": "Polygon",
    "coordinates": [[[775910.0, 1297150.0], [775955.0, 1297150.0], [775955.0, 1297205.0], [775910.0, 1297205.0], [775910.0, 1297150.0]]]
  },
  "estimated_attributes": {
    "base_elevation_m": 920.0,
    "top_elevation_m": 935.0,
    "estimated_height_m": 15.0,
    "estimated_floors": 5,
    "footprint_area_m2": 2475.0
  },
  "confidence": 0.88,
  "confidence_level": "HIGH",
  "confidence_threshold": 0.60,
  "extraction_method": "SYNTHETIC_BENCHMARK",
  "status": "CANDIDATE",
  "provenance": {
    "source_dataset": "AERIAL_SURFACE_DEMO",
    "source_file": "synthetic_aerial_ortho.tif",
    "model_id": "sih_benchmark_demo_v1",
    "model_version": "1.0.0",
    "extraction_timestamp": "2026-09-07T20:53:00Z",
    "crs": "EPSG:32643",
    "transformation_applied": false
  },
  "warnings": [
    "CANDIDATE — NOT YET AUTHORITATIVE. Requires deterministic validation."
  ]
}
```

### Confidence Classification Policy
- **HIGH** ($\ge 0.80$): Strong algorithmic support (e.g. high compactness, distinct elevation return peaks).
- **MEDIUM** ($0.50 - 0.79$): Moderate signal clarity; acceptable for candidate visualization.
- **LOW** ($< 0.50$): Weak or ambiguous signal; automatically flagged for `REVIEW_REQUIRED`.
- **UNAVAILABLE**: The model produces qualitative or discrete evidence without a calibrated numeric probability. Numeric confidence is never fabricated.

---

## 5. Spatial Comparison Tool (Intersection-over-Union)

When comparing an AI candidate footprint against an authentic source observation (e.g. real OpenStreetMap building), the system computes metric spatial alignment:

$$\\text{IoU} = \\frac{\\text{Area}(A \\cap B)}{\\text{Area}(A \\cup B)}$$

The `/api/v1/ai/compare` endpoint returns:
- `iou`: Ratio between overlapping and total envelope area ($[0.0, 1.0]$).
- `intersection_area_m2`: Overlapping area in square meters.
- `union_area_m2`: Total bounding area in square meters.
- `centroid_offset_m`: Euclidean separation between geometric centroids in meters.
- `area_difference_pct`: Relative area deviation percentage: $100 \\times \\frac{A_{\\text{cand}} - A_{\\text{ref}}}{A_{\\text{ref}}}$.
- `containment_status`: `CONTAINS`, `CONTAINED`, `PARTIAL_OVERLAP`, or `DISJOINT`.
- `discrepancy_summary`: Human-readable engineering interpretation.

---

## 6. Deterministic Candidate Validation Gate

The `/api/v1/ai/validate-candidates` endpoint acts as the mandatory security and integrity gate before any candidate enters the 3D extrusion pipeline:

1. **Topological Sanity**: Evaluates `shapely.validation.explain_validity`. Self-intersecting rings or bowtie polygons are rejected (`REJECTED`).
2. **Cadastral Boundary Encroachment**:
   - If the candidate is disjoint from the legal parcel, it is marked `REJECTED`.
   - If the candidate slightly cantilevers outside the parcel, the overhang area ($m^2$) is calculated and the candidate is marked `REVIEW_REQUIRED`.
3. **Apartment Containment**: Units extending beyond the parent building polygon are rejected (`REJECTED`).
4. **Party-Wall Integrity**: Multi-unit candidate partitions must not overlap ($A \\cap B = 0$). Touching along shared internal party walls is allowed and preserved.
5. **Confidence Filter**: Candidates with confidence scores below the threshold ($< 0.60$) are marked `REVIEW_REQUIRED` unless overridden by an authorized human surveyor.

---

## 7. OpenStreetMap vs AI Separation

The system maintains strict provenance between OpenStreetMap and AI extraction:

| Attribute | OpenStreetMap Building (`map.osm`) | AI Candidate (`AI-BLD-CAND-001`) |
| :--- | :--- | :--- |
| **Source Type** | `OSM` | `AERIAL / DRONE / IMAGE` |
| **Extraction Method** | `SOURCE_DATA` | `AI_CV_MORPHOLOGICAL` / `AI_NDSM_SEGMENTATION` |
| **Cadastral Authority** | Non-cadastral physical observation | Non-cadastral candidate feature |
| **Legal Status** | `UNVERIFIED_PHYSICAL_SURFACE` | `CANDIDATE` |
| **Role in 3D Cadastre** | Physical envelope reference | Candidate hypothesis for automated modeling |

Neither OSM nor AI candidate outputs fabricate legal land ownership or statutory rights.
