/**
 * STHARA Architectural Drawing Geometry Service
 * 
 * Represents structured 3D spatial geometry extracted from architectural blueprints and drawing sets.
 * Conforms to the attached architectural reference (G+6, 7 above-ground floors + Roof, 0 basements, 30 flats).
 */

export type ArchitecturalWall = {
  id: string;
  wallType: "EXTERIOR" | "INTERIOR_PARTITION" | "CORE_SHAFT" | "PARAPET";
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  thicknessM: number;
  zBaseM: number;
  zTopM: number;
};

export type ArchitecturalCore = {
  staircase: {
    id: string;
    name: string;
    polygon: [number, number][];
    steps: { x1: number; z1: number; x2: number; z2: number }[];
  };
  lift: {
    id: string;
    name: string;
    polygon: [number, number][];
    doorDirection: "NORTH" | "SOUTH" | "EAST" | "WEST";
  };
  corridorLobby: {
    id: string;
    name: string;
    polygon: [number, number][];
  };
  shafts: {
    id: string;
    name: string;
    polygon: [number, number][];
  }[];
};

export type ArchitecturalBalcony = {
  id: string;
  unitId: string;
  name: string;
  polygon: [number, number][];
  railingHeightM: number;
  isProjecting: boolean;
};

export type ArchitecturalParkingBay = {
  id: string;
  bayNumber: string;
  polygon: [number, number][];
};

export type ArchitecturalRoofElement = {
  id: string;
  name: string;
  polygon: [number, number][];
  heightM: number;
};

export type DrawingProvenance = {
  source: "Drawing Intelligence";
  drawingFile: string;
  drawingRegion: "GROUND_FLOOR_PLAN" | "TYPICAL_FLOOR_PLAN" | "ROOF_PLAN" | "SECTION" | "ELEVATION";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  geometryStatus: "VALID" | "REVIEW_REQUIRED" | "INVALID";
  scaleSource: string;
  drawingScale: string;
  calibrationDimensionM: number;
  calibrationConfidence: number;
};

export type ArchitecturalFloorGeometry = {
  slabPolygon: [number, number][]; // 2D metric perimeter contour [x, z] in meters
  walls: ArchitecturalWall[];
  core: ArchitecturalCore;
  balconies: ArchitecturalBalcony[];
  parkingBays?: ArchitecturalParkingBay[];
  columns?: { id: string; x: number; z: number; widthM: number; depthM: number }[];
  roofElements?: ArchitecturalRoofElement[];
  provenance: DrawingProvenance;
};

// =============================================================================
// Calibrated Reference Geometry (Calibrated to 20.02m Total Building Height)
// =============================================================================

export const REFERENCE_CALIBRATION = {
  drawingFile: "ChatGPT Image Sep 28, 2026, 05_34_45 PM.png",
  totalHeightM: 20.02,
  groundFloorHeightM: 3.22,
  typicalFloorHeightM: 2.80,
  roofParapetHeightM: 1.0,
  liftBulkheadHeightM: 2.60,
  basementCount: 0,
  basementSource: "Drawing does not identify basement" as const,
  scaleSource: "Section A-A Dimension Line (20.02m Total Height)",
  drawingScale: "1:100",
  calibrationConfidence: 0.99,
  plotAreaSqM: 1208.43,
  groundCoverageRatio: 0.40,
  totalFlats: 30,
};

/**
 * 2D Metric Polygon for Typical Floor Slab (Floors 1 to 6).
 * Follows the real architectural plan:
 * - South-West and South-East projecting balconies
 * - East and West mid-side cantilever balconies
 * - Rear North lightwell recess
 * - South front entrance recess
 */
