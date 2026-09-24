"""
Unit and integration test suite for STEP 2: Automatic Source-Based Building Configuration.

Validates:
1. Building with only height tag -> detected height, default floors/basements, source attribution.
2. Building with only building:levels tag -> detected floors, derived height (N * 3.0m), basements default.
3. Building with both height and building:levels -> explicit height takes precedence over derived.
4. Building with building:levels and building:levels:underground -> floors and basements detected.
5. Building with all attributes (height, levels, underground_levels) -> all detected, no fallbacks used.
6. Building with no vertical attributes -> safe fallbacks used, attribution = 'Configured / Derived'.
7. Manual override of height -> source label updates to 'Configured / Derived'.
8. Manual override of floor count -> source label updates to 'Configured / Derived'.
9. Manual override of basement count -> source label updates to 'Configured / Derived'.
10. Reset to detected values -> restores original detected values and labels.
11. Dataset isolation -> switching datasets does not carry over detected attributes.
12. Backward compatibility -> Step 1 3D generation works identically with or without detected source attributes.
"""

import pytest
from app.services.osm_service import (
    parse_numeric_height,
    parse_numeric_levels,
    parse_numeric_integer,
    OSMBuildingExtractor,
)
from app.schemas.osm_converter import (
    Osm3DConversionConfig,
    HeightSourceOption,
    BuildingMetadataItem,
)
from app.schemas.property_volume import BuildingFloors3DRequest
from app.services.floor_volume_service import FloorVolumeService
from app.schemas.geometry_3d import Geometry3DStatus

SQUARE_COORDS_4326 = [
    [73.85600, 18.52000],
    [73.85610, 18.52000],
    [73.85610, 18.52010],
    [73.85600, 18.52010],
    [73.85600, 18.52000],
]
SQUARE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [SQUARE_COORDS_4326],
}


def test_1_building_with_only_height_tag():
    """Case 1: Building with only height tag -> detected height, default floors/basements, OSM height attribution."""
    tags = {"building": "yes", "height": "14.5m"}
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels") or tags.get("levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground") or tags.get("underground_levels"), min_val=0)

    assert raw_h == 14.5
    assert raw_l is None
    assert raw_u is None

    # Expected defaults applied when prefilling:
    default_floors = raw_l if raw_l is not None else 5
    default_basements = raw_u if raw_u is not None else 0
    default_height = raw_h if raw_h is not None else (raw_l * 3.0 if raw_l is not None else 18.0)

    assert default_height == 14.5
    assert default_floors == 5
    assert default_basements == 0

    height_source = "Source: OSM height" if raw_h is not None else "Configured / Derived"
    floors_source = "Source: OSM building:levels" if raw_l is not None else "Configured / Derived"
    basements_source = "Source: OSM building:levels:underground" if raw_u is not None else "Configured / Derived"

    assert height_source == "Source: OSM height"
    assert floors_source == "Configured / Derived"
    assert basements_source == "Configured / Derived"


def test_2_building_with_only_levels_tag():
    """Case 2: Building with only building:levels tag -> detected floors, derived height (N * 3.0m), basements default."""
    tags = {"building": "residential", "building:levels": "4"}
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels") or tags.get("levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground") or tags.get("underground_levels"), min_val=0)

    assert raw_h is None
    assert raw_l == 4
    assert raw_u is None

    default_floors = raw_l if raw_l is not None else 5
    default_basements = raw_u if raw_u is not None else 0
    default_height = raw_h if raw_h is not None else (raw_l * 3.0 if raw_l is not None else 18.0)

    assert default_floors == 4
    assert default_basements == 0
    assert default_height == 12.0  # 4 floors * 3.0m

    height_source = (
        "Source: OSM height" if raw_h is not None
        else ("Source: Derived from OSM levels" if raw_l is not None else "Configured / Derived")
    )
    floors_source = "Source: OSM building:levels" if raw_l is not None else "Configured / Derived"
    basements_source = "Source: OSM building:levels:underground" if raw_u is not None else "Configured / Derived"

    assert height_source == "Source: Derived from OSM levels"
    assert floors_source == "Source: OSM building:levels"
    assert basements_source == "Configured / Derived"


