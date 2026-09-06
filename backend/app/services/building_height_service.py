import math
from typing import List, Dict, Any, Optional
from app.schemas.building_height import (
    HeightStatus,
    HeightSource,
    HeightMethod,
    HeightCalculationRequest,
    HeightCalculationResult,
    Floor,
    FloorValidationStatus,
    FloorGenerationMode,
    FloorGenerationRequest,
    FloorGenerationResponse,
)


class BuildingHeightService:
    """
    Deterministic domain service for building height calculation and floor generation.
    Strictly differentiates between ground elevation, roof elevation, building height,
    and individual floor levels.
    """

    MIN_SANITY_HEIGHT_M: float = 0.5
    MAX_SANITY_HEIGHT_M: float = 500.0

    @classmethod
    def calculate_height(cls, req: HeightCalculationRequest) -> HeightCalculationResult:
        """
        Calculate building height = roof_elevation - ground_elevation with strict domain validation.
        """
        warnings: List[str] = []
        provenance: Dict[str, Any] = {
            "building_id": req.building_id,
            "unit": req.unit,
            "ground_reference": req.ground_reference,
            "roof_reference": req.roof_reference,
            "source": req.source.value,
        }

        # 1. Check for presence of both elevations
        if req.ground_elevation is None and req.roof_elevation is None:
            return HeightCalculationResult(
                building_id=req.building_id,
                status=HeightStatus.UNAVAILABLE,
                warnings=["Both ground elevation and roof elevation are missing."],
                provenance=provenance,
            )

        if req.ground_elevation is None:
            return HeightCalculationResult(
                building_id=req.building_id,
                roof_elevation=req.roof_elevation,
                status=HeightStatus.UNAVAILABLE,
                warnings=["Ground elevation is missing. Cannot calculate building height."],
                provenance=provenance,
            )

        if req.roof_elevation is None:
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                status=HeightStatus.UNAVAILABLE,
                warnings=["Roof elevation is missing. Cannot calculate building height."],
                provenance=provenance,
            )

        # 2. Check numeric validity (finite, non-NaN)
        if not (math.isfinite(req.ground_elevation) and math.isfinite(req.roof_elevation)):
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                status=HeightStatus.INVALID,
                warnings=["Elevations must be finite numeric values."],
                provenance=provenance,
            )

        # 3. Unit and Reference compatibility
        if req.unit.lower() not in ("meters", "m"):
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                unit=req.unit,
                status=HeightStatus.INCONSISTENT,
                warnings=[f"Unsupported or mismatched elevation unit '{req.unit}'. Expected 'meters'."],
                provenance=provenance,
            )

        if req.ground_reference.upper() != req.roof_reference.upper():
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                status=HeightStatus.INCONSISTENT,
                warnings=[
                    f"Elevation reference mismatch: ground='{req.ground_reference}', roof='{req.roof_reference}'."
                ],
                provenance=provenance,
            )

        # 4. Height calculation
        raw_height = req.roof_elevation - req.ground_elevation

        # 5. Non-positive checks
        if raw_height < 0:
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                building_height=round(raw_height, 3),
                status=HeightStatus.INVALID,
                warnings=[
                    f"Roof elevation ({req.roof_elevation}m) is less than ground elevation ({req.ground_elevation}m), resulting in negative height ({round(raw_height, 3)}m)."
                ],
                provenance=provenance,
            )

        if math.isclose(raw_height, 0.0, abs_tol=1e-5):
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                building_height=0.0,
                status=HeightStatus.INVALID,
                warnings=["Roof elevation equals ground elevation, resulting in zero building height."],
                provenance=provenance,
            )

        # 6. Sanity constraint checks
        if raw_height < cls.MIN_SANITY_HEIGHT_M:
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                building_height=round(raw_height, 3),
                status=HeightStatus.INVALID,
                warnings=[
                    f"Calculated height ({round(raw_height, 3)}m) is below minimum structural sanity constraint ({cls.MIN_SANITY_HEIGHT_M}m)."
                ],
                provenance=provenance,
            )

        if raw_height > cls.MAX_SANITY_HEIGHT_M:
            return HeightCalculationResult(
                building_id=req.building_id,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation,
                building_height=round(raw_height, 3),
                status=HeightStatus.INVALID,
                warnings=[
                    f"Calculated height ({round(raw_height, 3)}m) exceeds maximum structural sanity constraint ({cls.MAX_SANITY_HEIGHT_M}m)."
                ],
                provenance=provenance,
            )

        computed_height = round(raw_height, 3)
        provenance["calculation_formula"] = "roof_elevation - ground_elevation"
        provenance["computed_height"] = computed_height

        return HeightCalculationResult(
            building_id=req.building_id,
            ground_elevation=round(req.ground_elevation, 3),
            roof_elevation=round(req.roof_elevation, 3),
            building_height=computed_height,
            unit="meters",
            source=req.source,
            method=HeightMethod.DIRECT_DIFFERENCE,
            status=HeightStatus.AVAILABLE,
            warnings=warnings,
            provenance=provenance,
        )

    @classmethod
    def generate_floors(cls, req: FloorGenerationRequest) -> FloorGenerationResponse:
        """
        Generate deterministic floor structure using Mode A (Known Floor Count)
        or Mode B (Explicit Floor Heights).
        """
        warnings: List[str] = []

        # 1. Determine target building height and roof elevation
        if req.building_height is not None and req.building_height > 0:
            target_height = req.building_height
            roof_elev = req.roof_elevation if req.roof_elevation is not None else req.ground_elevation + target_height
        elif req.roof_elevation is not None and req.roof_elevation > req.ground_elevation:
            target_height = req.roof_elevation - req.ground_elevation
            roof_elev = req.roof_elevation
        else:
            return FloorGenerationResponse(
                building_id=req.building_id,
                building_height=0.0,
                ground_elevation=req.ground_elevation,
                roof_elevation=req.roof_elevation or req.ground_elevation,
                floor_count=0,
                floors=[],
                validation_status=FloorValidationStatus.INVALID,
                warnings=["Valid positive building height or roof elevation > ground elevation is required."],
            )

        # 2. Mode A: Known Floor Count
        if req.mode == FloorGenerationMode.KNOWN_FLOOR_COUNT:
            if req.floor_count is None or req.floor_count <= 0:
                return FloorGenerationResponse(
                    building_id=req.building_id,
                    building_height=round(target_height, 3),
                    ground_elevation=round(req.ground_elevation, 3),
                    roof_elevation=round(roof_elev, 3),
                    floor_count=0,
                    floors=[],
                    validation_status=FloorValidationStatus.INVALID,
                    warnings=[f"Invalid floor count: {req.floor_count}. Must be an integer >= 1."],
                )

            floor_h = round(target_height / req.floor_count, 3)
            floors: List[Floor] = []

            for i in range(req.floor_count):
                base_z = round(req.ground_elevation + (i * floor_h), 3)
                # Ensure top of uppermost floor aligns exactly with roof_elev
                if i == req.floor_count - 1:
                    top_z = round(req.ground_elevation + target_height, 3)
                    slab_h = round(top_z - base_z, 3)
                else:
                    top_z = round(req.ground_elevation + ((i + 1) * floor_h), 3)
                    slab_h = floor_h

                floor_name = req.ground_floor_name if i == 0 else f"Floor {i}"

                floors.append(
                    Floor(
                        floor_id=f"{req.building_id}-FL{i:02d}",
                        building_id=req.building_id,
                        floor_index=i,
                        floor_name=floor_name,
                        base_elevation=base_z,
                        top_elevation=top_z,
                        floor_height=slab_h,
                        source="DETERMINISTIC_EQUAL_SLICING",
                        status="VALID",
                    )
                )

            return FloorGenerationResponse(
                building_id=req.building_id,
                building_height=round(target_height, 3),
                ground_elevation=round(req.ground_elevation, 3),
                roof_elevation=round(roof_elev, 3),
                floor_count=len(floors),
                floors=floors,
                validation_status=FloorValidationStatus.VALID,
                difference_m=0.0,
                warnings=warnings,
            )

        # 3. Mode B: Explicit Floor Heights
        elif req.mode == FloorGenerationMode.EXPLICIT_FLOOR_HEIGHTS:
            if not req.floor_heights:
                return FloorGenerationResponse(
                    building_id=req.building_id,
                    building_height=round(target_height, 3),
                    ground_elevation=round(req.ground_elevation, 3),
                    roof_elevation=round(roof_elev, 3),
                    floor_count=0,
                    floors=[],
                    validation_status=FloorValidationStatus.INCOMPLETE,
                    warnings=["Mode EXPLICIT_FLOOR_HEIGHTS requires a non-empty list of 'floor_heights'."],
                )

            # Check for non-positive or invalid floor heights
            for idx, fh in enumerate(req.floor_heights):
                if fh is None or not math.isfinite(fh) or fh <= 0:
                    return FloorGenerationResponse(
                        building_id=req.building_id,
                        building_height=round(target_height, 3),
                        ground_elevation=round(req.ground_elevation, 3),
                        roof_elevation=round(roof_elev, 3),
                        floor_count=0,
                        floors=[],
                        validation_status=FloorValidationStatus.INVALID,
                        warnings=[f"Floor index {idx} has invalid height {fh}m. Floor heights must be positive numbers."],
                    )

            floors = []
            current_base = req.ground_elevation

            for i, fh in enumerate(req.floor_heights):
                base_z = round(current_base, 3)
                top_z = round(base_z + fh, 3)
                floor_name = req.ground_floor_name if i == 0 else f"Floor {i}"

                floors.append(
                    Floor(
                        floor_id=f"{req.building_id}-FL{i:02d}",
                        building_id=req.building_id,
                        floor_index=i,
                        floor_name=floor_name,
                        base_elevation=base_z,
                        top_elevation=top_z,
                        floor_height=round(fh, 3),
                        source="EXPLICIT_SPECIFICATION",
                        status="VALID",
                    )
                )
                current_base = top_z

            sum_heights = sum(req.floor_heights)
            diff = round(abs(sum_heights - target_height), 3)

            if diff <= req.tolerance_m:
                status = FloorValidationStatus.VALID
            else:
                status = FloorValidationStatus.HEIGHT_MISMATCH
                warnings.append(
                    f"Sum of explicit floor heights ({round(sum_heights, 3)}m) differs from building height ({round(target_height, 3)}m) by {diff}m, exceeding tolerance ({req.tolerance_m}m)."
                )

            return FloorGenerationResponse(
                building_id=req.building_id,
                building_height=round(target_height, 3),
                ground_elevation=round(req.ground_elevation, 3),
                roof_elevation=round(roof_elev, 3),
                floor_count=len(floors),
                floors=floors,
                validation_status=status,
                difference_m=diff,
                warnings=warnings,
            )

        else:
            return FloorGenerationResponse(
                building_id=req.building_id,
                building_height=round(target_height, 3),
                ground_elevation=round(req.ground_elevation, 3),
                roof_elevation=round(roof_elev, 3),
                floor_count=0,
                floors=[],
                validation_status=FloorValidationStatus.INVALID,
                warnings=[f"Unsupported floor generation mode '{req.mode}'."],
            )
