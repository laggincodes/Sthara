# KUSUM SURESH ENCLAVE — Ground Control Point Submission

Use the attached sanctioned layout plan, `RERAP125201800396RERAP125201800396-5SanctionedLayoutPlan.pdf`, page 1. The reference raster prepared for plan-pixel measurements is **7,193 × 4,335 pixels**, with its origin at the upper-left corner. Pixel `x` increases to the right and pixel `y` increases downward.

Provide at least three **non-collinear** control-point pairs. Each point must describe the same permanent, visible feature on the plan and in an independent WGS84 survey/GNSS source. Do not use the Bihar RERA endpoint coordinate as a substitute for a plot corner or building boundary.

| Required value                      | Description                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                                | Unique control-point label such as `GCP-01`.                                                     |
| `featureDescription`                | Exact shared feature, for example a surveyed plot-corner marker or road-centerline intersection. |
| `planPixel.x`, `planPixel.y`        | Pixel coordinate measured on the supplied plan raster.                                           |
| `wgs84.latitude`, `wgs84.longitude` | Independently surveyed WGS84 coordinate, in decimal degrees.                                     |
| `coordinateSource`                  | Survey/GNSS record, field-book, or approved GIS source reference.                                |
| `horizontalAccuracyMetres`          | Reported horizontal accuracy or survey tolerance.                                                |
| `surveyDate`                        | Date of the source survey.                                                                       |

The accompanying JSON template contains three empty records. Fill it without altering its coordinate-system declaration. A fourth or additional GCP is recommended because it allows residual-error validation rather than only a minimum affine transformation.

> **Evidence gate:** A footprint GeoJSON and the RERA-backed 14.90 m Cesium extrusion will be considered only after the control points pass completeness, non-collinearity, and transformation-residual checks and the resulting geometry can be reconciled to Plot 808 P. The plan alone does not unlock a floor-by-floor model or a vertical ULPIN.