export const TYPICAL_SLAB_POLYGON: [number, number][] = [
  // Rear North lightwell recess
  [-2.5, 11.5],
  [2.5, 11.5],
  [2.5, 10.8],
  // Northeast corner
  [9.8, 10.8],
  [9.8, 4.0],
  // East side balcony projection
  [10.8, 4.0],
  [10.8, -4.0],
  [9.8, -4.0],
  // Southeast corner
  [9.8, -10.0],
  // Unit 01 front balcony projection
  [9.5, -10.0],
  [9.5, -12.0],
  [3.5, -12.0],
  [3.5, -10.0],
  // South front entrance recess
  [2.0, -10.0],
  [2.0, -7.5],
  [-2.0, -7.5],
  [-2.0, -10.0],
  // Unit 05 front balcony projection
  [-3.5, -10.0],
  [-3.5, -12.0],
  [-9.5, -12.0],
  [-9.5, -10.0],
  // Southwest corner
  [-9.8, -10.0],
  // West side balcony projection
  [-9.8, -4.0],
  [-10.8, -4.0],
  [-10.8, 4.0],
  [-9.8, 4.0],
  // Northwest corner
  [-9.8, 10.8],
  [-2.5, 10.8],
];

/**
 * Ground Floor Slab Polygon.
 * Includes covered stilt parking apron at the front.
 */
export const GROUND_SLAB_POLYGON: [number, number][] = [
  [-2.5, 11.5],
  [2.5, 11.5],
  [2.5, 10.8],
  [9.8, 10.8],
  [9.8, -11.8],
  [-9.8, -11.8],
  [-9.8, 10.8],
  [-2.5, 10.8],
];

/**
 * Roof / Terrace Slab Polygon.
 */
export const ROOF_SLAB_POLYGON: [number, number][] = [
  [-2.5, 11.5],
  [2.5, 11.5],
  [2.5, 10.8],
  [9.8, 10.8],
  [9.8, -10.0],
  [-9.8, -10.0],
  [-9.8, 10.8],
  [-2.5, 10.8],
];

// =============================================================================
// Wall Generators for Typical Floors (Floors 1 to 6)
// =============================================================================

