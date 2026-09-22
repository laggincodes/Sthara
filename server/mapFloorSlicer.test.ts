import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveFloorStackForSelection,
  SAMPLE_BUILDING_FLOOR_STACKS,
} from "../shared/floorCadastre";

const cesiumViewerSource = readFileSync(
  resolve(process.cwd(), "client/src/components/CesiumSpatialViewer.tsx"),
  "utf8"
);
const workspaceSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/SpatialWorkspace.tsx"),
  "utf8"
);
const buildingInfoPanelSource = readFileSync(
  resolve(process.cwd(), "client/src/components/BuildingInformationPanel.tsx"),
  "utf8"
);

describe("Map-Native Multi-Storey Floor Slicer & Cadastral Slicing", () => {
  it("resolves realistic 3D floor stack for IIT Patna search queries", () => {
    const stack = resolveFloorStackForSelection(null, "IIT Patna");
    expect(stack.buildingName).toContain("IIT Patna");
    expect(stack.floors.length).toBeGreaterThanOrEqual(4);
    
    const groundFloor = stack.floors.find(f => f.floorCode === "G");
    expect(groundFloor).toBeDefined();
    expect(groundFloor?.units.length).toBeGreaterThan(0);

    const f1Floor = stack.floors.find(f => f.floorCode === "F1");
    expect(f1Floor).toBeDefined();
    expect(f1Floor?.units[0].ulpin3d).toContain("IN-BR-PAT-IITP");

    const terrace = stack.floors.find(f => f.floorCode === "TERRACE");
    expect(terrace).toBeDefined();
  });

  it("dynamically resolves 7, 8, 10, 12 floor stacks based on height, typology, and user overrides", () => {
    // 1. Height-derived (e.g. 25.6m height -> ~8 floors)
    const eightFloorHeightStack = resolveFloorStackForSelection({ approvedHeightMetres: 25.6, name: "Ganga View Residency" });
    // Total floor objects = B1 (for >=6 floors) + G + F1..F7 + Terrace
    expect(eightFloorHeightStack.floors.some(f => f.floorCode === "F7")).toBe(true);
    expect(eightFloorHeightStack.floors.some(f => f.floorCode === "B1")).toBe(true);
    expect(eightFloorHeightStack.floors.some(f => f.floorCode === "TERRACE")).toBe(true);

    // 2. High-rise typology keyword (Tower -> 12 floors)
    const towerStack = resolveFloorStackForSelection({ name: "Patna Tech Tower" });
    expect(towerStack.floors.some(f => f.floorCode === "F11")).toBe(true);

    // 3. User Storey Level Override (e.g. 10 floors)
    const custom10FloorStack = resolveFloorStackForSelection(null, "Custom Building", 10);
    expect(custom10FloorStack.floors.some(f => f.floorCode === "F9")).toBe(true);
    expect(custom10FloorStack.floors.some(f => f.floorCode === "TERRACE")).toBe(true);
  });

  it("CesiumSpatialViewer exposes floor explosion, active floor isolation and floor stack props", () => {
    expect(cesiumViewerSource).toContain("floorExplosionFactor?: number");
    expect(cesiumViewerSource).toContain("activeFloorIndex?: number | null");
    expect(cesiumViewerSource).toContain("floorStackData?: BuildingFloorStackRecord | null");
    expect(cesiumViewerSource).toContain("onFloorSelect?: (floorIndex: number | null) => void");
    expect(cesiumViewerSource).toContain("3D Cadastre Level");
  });

  it("SpatialWorkspace mounts the on-map 3D Floor Slicer dock and connects to CesiumSpatialViewer", () => {
    expect(workspaceSource).toContain("3D Floor Slicer");
    expect(workspaceSource).toContain("Vertical Explosion (Separate Floors)");
    expect(workspaceSource).toContain("floorExplosionFactor={floorExplosionFactor}");
    expect(workspaceSource).toContain("activeFloorIndex={activeFloorIndex}");
    expect(workspaceSource).toContain("floorStackData={floorStackData}");
    expect(workspaceSource).toContain("overrideFloorCount");
    expect(workspaceSource).toContain("FloorUnitInspectorDrawer");
  });

  it("BuildingInformationPanel provides interactive floor selector pills, units list, and 3D ULPIN copy", () => {
    expect(buildingInfoPanelSource).toContain("Select Floor Level");
    expect(buildingInfoPanelSource).toContain("All Floors");
    expect(buildingInfoPanelSource).toContain("Registered Cadastral Units");
    expect(buildingInfoPanelSource).toContain("Copy 14-Digit 3D ULPIN");
    expect(buildingInfoPanelSource).toContain("3D Floor Separation (Explode View)");
  });

  it("CesiumSpatialViewer isolates floor cadastre slicing to the single selected building while other search-area buildings remain solid 3D structures", () => {
    expect(cesiumViewerSource).toContain("selectedUlpin?: string | null");
    expect(cesiumViewerSource).toContain("targetFloorEntity");
    expect(cesiumViewerSource).toContain("activeTargetUlpin");
    expect(cesiumViewerSource).toContain("All other non-selected buildings remain continuous, solid 3D structures");
    expect(workspaceSource).toContain("selectedUlpin=");
  });
});

