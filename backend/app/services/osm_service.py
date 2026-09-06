"""
OpenStreetMap Building Extractor Service.

Parses OSM XML data (map.osm) and extracts real building footprints
into validated closed 2D polygons conforming to GeoJSON standards.

CRITICAL SEMANTIC RULE:
OSM buildings represent physical surface footprint observations.
They do NOT represent legal cadastral parcels, land ownership, or official ULPINs.
All extracted buildings are explicitly flagged with is_cadastral=False.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import os
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union

from app.schemas.cadastre import GeoJSONValidationResult
from app.services.building_validator import BuildingValidator
from app.core.logging import logger

DEFAULT_RAW_OSM_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw" / "real" / "map.osm"
DEFAULT_PROCESSED_BUILDINGS_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed" / "real" / "osm_buildings.geojson"


def parse_numeric_height(val: Optional[str]) -> Optional[float]:
    """Safely extracts numeric meter height from OSM tag string (e.g. '12.5', '12m', '15 m')."""
    if not val:
        return None
    cleaned = val.strip().lower().rstrip("m").strip()
    try:
        num = float(cleaned)
        return num if num > 0 else None
    except ValueError:
        return None


def parse_numeric_levels(val: Optional[str]) -> Optional[int]:
    """Safely extracts floor level count from OSM tag string (e.g. '3', '4')."""
    if not val:
        return None
    cleaned = val.strip()
    try:
        num = int(cleaned)
        return num if num > 0 else None
    except ValueError:
        return None


class OSMBuildingExtractor:
    """Extracts, validates, and standardizes OpenStreetMap building polygons."""

    @classmethod
    def extract_from_file(
        cls,
        osm_file_path: Union[str, Path] = DEFAULT_RAW_OSM_PATH,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Parses an OSM XML file, extracts building polygons and metadata,
        and runs the existing BuildingValidator on the resulting FeatureCollection.

        Returns:
            Tuple of (GeoJSON FeatureCollection dict, extraction summary statistics dict).
        """
        path = Path(osm_file_path)
        if not path.exists():
            raise FileNotFoundError(f"OSM source file not found at: {path}")

        tree = ET.parse(path)
        root = tree.getroot()

        return cls.extract_from_element_tree(root, source_name=path.name)

    @classmethod
    def extract_from_xml_string(
        cls,
        xml_content: str,
        source_name: str = "inline.osm",
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Parses an OSM XML string directly."""
        root = ET.fromstring(xml_content)
        return cls.extract_from_element_tree(root, source_name=source_name)

    @classmethod
    def extract_from_element_tree(
        cls,
        root: ET.Element,
        source_name: str = "map.osm",
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Core extraction logic on parsed OSM XML root element."""
        # 1. Bounds parsing
        bounds_elem = root.find("bounds")
        file_bounds = None
        if bounds_elem is not None:
            file_bounds = {
                "minlat": float(bounds_elem.get("minlat", 0)),
                "minlon": float(bounds_elem.get("minlon", 0)),
                "maxlat": float(bounds_elem.get("maxlat", 0)),
                "maxlon": float(bounds_elem.get("maxlon", 0)),
            }

        # 2. Index nodes
        nodes: Dict[str, Tuple[float, float]] = {}
        for node in root.findall("node"):
            nid = node.get("id")
            if nid and "lat" in node.attrib and "lon" in node.attrib:
                try:
                    lat = float(node.get("lat"))
                    lon = float(node.get("lon"))
                    nodes[nid] = (lon, lat)
                except (ValueError, TypeError):
                    continue

        total_nodes = len(nodes)

        # 3. Index ways
        ways: Dict[str, Dict[str, Any]] = {}
        for way in root.findall("way"):
            wid = way.get("id")
            if not wid:
                continue
            nd_refs = [nd.get("ref") for nd in way.findall("nd") if nd.get("ref")]
            tags = {t.get("k"): t.get("v") for t in way.findall("tag") if t.get("k")}
            ways[wid] = {"refs": nd_refs, "tags": tags}

        total_ways = len(ways)

        # 4. Index relations
        relations: Dict[str, Dict[str, Any]] = {}
        for rel in root.findall("relation"):
            rid = rel.get("id")
            if not rid:
                continue
            tags = {t.get("k"): t.get("v") for t in rel.findall("tag") if t.get("k")}
            members = [
                (m.get("type"), m.get("ref"), m.get("role", ""))
                for m in rel.findall("member")
                if m.get("ref")
            ]
            relations[rid] = {"members": members, "tags": tags}

        total_relations = len(relations)

        features: List[Dict[str, Any]] = []
        handled_way_ids = set()

        height_present_count = 0
        levels_present_count = 0
        relations_extracted_count = 0
        ways_extracted_count = 0
        degenerate_count = 0

        # Min/max bounds across extracted building geometries
        bbox_min_lon = float("inf")
        bbox_min_lat = float("inf")
        bbox_max_lon = float("-inf")
        bbox_max_lat = float("-inf")

        # 5. Extract building multipolygon relations
        for rid, rel_data in relations.items():
            tags = rel_data["tags"]
            rel_type = tags.get("type")
            is_building = "building" in tags

            if is_building or (rel_type == "multipolygon" and is_building):
                outer_polys = []
                inner_polys = []

                for m_type, m_ref, m_role in rel_data["members"]:
                    if m_type == "way" and m_ref in ways:
                        handled_way_ids.add(m_ref)
                        w = ways[m_ref]
                        pts = [nodes[ref] for ref in w["refs"] if ref in nodes]
                        if len(pts) >= 4 and pts[0] == pts[-1]:
                            try:
                                poly = Polygon(pts)
                                if not poly.is_valid:
                                    poly = poly.buffer(0)
                                if poly.is_valid and not poly.is_empty and poly.area > 0:
                                    if m_role == "inner":
                                        inner_polys.append(poly)
                                    else:
                                        outer_polys.append(poly)
                            except Exception:
                                pass

                if outer_polys:
                    try:
                        # Combine outers if multiple, or keep as MultiPolygon
                        if len(outer_polys) == 1 and not inner_polys:
                            final_geom = outer_polys[0]
                        elif len(outer_polys) == 1 and inner_polys:
                            # Difference out inner holes
                            outer_poly = outer_polys[0]
                            for hole in inner_polys:
                                outer_poly = outer_poly.difference(hole)
                            final_geom = outer_poly
                        else:
                            # MultiPolygon aggregation
                            combined_outer = unary_union(outer_polys)
                            for hole in inner_polys:
                                combined_outer = combined_outer.difference(hole)
                            final_geom = combined_outer

                        if not final_geom.is_empty and final_geom.area > 0:
                            h_val = parse_numeric_height(tags.get("height"))
                            l_val = parse_numeric_levels(tags.get("building:levels"))
                            if h_val is not None:
                                height_present_count += 1
                            if l_val is not None:
                                levels_present_count += 1

                            b_id = f"OSM-BUILDING-REL-{rid}"
                            props = {
                                "building_id": b_id,
                                "osm_id": str(rid),
                                "osm_type": "relation",
                                "building": tags.get("building", "yes"),
                                "name": tags.get("name"),
                                "height": h_val,
                                "building_levels": l_val,
                                "roof_elevation": None,
                                "ground_elevation": None,
                                "source": "OpenStreetMap",
                                "capture_source": source_name,
                                "is_cadastral": False,
                                "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
                                "ownership_status": "UNKNOWN_UNREGISTERED",
                                "notes": "Extracted from OpenStreetMap relation. Does not represent cadastral parcel or legal land ownership.",
                            }
                            # Preserve address tags if present
                            for k, v in tags.items():
                                if k.startswith("addr:"):
                                    props[k] = v

                            # Update overall bounding box
                            minx, miny, maxx, maxy = final_geom.bounds
                            bbox_min_lon = min(bbox_min_lon, minx)
                            bbox_min_lat = min(bbox_min_lat, miny)
                            bbox_max_lon = max(bbox_max_lon, maxx)
                            bbox_max_lat = max(bbox_max_lat, maxy)

                            features.append({
                                "type": "Feature",
                                "id": b_id,
                                "properties": props,
                                "geometry": mapping(final_geom),
                            })
                            relations_extracted_count += 1
                        else:
                            degenerate_count += 1
                    except Exception as err:
                        logger.warning(f"Failed to assemble relation {rid}: {err}")
                        degenerate_count += 1

        # 6. Extract building ways
        for wid, w_data in ways.items():
            if wid in handled_way_ids:
                continue

            tags = w_data["tags"]
            if "building" in tags:
                refs = w_data["refs"]
                # Must be closed polygon
                if len(refs) < 4 or refs[0] != refs[-1]:
                    degenerate_count += 1
                    continue

                pts = [nodes[ref] for ref in refs if ref in nodes]
                if len(pts) < 4 or pts[0] != pts[-1]:
                    degenerate_count += 1
                    continue

                # Remove sequential duplicate points while preserving ring closure
                cleaned_pts = [pts[0]]
                for pt in pts[1:]:
                    if pt != cleaned_pts[-1]:
                        cleaned_pts.append(pt)
                if cleaned_pts[0] != cleaned_pts[-1]:
                    cleaned_pts.append(cleaned_pts[0])

                if len(cleaned_pts) < 4:
                    degenerate_count += 1
                    continue

                try:
                    poly = Polygon(cleaned_pts)
                    if not poly.is_valid:
                        poly = poly.buffer(0)

                    if poly.is_valid and not poly.is_empty and poly.area > 0:
                        h_val = parse_numeric_height(tags.get("height"))
                        l_val = parse_numeric_levels(tags.get("building:levels"))
                        if h_val is not None:
                            height_present_count += 1
                        if l_val is not None:
                            levels_present_count += 1

                        b_id = f"OSM-BUILDING-WAY-{wid}"
                        props = {
                            "building_id": b_id,
                            "osm_id": str(wid),
                            "osm_type": "way",
                            "building": tags.get("building", "yes"),
                            "name": tags.get("name"),
                            "height": h_val,
                            "building_levels": l_val,
                            "roof_elevation": None,
                            "ground_elevation": None,
                            "source": "OpenStreetMap",
                            "capture_source": source_name,
                            "is_cadastral": False,
                            "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
                            "ownership_status": "UNKNOWN_UNREGISTERED",
                            "notes": "Extracted from OpenStreetMap way. Does not represent cadastral parcel or legal land ownership.",
                        }
                        for k, v in tags.items():
                            if k.startswith("addr:"):
                                props[k] = v

                        minx, miny, maxx, maxy = poly.bounds
                        bbox_min_lon = min(bbox_min_lon, minx)
                        bbox_min_lat = min(bbox_min_lat, miny)
                        bbox_max_lon = max(bbox_max_lon, maxx)
                        bbox_max_lat = max(bbox_max_lat, maxy)

                        features.append({
                            "type": "Feature",
                            "id": b_id,
                            "properties": props,
                            "geometry": mapping(poly),
                        })
                        ways_extracted_count += 1
                    else:
                        degenerate_count += 1
                except Exception as err:
                    logger.warning(f"Failed to assemble way {wid}: {err}")
                    degenerate_count += 1

        total_extracted = len(features)

        # 7. Build GeoJSON FeatureCollection
        geojson_collection = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84",
                },
            },
            "features": features,
        }

        # 8. Validate via BuildingValidator
        val_result = BuildingValidator.validate_buildings(geojson_collection)

        # 9. Compute summary statistics
        bounds_summary = None
        if total_extracted > 0 and bbox_min_lon != float("inf"):
            bounds_summary = {
                "min_longitude": round(bbox_min_lon, 7),
                "min_latitude": round(bbox_min_lat, 7),
                "max_longitude": round(bbox_max_lon, 7),
                "max_latitude": round(bbox_max_lat, 7),
                "bbox": [
                    round(bbox_min_lon, 7),
                    round(bbox_min_lat, 7),
                    round(bbox_max_lon, 7),
                    round(bbox_max_lat, 7),
                ],
            }

        height_pct = round((height_present_count / total_extracted * 100.0), 2) if total_extracted > 0 else 0.0
        levels_pct = round((levels_present_count / total_extracted * 100.0), 2) if total_extracted > 0 else 0.0

        summary = {
            "source_file": source_name,
            "osm_bounds_header": file_bounds,
            "total_osm_nodes": total_nodes,
            "total_osm_ways": total_ways,
            "total_osm_relations": total_relations,
            "total_extracted_buildings": total_extracted,
            "ways_extracted": ways_extracted_count,
            "relations_extracted": relations_extracted_count,
            "degenerate_or_skipped": degenerate_count,
            "buildings_with_height": height_present_count,
            "buildings_with_height_pct": height_pct,
            "buildings_with_levels": levels_present_count,
            "buildings_with_levels_pct": levels_pct,
            "bounding_box": bounds_summary,
            "validation": {
                "valid": val_result.valid,
                "errors_count": len(val_result.errors),
                "warnings_count": len(val_result.warnings),
                "errors": [e.model_dump() for e in val_result.errors],
                "warnings": val_result.warnings,
            },
        }

        return geojson_collection, summary

    @classmethod
    def convert_and_save(
        cls,
        osm_source_path: Union[str, Path] = DEFAULT_RAW_OSM_PATH,
        output_geojson_path: Union[str, Path] = DEFAULT_PROCESSED_BUILDINGS_PATH,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Converts raw OSM file and writes canonical GeoJSON to output path."""
        src = Path(osm_source_path)
        dest = Path(output_geojson_path)
        dest.parent.mkdir(parents=True, exist_ok=True)

        geojson_data, summary = cls.extract_from_file(src)

        with open(dest, "w", encoding="utf-8") as f:
            json.dump(geojson_data, f, indent=2)

        logger.info(
            f"Successfully converted OSM dataset '{src.name}' -> '{dest}' "
            f"({summary['total_extracted_buildings']} buildings, valid: {summary['validation']['valid']})"
        )

        return geojson_data, summary


if __name__ == "__main__":
    import sys
    print("Executing OSM Building Extractor CLI...")
    raw_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_RAW_OSM_PATH
    out_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PROCESSED_BUILDINGS_PATH

    print(f"Reading from: {raw_path}")
    print(f"Writing to:   {out_path}")

    geojson, stats = OSMBuildingExtractor.convert_and_save(raw_path, out_path)

    print("\n--- EXTRACTION REPORT ---")
    print(json.dumps(stats, indent=2))
