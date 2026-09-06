from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HeightStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    INVALID = "INVALID"
    INCONSISTENT = "INCONSISTENT"
    ESTIMATED = "ESTIMATED"


class HeightSource(str, Enum):
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"
    DSM = "DSM"
    LIDAR = "LIDAR"
    SURVEY = "SURVEY"
    MANUAL_INPUT = "MANUAL_INPUT"
    FLOOR_METADATA = "FLOOR_METADATA"


class HeightMethod(str, Enum):
    DIRECT_DIFFERENCE = "DIRECT_DIFFERENCE"
    ELEVATION_SUBTRACTION = "ELEVATION_SUBTRACTION"
    FLOOR_MULTIPLICATION = "FLOOR_MULTIPLICATION"
    SURVEY_SPECIFIED = "SURVEY_SPECIFIED"


class FloorValidationStatus(str, Enum):
    VALID = "VALID"
    HEIGHT_MISMATCH = "HEIGHT_MISMATCH"
    INCOMPLETE = "INCOMPLETE"
    INVALID = "INVALID"


class FloorGenerationMode(str, Enum):
    KNOWN_FLOOR_COUNT = "KNOWN_FLOOR_COUNT"
    EXPLICIT_FLOOR_HEIGHTS = "EXPLICIT_FLOOR_HEIGHTS"


class HeightCalculationRequest(BaseModel):
    building_id: str = Field(..., description="Unique building structure identifier")
    ground_elevation: Optional[float] = Field(None, description="Ground plinth elevation in meters (AMSL)")
    roof_elevation: Optional[float] = Field(None, description="Structural roof elevation in meters (AMSL)")
    unit: str = Field("meters", description="Vertical unit of measurement")
    ground_reference: str = Field("AMSL", description="Vertical datum of ground elevation")
    roof_reference: str = Field("AMSL", description="Vertical datum of roof elevation")
    source: HeightSource = Field(HeightSource.SYNTHETIC_DEMO, description="Data provenance of roof elevation")


class HeightCalculationResult(BaseModel):
    building_id: str
    ground_elevation: Optional[float] = None
    roof_elevation: Optional[float] = None
    building_height: Optional[float] = None
    unit: str = "meters"
    source: HeightSource = HeightSource.SYNTHETIC_DEMO
    method: HeightMethod = HeightMethod.DIRECT_DIFFERENCE
    status: HeightStatus
    warnings: List[str] = Field(default_factory=list)
    provenance: Dict[str, Any] = Field(default_factory=dict)


class Floor(BaseModel):
    floor_id: str = Field(..., description="Unique floor identifier, e.g. BLD-001-FL00")
    building_id: str = Field(..., description="Parent building structure ID")
    floor_index: int = Field(..., description="Level index (0 for Ground, 1 for First Floor, etc.)")
    floor_name: str = Field(..., description="Descriptive floor name, e.g. 'Ground Floor'")
    base_elevation: float = Field(..., description="Bottom slab elevation in meters AMSL")
    top_elevation: float = Field(..., description="Top slab elevation in meters AMSL")
    floor_height: float = Field(..., description="Vertical height of this floor slab (top - base) in meters")
    source: str = Field("DETERMINISTIC_EQUAL_SLICING", description="Generation method / provenance")
    status: str = Field("VALID", description="Floor integrity status")


class FloorGenerationRequest(BaseModel):
    building_id: str = Field(..., description="Target building structure ID")
    ground_elevation: float = Field(..., description="Base ground elevation in meters AMSL")
    building_height: Optional[float] = Field(None, description="Total building height in meters")
    roof_elevation: Optional[float] = Field(None, description="Roof elevation in meters AMSL")
    mode: FloorGenerationMode = Field(FloorGenerationMode.KNOWN_FLOOR_COUNT, description="Floor calculation strategy")
    floor_count: Optional[int] = Field(None, description="Total number of floors above ground (Mode A)")
    floor_heights: Optional[List[float]] = Field(None, description="Explicit heights for each floor (Mode B)")
    ground_floor_name: str = Field("Ground Floor", description="Naming label for floor index 0")
    tolerance_m: float = Field(0.05, description="Allowable height mismatch tolerance in meters (default 5cm)")


class FloorGenerationResponse(BaseModel):
    building_id: str
    building_height: float
    ground_elevation: float
    roof_elevation: float
    floor_count: int
    floors: List[Floor]
    validation_status: FloorValidationStatus
    difference_m: float = 0.0
    warnings: List[str] = Field(default_factory=list)


class BuildingVerticalSpec(BaseModel):
    building_id: str
    name: str
    structure_type: str
    roof_elevation: float
    building_height: float
    number_of_floors: int
    floor_height: float
    height_source: HeightSource = HeightSource.SYNTHETIC_DEMO
    vertical_datum: str = "AMSL"
    height_unit: str = "meters"
    legal_disclaimer: str = "SYNTHETIC DEMO DATA ONLY. NOT A LEGAL CADASTRAL RECORD."