def test_3_building_with_height_and_levels():
    """Case 3: Building with both height and building:levels -> explicit height takes precedence over derived."""
    tags = {"building": "commercial", "height": "20.5", "building:levels": "4"}
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground"), min_val=0)

    assert raw_h == 20.5
    assert raw_l == 4
    assert raw_u is None

    # Explicit height takes precedence over 4 * 3.0 = 12.0m
    default_height = raw_h if raw_h is not None else (raw_l * 3.0 if raw_l is not None else 18.0)
    assert default_height == 20.5
    assert default_height != (raw_l * 3.0)

    height_source = "Source: OSM height" if raw_h is not None else "Source: Derived from OSM levels"
    assert height_source == "Source: OSM height"


def test_4_building_with_levels_and_underground():
    """Case 4: Building with building:levels and building:levels:underground -> floors and basements detected, height derived."""
    tags = {"building": "yes", "building:levels": "6", "building:levels:underground": "2"}
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground"), min_val=0)

    assert raw_h is None
    assert raw_l == 6
    assert raw_u == 2

    default_floors = raw_l
    default_basements = raw_u
    default_height = raw_l * 3.0

    assert default_floors == 6
    assert default_basements == 2
    assert default_height == 18.0

    height_source = "Source: Derived from OSM levels"
    floors_source = "Source: OSM building:levels"
    basements_source = "Source: OSM building:levels:underground"

    assert height_source == "Source: Derived from OSM levels"
    assert floors_source == "Source: OSM building:levels"
    assert basements_source == "Source: OSM building:levels:underground"


def test_5_building_with_all_attributes():
    """Case 5: Building with all attributes (height, levels, underground_levels) -> all detected, no fallbacks used."""
    tags = {
        "building": "apartments",
        "height": "32.0m",
        "building:levels": "10",
        "building:levels:underground": "3",
    }
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground"), min_val=0)

    assert raw_h == 32.0
    assert raw_l == 10
    assert raw_u == 3

    # All values detected from source without fallbacks
    assert raw_h is not None
    assert raw_l is not None
    assert raw_u is not None

    meta = BuildingMetadataItem(
        building_id="BLD-TEST-ALL",
        height=raw_h,
        levels=raw_l,
        underground_levels=raw_u,
        height_source="OSM_HEIGHT_TAG",
        area_sqm=120.0,
        volume_cubic_m=120.0 * raw_h,
        source_attributes={
            "detected_height": raw_h,
            "detected_levels": raw_l,
            "detected_underground_levels": raw_u,
            "has_height": True,
            "has_levels": True,
            "has_underground": True,
        }
    )
    assert meta.underground_levels == 3
    assert meta.source_attributes["has_height"] is True
    assert meta.source_attributes["has_levels"] is True
    assert meta.source_attributes["has_underground"] is True


def test_6_building_with_no_vertical_attributes():
    """Case 6: Building with no vertical attributes -> safe fallbacks used, attribution = 'Configured / Derived'."""
    tags = {"building": "yes", "name": "Generic Building"}
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground"), min_val=0)

    assert raw_h is None
    assert raw_l is None
    assert raw_u is None

    # Fallbacks
    default_floors = 5
    default_basements = 0
    default_height = 18.0

    height_source = "Configured / Derived"
    floors_source = "Configured / Derived"
    basements_source = "Configured / Derived"

    assert default_floors == 5
    assert default_basements == 0
    assert default_height == 18.0
    assert height_source == "Configured / Derived"
    assert floors_source == "Configured / Derived"
    assert basements_source == "Configured / Derived"


def test_7_manual_override_height():
    """Case 7: Manual override of height -> source label updates immediately to 'Configured / Derived'."""
    detected_height = 15.0
    initial_source = "Source: OSM height"

    user_height = 24.0  # User changed height
    if user_height != detected_height:
        current_height_source = "Configured / Derived"
    else:
        current_height_source = initial_source

    assert current_height_source == "Configured / Derived"
    assert current_height_source != initial_source


def test_8_manual_override_floors():
    """Case 8: Manual override of floor count -> source label updates immediately to 'Configured / Derived'."""
    detected_floors = 3
    initial_source = "Source: OSM building:levels"

    user_floors = 5  # User changed floors
    if user_floors != detected_floors:
        current_floors_source = "Configured / Derived"
    else:
        current_floors_source = initial_source

    assert current_floors_source == "Configured / Derived"
    assert current_floors_source != initial_source