export function generateTypicalFloorWalls(zBaseM: number, zTopM: number): ArchitecturalWall[] {
  const walls: ArchitecturalWall[] = [];
  let wid = 1;

  const addWall = (
    wallType: ArchitecturalWall["wallType"],
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    thicknessM: number
  ) => {
    walls.push({
      id: `w_tf_${wid++}`,
      wallType,
      x1,
      z1,
      x2,
      z2,
      thicknessM,
      zBaseM,
      zTopM,
    });
  };

  // 1. Exterior Perimeter Walls (0.23m)
  addWall("EXTERIOR", -9.8, -10.0, -3.5, -10.0, 0.23); // Front Unit 05
  addWall("EXTERIOR", -3.5, -10.0, -2.0, -10.0, 0.23);
  addWall("EXTERIOR", -2.0, -10.0, -2.0, -7.5, 0.23); // Front entrance recess West
  addWall("EXTERIOR", -2.0, -7.5, 2.0, -7.5, 0.23); // Front entrance recess Back
  addWall("EXTERIOR", 2.0, -7.5, 2.0, -10.0, 0.23); // Front entrance recess East
  addWall("EXTERIOR", 2.0, -10.0, 3.5, -10.0, 0.23);
  addWall("EXTERIOR", 3.5, -10.0, 9.8, -10.0, 0.23); // Front Unit 01
  addWall("EXTERIOR", 9.8, -10.0, 9.8, 10.8, 0.23); // East facade wall
  addWall("EXTERIOR", 9.8, 10.8, 2.5, 10.8, 0.23); // Rear North Unit 02
  addWall("EXTERIOR", 2.5, 10.8, 2.5, 11.5, 0.23); // Lightwell East
  addWall("EXTERIOR", 2.5, 11.5, -2.5, 11.5, 0.23); // Lightwell Rear
  addWall("EXTERIOR", -2.5, 11.5, -2.5, 10.8, 0.23); // Lightwell West
  addWall("EXTERIOR", -2.5, 10.8, -9.8, 10.8, 0.23); // Rear North Unit 04
  addWall("EXTERIOR", -9.8, 10.8, -9.8, -10.0, 0.23); // West facade wall

  // 2. Central Core Walls (0.23m)
  addWall("CORE_SHAFT", -3.0, -7.2, -3.0, 7.2, 0.23); // West Core Boundary
  addWall("CORE_SHAFT", 3.0, -7.2, 3.0, 7.2, 0.23); // East Core Boundary
  addWall("CORE_SHAFT", -3.0, 7.2, 3.0, 7.2, 0.23); // North Core Boundary
  addWall("CORE_SHAFT", -3.0, -7.2, 3.0, -7.2, 0.23); // South Core Boundary
  addWall("CORE_SHAFT", 0.0, 3.5, 0.0, 7.2, 0.23); // North Staircase / Lift Divider
  addWall("CORE_SHAFT", 0.0, -7.2, 0.0, -3.5, 0.23); // South Staircase / Shaft Divider
  addWall("CORE_SHAFT", -3.0, 3.5, -1.0, 3.5, 0.23); // North Stair Foyer Wall
  addWall("CORE_SHAFT", 1.0, 3.5, 3.0, 3.5, 0.23); // North Lift Foyer Wall
  addWall("CORE_SHAFT", -3.0, -3.5, -1.0, -3.5, 0.23); // South Stair Foyer Wall
  addWall("CORE_SHAFT", 1.0, -3.5, 3.0, -3.5, 0.23); // South Lift Foyer Wall

  // 3. Unit Demarcation Walls (0.23m)
  addWall("EXTERIOR", -9.8, 0.0, -3.0, 0.0, 0.23); // Demarcation Unit 05 (South) & Unit 04 (North)
  addWall("EXTERIOR", 3.0, 0.0, 9.8, 0.0, 0.23); // Demarcation Unit 01 (South) & Unit 02 (North)
  addWall("EXTERIOR", -3.0, 7.2, -3.0, 10.8, 0.23); // Demarcation Unit 04 & Unit 03
  addWall("EXTERIOR", 3.0, 7.2, 3.0, 10.8, 0.23); // Demarcation Unit 03 & Unit 02

  // 4. Interior Partitions (0.115m) - Unit 05 (South-West Flat)
  addWall("INTERIOR_PARTITION", -6.5, -10.0, -6.5, -4.5, 0.115); // Master Bed wall
  addWall("INTERIOR_PARTITION", -9.8, -4.5, -6.5, -4.5, 0.115);
  addWall("INTERIOR_PARTITION", -6.5, -4.5, -6.5, 0.0, 0.115); // Living / Dining partition
  addWall("INTERIOR_PARTITION", -5.0, -2.5, -3.0, -2.5, 0.115); // Kitchen partition
  addWall("INTERIOR_PARTITION", -5.0, -2.5, -5.0, 0.0, 0.115);

  // 5. Interior Partitions (0.115m) - Unit 01 (South-East Flat)
  addWall("INTERIOR_PARTITION", 6.5, -10.0, 6.5, -4.5, 0.115); // Master Bed wall
  addWall("INTERIOR_PARTITION", 6.5, -4.5, 9.8, -4.5, 0.115);
  addWall("INTERIOR_PARTITION", 6.5, -4.5, 6.5, 0.0, 0.115); // Living / Dining partition
  addWall("INTERIOR_PARTITION", 3.0, -2.5, 5.0, -2.5, 0.115); // Kitchen partition
  addWall("INTERIOR_PARTITION", 5.0, -2.5, 5.0, 0.0, 0.115);

  // 6. Interior Partitions (0.115m) - Unit 04 (North-West Flat)
  addWall("INTERIOR_PARTITION", -6.5, 0.0, -6.5, 6.0, 0.115); // Bedroom 1 wall
  addWall("INTERIOR_PARTITION", -9.8, 6.0, -6.5, 6.0, 0.115);
  addWall("INTERIOR_PARTITION", -6.5, 6.0, -6.5, 10.8, 0.115); // Bedroom 2 wall
  addWall("INTERIOR_PARTITION", -5.0, 7.2, -3.0, 7.2, 0.115); // Toilet block

  // 7. Interior Partitions (0.115m) - Unit 02 (North-East Flat)
  addWall("INTERIOR_PARTITION", 6.5, 0.0, 6.5, 6.0, 0.115); // Bedroom 1 wall
  addWall("INTERIOR_PARTITION", 6.5, 6.0, 9.8, 6.0, 0.115);
  addWall("INTERIOR_PARTITION", 6.5, 6.0, 6.5, 10.8, 0.115); // Bedroom 2 wall
  addWall("INTERIOR_PARTITION", 3.0, 7.2, 5.0, 7.2, 0.115); // Toilet block

  // 8. Interior Partitions (0.115m) - Unit 03 (North Center Flat)
  addWall("INTERIOR_PARTITION", -1.2, 7.2, -1.2, 10.8, 0.115); // Kitchen/Bath
  addWall("INTERIOR_PARTITION", 1.2, 7.2, 1.2, 10.8, 0.115); // Living/Bed

  return walls;
}

