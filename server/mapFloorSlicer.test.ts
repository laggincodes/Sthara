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
    expect(workspaceSource).toContain("FloorUnitInspectorDrawer");
  });

  it("BuildingInformationPanel provides interactive floor selector pills, units list, and 3D ULPIN copy", () => {
    expect(buildingInfoPanelSource).toContain("Select Floor Level");
    expect(buildingInfoPanelSource).toContain("All Floors");
    expect(buildingInfoPanelSource).toContain("Registered Cadastral Units");
    expect(buildingInfoPanelSource).toContain("Copy 14-Digit 3D ULPIN");
    expect(buildingInfoPanelSource).toContain("3D Floor Separation (Explode View)");
  });
});