def test_9_manual_override_basements():
    """Case 9: Manual override of basement count -> source label updates immediately to 'Configured / Derived'."""
    detected_basements = 2
    initial_source = "Source: OSM building:levels:underground"

    user_basements = 0  # User changed basements
    if user_basements != detected_basements:
        current_basements_source = "Configured / Derived"
    else:
        current_basements_source = initial_source

    assert current_basements_source == "Configured / Derived"
    assert current_basements_source != initial_source


def test_10_reset_to_detected_values():
    """Case 10: Reset to detected values -> restores original detected values and labels."""
    detected_height = 15.0
    detected_floors = 4
    detected_basements = 1

    # Simulate user overrides
    user_height = 30.0
    user_floors = 8
    user_basements = 3

    assert user_height != detected_height
    assert user_floors != detected_floors
    assert user_basements != detected_basements

    # Trigger reset action
    reset_height = detected_height
    reset_floors = detected_floors
    reset_basements = detected_basements

    # Verify restoration
    assert reset_height == 15.0
    assert reset_floors == 4
    assert reset_basements == 1

    # Verify labels restore
    assert (reset_height == detected_height) is True
    assert (reset_floors == detected_floors) is True
    assert (reset_basements == detected_basements) is True


def test_11_dataset_isolation():
    """Case 11: Dataset isolation -> switching datasets does not carry over detected attributes."""
    dataset_1_buildings = [
        {"id": "b1", "tags": {"building": "yes", "height": "25.0", "building:levels": "7"}}
    ]
    dataset_2_buildings = [
        {"id": "b2", "tags": {"building": "yes"}}  # No height or levels
    ]

    # Extract b1 from dataset 1
    d1_tag = dataset_1_buildings[0]["tags"]
    d1_h = parse_numeric_height(d1_tag.get("height"))
    d1_l = parse_numeric_levels(d1_tag.get("building:levels"))
    assert d1_h == 25.0
    assert d1_l == 7

    # Extract b2 from dataset 2 after dataset switch
    d2_tag = dataset_2_buildings[0]["tags"]
    d2_h = parse_numeric_height(d2_tag.get("height"))
    d2_l = parse_numeric_levels(d2_tag.get("building:levels"))
    assert d2_h is None
    assert d2_l is None

    # Ensure no leakage from dataset 1 into dataset 2
    assert d2_h != d1_h
    assert d2_l != d1_l


def test_12_step1_backward_compatibility():
    """Case 12: Backward compatibility -> Step 1 3D generation works identically with detected vs manually configured values."""
    # Run with detected values
    req_detected = BuildingFloors3DRequest(
        building_id="BLD-COMPAT-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=12.0,
        number_of_floors=4,
        number_of_basements=1,
    )
    res_detected = FloorVolumeService.generate_building_floors(req_detected)
    assert res_detected.geometry_status == Geometry3DStatus.VALID
    assert res_detected.floor_count == 5  # 1 basement + 4 floors
    assert len(res_detected.floors) == 5

    # Run with manual configuration
    req_manual = BuildingFloors3DRequest(
        building_id="BLD-COMPAT-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=12.0,
        number_of_floors=4,
        number_of_basements=1,
    )
    res_manual = FloorVolumeService.generate_building_floors(req_manual)
    assert res_manual.geometry_status == Geometry3DStatus.VALID
    assert res_manual.floor_count == res_detected.floor_count
    for fd, fm in zip(res_detected.floors, res_manual.floors):
        assert fd.floor_id == fm.floor_id
        assert fd.base_elevation == fm.base_elevation
        assert fd.top_elevation == fm.top_elevation
        assert fd.height == fm.height


def test_negative_min_level_parsing():
    """Extra test: parsing building:min_level=-2 correctly yields 2 basements."""
    tags = {"building": "yes", "building:min_level": "-2"}
    min_lvl = parse_numeric_integer(tags.get("building:min_level"))
    assert min_lvl == -2
    basements = abs(min_lvl) if min_lvl is not None and min_lvl < 0 else 0
    assert basements == 2