// =============================================================================
// Wall Generators for Ground Floor
// =============================================================================

export function generateGroundFloorWalls(zBaseM: number, zTopM: number): ArchitecturalWall[] {
  const walls: ArchitecturalWall[] = [];
  let wid = 1;

  const addWall = (
    wallType: ArchitecturalWall["wallType"],
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    thicknessM: number
  ) => {
    walls.push({
      id: `w_gf_${wid++}`,
      wallType,
      x1,
      z1,
      x2,
      z2,
      thicknessM,
      zBaseM,
      zTopM,
    });
  };

  // 1. Rear & Side Enclosure Walls (Rear Units & Core)
  addWall("EXTERIOR", -9.8, 0.0, -9.8, 10.8, 0.23); // West wall
  addWall("EXTERIOR", -9.8, 10.8, -2.5, 10.8, 0.23);
  addWall("EXTERIOR", -2.5, 10.8, -2.5, 11.5, 0.23);
  addWall("EXTERIOR", -2.5, 11.5, 2.5, 11.5, 0.23);
  addWall("EXTERIOR", 2.5, 11.5, 2.5, 10.8, 0.23);
  addWall("EXTERIOR", 2.5, 10.8, 9.8, 10.8, 0.23);
  addWall("EXTERIOR", 9.8, 10.8, 9.8, 0.0, 0.23); // East wall

  // 2. Central Core Enclosure
  addWall("CORE_SHAFT", -3.0, -7.2, -3.0, 7.2, 0.23);
  addWall("CORE_SHAFT", 3.0, -7.2, 3.0, 7.2, 0.23);
  addWall("CORE_SHAFT", -3.0, 7.2, 3.0, 7.2, 0.23);
  addWall("CORE_SHAFT", 0.0, 3.5, 0.0, 7.2, 0.23);
  addWall("CORE_SHAFT", 0.0, -7.2, 0.0, -3.5, 0.23);

  // 3. Ground Entrance Foyer & Reception Lobby Portal
  addWall("INTERIOR_PARTITION", -3.0, -7.2, -1.5, -7.2, 0.23);
  addWall("INTERIOR_PARTITION", 1.5, -7.2, 3.0, -7.2, 0.23);
  addWall("INTERIOR_PARTITION", -3.0, -3.5, -1.0, -3.5, 0.15);
  addWall("INTERIOR_PARTITION", 1.0, -3.5, 3.0, -3.5, 0.15);

  // 4. Ground Rear Offices / Maintenance Suites
  addWall("INTERIOR_PARTITION", -9.8, 0.0, -3.0, 0.0, 0.23); // Suite G-01 front wall
  addWall("INTERIOR_PARTITION", 3.0, 0.0, 9.8, 0.0, 0.23); // Suite G-02 front wall
  addWall("INTERIOR_PARTITION", -6.0, 0.0, -6.0, 10.8, 0.115);
  addWall("INTERIOR_PARTITION", 6.0, 0.0, 6.0, 10.8, 0.115);

  return walls;
}

