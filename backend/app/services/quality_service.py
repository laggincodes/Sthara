from typing import Dict, Any, Tuple, Optional
from app.core.logging import logger


class QualityService:
    """
    Authoritative domain service for evaluating Data Quality Status and Cadastral Provenance.
    Deterministic status values:
      - VALID: Fully valid geometry, closed/watertight solid, required IDs present, source attributes verified.
      - WARNING: Source height missing (default used), floor count inferred, manual configuration.
      - INCOMPLETE: Missing optional source information, no floor plan attached, limited metadata.
      - INVALID: Invalid geometry, failed containment, failed topology gate.
    """

    DISCLAIMER_SPATIAL_ID = (
        "STHARA Spatial ID is a prototype spatial identifier and is not an official government property or ownership identifier."
    )
    DISCLAIMER_LEGAL_EVIDENCE = (
        "Geometry and source information represent spatial evidence/configuration and do not establish legal ownership or title."
    )

    @classmethod
    def evaluate_building_quality(
        cls,
        building_dict: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any], Dict[str, str]]:
        """
        Evaluates data quality and provenance for a building record.
        Returns:
            (quality_status, provenance_dict, validation_gates)
        """
        # 1. Validation gates
        is_geom_valid = building_dict.get("validation_status", "PASS") == "PASS"
        is_watertight = building_dict.get("watertight", True)
        is_topo_valid = building_dict.get("topology_status", "PASS") == "PASS"
        height_source = building_dict.get("height_source", "DEFAULT_CONFIG")
        levels = building_dict.get("levels")

        gates = {
            "geometry": "PASS" if is_geom_valid else "FAIL",
            "topology": "PASS" if is_topo_valid and is_watertight else "FAIL",
            "containment": "PASS",
            "hierarchy": "PASS" if building_dict.get("building_id") else "FAIL",
            "source_data": "PASS" if height_source not in ("DEFAULT_CONFIG", "SYNTHETIC_DEMO", "ASSUMED") else "WARNING",
        }

        # 2. Determine quality status
        if not is_geom_valid or not is_watertight or not is_topo_valid:
            status = "INVALID"
        elif height_source in ("DEFAULT_CONFIG", "SYNTHETIC_DEMO", "ASSUMED"):
            status = "WARNING"
        elif levels is None or building_dict.get("parcel_id") == "PARCEL-UNREGISTERED":
            status = "INCOMPLETE"
        else:
            status = "VALID"

        # 3. Provenance metadata
        provenance = {
            "source": building_dict.get("source", "OpenStreetMap"),
            "height_source": "Source-derived" if height_source not in ("DEFAULT_CONFIG", "SYNTHETIC_DEMO") else "Default (Inferred)",
            "floor_source": "Source-derived" if levels else "Configured / Inferred",
            "geometry_validated": is_geom_valid,
            "watertight": is_watertight,
            "is_government_record": False,
            "disclaimer": cls.DISCLAIMER_SPATIAL_ID,
        }

        return status, provenance, gates

    @classmethod
    def evaluate_floor_quality(
        cls,
        floor_dict: Dict[str, Any],
        has_floor_plan: bool = False,
    ) -> Tuple[str, Dict[str, Any], Dict[str, str]]:
        """
        Evaluates data quality and provenance for a floor volume.
        """
        is_geom_valid = floor_dict.get("geometry_status", "VALID") in ("VALID", "PASS")
        h = float(floor_dict.get("height", 3.0))

        gates = {
            "geometry": "PASS" if is_geom_valid and h > 0 else "FAIL",
            "topology": "PASS" if is_geom_valid else "FAIL",
            "containment": "PASS",
            "hierarchy": "PASS" if floor_dict.get("floor_id") else "FAIL",
            "source_data": "PASS" if has_floor_plan else "INCOMPLETE",
        }

        if not is_geom_valid or h <= 0:
            status = "INVALID"
        elif not has_floor_plan:
            status = "INCOMPLETE"
        else:
            status = "VALID"

        provenance = {
            "source": floor_dict.get("source", "Configured / Derived"),
            "elevation_source": "Relative / Parametric Extrusion",
            "floor_plan_source": "User-provided floor plan" if has_floor_plan else "None attached",
            "is_government_record": False,
            "disclaimer": cls.DISCLAIMER_LEGAL_EVIDENCE,
        }

        return status, provenance, gates

    @classmethod
    def evaluate_unit_quality(
        cls,
        unit_dict: Dict[str, Any],
        has_floor_plan: bool = False,
        containment_passed: bool = True,
    ) -> Tuple[str, Dict[str, Any], Dict[str, str]]:
        """
        Evaluates data quality and provenance for a unit / apartment entity.
        """
        is_geom_valid = unit_dict.get("geometry_status", "PASS") in ("PASS", "VALID")
        has_geometry = bool(unit_dict.get("geometry_2d") or unit_dict.get("geometry"))

        gates = {
            "geometry": "PASS" if is_geom_valid and has_geometry else "FAIL",
            "topology": "PASS" if is_geom_valid else "FAIL",
            "containment": "PASS" if containment_passed else "FAIL",
            "hierarchy": "PASS" if unit_dict.get("unit_id") and unit_dict.get("floor_id") else "FAIL",
            "source_data": "PASS" if has_floor_plan else "INCOMPLETE",
        }

        if not is_geom_valid or not has_geometry or not containment_passed:
            status = "INVALID"
        elif not has_floor_plan:
            status = "INCOMPLETE"
        else:
            status = "VALID"

        provenance = {
            "source": unit_dict.get("source", "Configured / Derived"),
            "source_type": unit_dict.get("source_type", "DERIVED"),
            "floor_plan_source": "User-provided floor plan" if has_floor_plan else "None attached",
            "geometry_source": "Floor Plan Subdivision" if has_floor_plan else "Manual Footprint",
            "spatial_id_type": "STHARA Prototype Spatial ID",
            "is_government_record": False,
            "disclaimer": cls.DISCLAIMER_LEGAL_EVIDENCE,
        }

        return status, provenance, gates
