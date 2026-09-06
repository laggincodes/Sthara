from typing import Optional, Tuple, Dict, Any
import math
import pyproj
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform


def inspect_crs(geojson_data: Dict[str, Any]) -> Tuple[str, str]:
    """
    Inspects the Coordinate Reference System of a GeoJSON object.
    Returns (crs_identifier, source_description).
    Complies with RFC 7946: Default is OGC:CRS84 / EPSG:4326 unless explicit legacy crs member exists.
    """
    # Check for top-level explicit 'crs' member (GeoJSON 2008 / legacy)
    crs_member = geojson_data.get("crs")
    if crs_member and isinstance(crs_member, dict):
        crs_type = crs_member.get("type", "")
        properties = crs_member.get("properties", {})
        
        if crs_type.lower() == "name":
            name = properties.get("name", "")
            # Handles formats like urn:ogc:def:crs:EPSG::4326, EPSG:4326, etc.
            if "EPSG::" in name:
                epsg_code = name.split("EPSG::")[-1]
                return f"EPSG:{epsg_code}", "explicit_geojson_crs_name"
            elif "EPSG:" in name.upper():
                epsg_code = name.upper().split("EPSG:")[-1]
                return f"EPSG:{epsg_code}", "explicit_geojson_crs_name"
            elif name:
                return name, "explicit_named_crs"
        elif crs_type.lower() == "epsg":
            code = properties.get("code")
            if code:
                return f"EPSG:{code}", "explicit_geojson_crs_code"

    # RFC 7946 Standard Default: WGS 84 longitude/latitude
    return "EPSG:4326", "rfc7946_default_wgs84"


def validate_crs(crs_string: str) -> Dict[str, Any]:
    """Validates whether a CRS identifier is recognized by PROJ."""
    try:
        crs = pyproj.CRS.from_user_input(crs_string)
        return {
            "valid": True,
            "crs": crs_string,
            "name": crs.name,
            "is_projected": crs.is_projected,
            "is_geographic": crs.is_geographic,
            "axis_units": [axis.unit_name for axis in crs.axis_info],
            "error": None,
        }
    except Exception as e:
        return {
            "valid": False,
            "crs": crs_string,
            "name": None,
            "is_projected": False,
            "is_geographic": False,
            "axis_units": [],
            "error": str(e),
        }


def suggest_utm_crs(longitude: float, latitude: float) -> str:
    """
    Calculates the standard UTM EPSG code based on WGS84 longitude and latitude coordinates.
    Useful for recommending an appropriate metric projected coordinate system for 3D processing.
    """
    utm_zone = int(math.floor((longitude + 180) / 6) + 1)
    # Northern hemisphere: EPSG 32600 + zone; Southern hemisphere: EPSG 32700 + zone
    epsg_code = 32600 + utm_zone if latitude >= 0 else 32700 + utm_zone
    return f"EPSG:{epsg_code}"


def transform_geometry(
    geometry: BaseGeometry,
    source_crs: str,
    target_crs: str,
) -> Tuple[BaseGeometry, Dict[str, str]]:
    """
    Deterministically transforms a Shapely geometry from source_crs to target_crs.
    Records and returns the transformation metadata.
    """
    if source_crs == target_crs:
        return geometry, {"source_crs": source_crs, "target_crs": target_crs, "transformed": "false"}

    transformer = pyproj.Transformer.from_crs(source_crs, target_crs, always_xy=True)
    transformed_geom = transform(transformer.transform, geometry)
    
    return transformed_geom, {
        "source_crs": source_crs,
        "target_crs": target_crs,
        "transformed": "true",
    }