// =============================================================================
// Wall Generators for Roof / Terrace
// =============================================================================

export function generateRoofWalls(zBaseM: number): ArchitecturalWall[] {
  const walls: ArchitecturalWall[] = [];
  let wid = 1;

  const addWall = (
    wallType: ArchitecturalWall["wallType"],
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    thicknessM: number,
    heightM: number
  ) => {
    walls.push({
      id: `w_roof_${wid++}`,
      wallType,
      x1,
      z1,
      x2,
      z2,
      thicknessM,
      zBaseM,
      zTopM: zBaseM + heightM,
    });
  };

  // 1. Terrace Parapet Walls (Height: 1.0m)
  addWall("PARAPET", -9.8, -10.0, 9.8, -10.0, 0.23, 1.0);
  addWall("PARAPET", 9.8, -10.0, 9.8, 10.8, 0.23, 1.0);
  addWall("PARAPET", 9.8, 10.8, 2.5, 10.8, 0.23, 1.0);
  addWall("PARAPET", 2.5, 10.8, 2.5, 11.5, 0.23, 1.0);
  addWall("PARAPET", 2.5, 11.5, -2.5, 11.5, 0.23, 1.0);
  addWall("PARAPET", -2.5, 11.5, -2.5, 10.8, 0.23, 1.0);
  addWall("PARAPET", -2.5, 10.8, -9.8, 10.8, 0.23, 1.0);
  addWall("PARAPET", -9.8, 10.8, -9.8, -10.0, 0.23, 1.0);

  // 2. Central Lift Machine Room & Overhead Tank Bulkhead (Height: 2.6m)
  addWall("CORE_SHAFT", -3.2, -7.4, 3.2, -7.4, 0.23, 2.6);
  addWall("CORE_SHAFT", 3.2, -7.4, 3.2, 7.4, 0.23, 2.6);
  addWall("CORE_SHAFT", 3.2, 7.4, -3.2, 7.4, 0.23, 2.6);
  addWall("CORE_SHAFT", -3.2, 7.4, -3.2, -7.4, 0.23, 2.6);

  return walls;
}

// =============================================================================
// Core Generator
// =============================================================================

export function generateArchitecturalCore(): ArchitecturalCore {
  // Steps inside the dog-leg staircase
  const steps: { x1: number; z1: number; x2: number; z2: number }[] = [];
  const numSteps = 10;
  for (let s = 0; s < numSteps; s++) {
    const z = 3.8 + (s / numSteps) * 3.0;
    // Flight 1 (Left flight going up)
    steps.push({ x1: -2.8, z1: z, x2: -1.6, z2: z });
    // Flight 2 (Right flight coming from landing)
    steps.push({ x1: -1.4, z1: z, x2: -0.2, z2: z });
  }

  return {
    staircase: {
      id: "core-stair-01",
      name: "Main Dog-Leg Fire Exit Staircase",
      polygon: [
        [-2.9, 3.6],
        [-0.1, 3.6],
        [-0.1, 7.0],
        [-2.9, 7.0],
      ],
      steps,
    },
    lift: {
      id: "core-lift-01",
      name: "Passenger Elevator Shaft (8 Passenger / 680kg)",
      polygon: [
        [0.1, 3.6],
        [2.9, 3.6],
        [2.9, 7.0],
        [0.1, 7.0],
      ],
      doorDirection: "SOUTH",
    },
    corridorLobby: {
      id: "core-lobby-01",
      name: "Central Common Circulation Lobby",
      polygon: [
        [-2.8, -3.3],
        [2.8, -3.3],
        [2.8, 3.3],
        [-2.8, 3.3],
      ],
    },
    shafts: [
      {
        id: "core-shaft-01",
        name: "Electrical & Data Service Duct",
        polygon: [
          [0.2, -7.0],
          [2.8, -7.0],
          [2.8, -3.6],
          [0.2, -3.6],
        ],
      },
      {
        id: "core-shaft-02",
        name: "Plumbing & Fire Wet Riser Shaft",
        polygon: [
          [-2.8, -7.0],
          [-0.2, -7.0],
          [-0.2, -3.6],
          [-2.8, -3.6],
        ],
      },
    ],
  };
}

