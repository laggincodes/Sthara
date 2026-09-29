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
  it("resolves realistic 3D floor stack for Rajouri Garden project queries", () => {
    const stack = resolveFloorStackForSelection(null, "Rajouri Garden");
    expect(stack.buildingName).toContain("Rajouri Garden");
    expect(stack.floors.length).toBeGreaterThanOrEqual(4);
    
    const groundFloor = stack.floors.find(f => f.floorCode === "G");
    expect(groundFloor).toBeDefined();
    expect(groundFloor?.units.length).toBeGreaterThan(0);

    const f1Floor = stack.floors.find(f => f.floorCode === "F1");
    expect(f1Floor).toBeDefined();
    expect(f1Floor?.units[0].ulpin3d).toContain("DL-RG-");

    const terrace = stack.floors.find(f => f.floorCode === "TERRACE");
    expect(terrace).toBeDefined();
  });

  it("enforces NO BASEMENT BY DEFAULT unless explicit evidence is provided", () => {
    // 1. Standard G+6 building without explicit basement evidence
    const defaultStack = resolveFloorStackForSelection({ approvedHeightMetres: 22.4, name: "Block A Apartment" });
    expect(defaultStack.basementCount).toBe(0);
    expect(defaultStack.basementSource).toBe("Drawing does not identify basement");
    expect(defaultStack.floors.some(f => f.floorCode === "B1")).toBe(false);
    expect(defaultStack.floors.some(f => f.floorCode === "G")).toBe(true);

    // 2. Explicit basement evidence provided
    const basementStack = resolveFloorStackForSelection({
      name: "Commercial Complex with Basement",
      hasExplicitBasement: true,
      basementCount: 1,
    });
    expect(basementStack.basementCount).toBe(1);
    expect(basementStack.basementSource).toBe("Drawing explicitly identifies basement");
    expect(basementStack.floors.some(f => f.floorCode === "B1")).toBe(true);
  });

  it("dynamically resolves floor stacks based on height, typology, and user overrides", () => {
    const towerStack = resolveFloorStackForSelection({ name: "Ring Road Tower" });
    expect(towerStack.floors.some(f => f.floorCode === "F11")).toBe(true);

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

  it("SpatialWorkspace mounts STHARA controls, map tools, and import modal", () => {
    expect(workspaceSource).toContain("Select Building");
    expect(workspaceSource).toContain("Select Area");
    expect(workspaceSource).toContain("Select Multiple");
    expect(workspaceSource).toContain("Clear Selection");
    expect(workspaceSource).toContain("Build 3D");
    expect(workspaceSource).toContain("Import Data");
    expect(workspaceSource).toContain("BUILDING INSPECTOR");
    expect(workspaceSource).toContain("floorStackData={floorStackData}");
    expect(workspaceSource).toContain("Dedicated 3D Floor Slicer");
    expect(workspaceSource).toContain("PROJECT → IMPORT DATA");
  });

  it("BuildingInformationPanel provides interactive floor selector pills, units list, and 3D ULPIN copy", () => {
    expect(buildingInfoPanelSource).toContain("Select Floor Level");
    expect(buildingInfoPanelSource).toContain("All Floors");
    expect(buildingInfoPanelSource).toContain("Registered Cadastral Units");
    expect(buildingInfoPanelSource).toContain("Copy 14-Digit 3D ULPIN");
    expect(buildingInfoPanelSource).toContain("3D Floor Separation (Explode View)");
  });
});