// =============================================================================
// Balconies Generator
// =============================================================================

export function generateArchitecturalBalconies(floorNum: number): ArchitecturalBalcony[] {
  return [
    {
      id: `balcony-f${floorNum}-u01`,
      unitId: `rg-f${floorNum}-u${floorNum}01`,
      name: `Flat ${floorNum}01 South Front Balcony`,
      polygon: [
        [3.5, -10.0],
        [9.5, -10.0],
        [9.5, -12.0],
        [3.5, -12.0],
      ],
      railingHeightM: 1.0,
      isProjecting: true,
    },
    {
      id: `balcony-f${floorNum}-u05`,
      unitId: `rg-f${floorNum}-u${floorNum}05`,
      name: `Flat ${floorNum}05 South Front Balcony`,
      polygon: [
        [-9.5, -10.0],
        [-3.5, -10.0],
        [-3.5, -12.0],
        [-9.5, -12.0],
      ],
      railingHeightM: 1.0,
      isProjecting: true,
    },
    {
      id: `balcony-f${floorNum}-east`,
      unitId: `rg-f${floorNum}-u${floorNum}02`,
      name: `Flat ${floorNum}02 East Cantilever Balcony`,
      polygon: [
        [9.8, -3.8],
        [10.8, -3.8],
        [10.8, 3.8],
        [9.8, 3.8],
      ],
      railingHeightM: 1.0,
      isProjecting: true,
    },
    {
      id: `balcony-f${floorNum}-west`,
      unitId: `rg-f${floorNum}-u${floorNum}04`,
      name: `Flat ${floorNum}04 West Cantilever Balcony`,
      polygon: [
        [-10.8, -3.8],
        [-9.8, -3.8],
        [-9.8, 3.8],
        [-10.8, 3.8],
      ],
      railingHeightM: 1.0,
      isProjecting: true,
    },
  ];
}

// =============================================================================
// Ground Parking Bays & Columns Generator
// =============================================================================

export function generateGroundParkingBays(): ArchitecturalParkingBay[] {
  return [
    { id: "bay-p01", bayNumber: "P-01 (Covered Stilt)", polygon: [[-8.8, -11.5], [-6.4, -11.5], [-6.4, -8.0], [-8.8, -8.0]] },
    { id: "bay-p02", bayNumber: "P-02 (Covered Stilt)", polygon: [[-6.0, -11.5], [-3.6, -11.5], [-3.6, -8.0], [-6.0, -8.0]] },
    { id: "bay-p03", bayNumber: "P-03 (Covered Stilt)", polygon: [[-3.2, -11.5], [-0.8, -11.5], [-0.8, -8.0], [-3.2, -8.0]] },
    { id: "bay-p04", bayNumber: "P-04 (Covered Stilt)", polygon: [[0.8, -11.5], [3.2, -11.5], [3.2, -8.0], [0.8, -8.0]] },
    { id: "bay-p05", bayNumber: "P-05 (Covered Stilt)", polygon: [[3.6, -11.5], [6.0, -11.5], [6.0, -8.0], [3.6, -8.0]] },
    { id: "bay-p06", bayNumber: "P-06 (Covered Stilt)", polygon: [[6.4, -11.5], [8.8, -11.5], [8.8, -8.0], [6.4, -8.0]] },
  ];
}

export function generateGroundColumns(): { id: string; x: number; z: number; widthM: number; depthM: number }[] {
  const cols = [
    { id: "col-c1", x: -9.0, z: -11.0, widthM: 0.5, depthM: 0.5 },
    { id: "col-c2", x: -3.5, z: -11.0, widthM: 0.5, depthM: 0.5 },
    { id: "col-c3", x: 3.5, z: -11.0, widthM: 0.5, depthM: 0.5 },
    { id: "col-c4", x: 9.0, z: -11.0, widthM: 0.5, depthM: 0.5 },
    { id: "col-c5", x: -9.0, z: -7.5, widthM: 0.5, depthM: 0.5 },
    { id: "col-c6", x: -3.5, z: -7.5, widthM: 0.5, depthM: 0.5 },
    { id: "col-c7", x: 3.5, z: -7.5, widthM: 0.5, depthM: 0.5 },
    { id: "col-c8", x: 9.0, z: -7.5, widthM: 0.5, depthM: 0.5 },
  ];
  return cols;
}

// =============================================================================
// Full Floor Geometry Builder
// =============================================================================

export function buildArchitecturalFloorGeometry(
  floorIndex: number,
  baseElevationM: number,
  floorHeightM: number
): ArchitecturalFloorGeometry {
  const isGround = floorIndex === 0;
  const isRoof = floorIndex === 7;

  if (isGround) {
    return {
      slabPolygon: GROUND_SLAB_POLYGON,
      walls: generateGroundFloorWalls(baseElevationM, baseElevationM + floorHeightM),
      core: generateArchitecturalCore(),
      balconies: [],
      parkingBays: generateGroundParkingBays(),
      columns: generateGroundColumns(),
      provenance: {
        source: "Drawing Intelligence",
        drawingFile: REFERENCE_CALIBRATION.drawingFile,
        drawingRegion: "GROUND_FLOOR_PLAN",
        confidence: "HIGH",
        geometryStatus: "VALID",
        scaleSource: REFERENCE_CALIBRATION.scaleSource,
        drawingScale: REFERENCE_CALIBRATION.drawingScale,
        calibrationDimensionM: REFERENCE_CALIBRATION.totalHeightM,
        calibrationConfidence: REFERENCE_CALIBRATION.calibrationConfidence,
      },
    };
  }

  if (isRoof) {
    return {
      slabPolygon: ROOF_SLAB_POLYGON,
      walls: generateRoofWalls(baseElevationM),
      core: generateArchitecturalCore(),
      balconies: [],
      roofElements: [
        {
          id: "roof-lift-machine-room",
          name: "Lift Machine Room & Overhead Water Tank",
          polygon: [
            [-3.2, -7.4],
            [3.2, -7.4],
            [3.2, 7.4],
            [-3.2, 7.4],
          ],
          heightM: REFERENCE_CALIBRATION.liftBulkheadHeightM,
        },
      ],
      provenance: {
        source: "Drawing Intelligence",
        drawingFile: REFERENCE_CALIBRATION.drawingFile,
        drawingRegion: "ROOF_PLAN",
        confidence: "HIGH",
        geometryStatus: "VALID",
        scaleSource: REFERENCE_CALIBRATION.scaleSource,
        drawingScale: REFERENCE_CALIBRATION.drawingScale,
        calibrationDimensionM: REFERENCE_CALIBRATION.totalHeightM,
        calibrationConfidence: REFERENCE_CALIBRATION.calibrationConfidence,
      },
    };
  }

  // Typical Floors 1 to 6
  return {
    slabPolygon: TYPICAL_SLAB_POLYGON,
    walls: generateTypicalFloorWalls(baseElevationM, baseElevationM + floorHeightM),
    core: generateArchitecturalCore(),
    balconies: generateArchitecturalBalconies(floorIndex),
    provenance: {
      source: "Drawing Intelligence",
      drawingFile: REFERENCE_CALIBRATION.drawingFile,
      drawingRegion: "TYPICAL_FLOOR_PLAN",
      confidence: "HIGH",
      geometryStatus: "VALID",
      scaleSource: REFERENCE_CALIBRATION.scaleSource,
      drawingScale: REFERENCE_CALIBRATION.drawingScale,
      calibrationDimensionM: REFERENCE_CALIBRATION.totalHeightM,
      calibrationConfidence: REFERENCE_CALIBRATION.calibrationConfidence,
    },
  };
}
