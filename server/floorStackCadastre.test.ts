import { describe, expect, it } from "vitest";
import {
  SAMPLE_BUILDING_FLOOR_STACKS,
  getBuildingFloorStackRecord,
  getUnitCadastreDetails,
} from "@shared/floorCadastre";
import {
  getBuildingFloorStack,
  getAllBuildingFloorStacks,
} from "./db";

describe("🏢 3D Cadastre: Drawing-Grounded G+6 Floor Stack & Unit Volumetric Slicing", () => {
  it("should have populated drawing-grounded Rajouri Garden Block A record", () => {
    expect(SAMPLE_BUILDING_FLOOR_STACKS.length).toBeGreaterThanOrEqual(1);
    const rgBlockA = SAMPLE_BUILDING_FLOOR_STACKS.find(
      b => b.id === "rajouri-garden-block-a"
    );
    expect(rgBlockA).toBeDefined();
    expect(rgBlockA?.buildingName).toContain("Rajouri Garden");
    expect(rgBlockA?.ulpin).toBe("DELHI-RAJOURI-B001-3D");
    expect(rgBlockA?.actualHeightM).toBe(20.02);
    expect(rgBlockA?.basementCount).toBe(0);
    expect(rgBlockA?.basementSource).toBe("Drawing does not identify basement");
  });

  it("should correctly calculate drawing-calibrated floor elevations (G=3.22m, F1-F6=2.80m)", () => {
    const rgBlockA = getBuildingFloorStackRecord("rajouri-garden-block-a");
    expect(rgBlockA).toBeDefined();

    // Zero basements
    expect(rgBlockA?.floors.some(f => f.floorType === "UNDERGROUND_BASEMENT")).toBe(false);

    // Ground floor (3.22m height)
    const ground = rgBlockA?.floors.find(f => f.floorCode === "G");
    expect(ground).toBeDefined();
    expect(ground?.elevationBaseM).toBe(0.0);
    expect(ground?.floorHeightM).toBe(3.22);
    expect(ground?.architecturalGeometry?.columns?.length).toBeGreaterThan(0);
    expect(ground?.architecturalGeometry?.parkingBays?.length).toBe(6);

    // Upper floors (2.80m each)
    const f1 = rgBlockA?.floors.find(f => f.floorCode === "F1");
    expect(f1).toBeDefined();
    expect(f1?.elevationBaseM).toBe(3.22);
    expect(f1?.floorHeightM).toBe(2.80);
    expect(f1?.units.length).toBe(5);

    const f6 = rgBlockA?.floors.find(f => f.floorCode === "F6");
    expect(f6).toBeDefined();
    expect(f6?.elevationBaseM).toBe(17.22);
    expect(f6?.floorHeightM).toBe(2.80);
    expect(f6?.units.length).toBe(5);

    // Terrace with parapet and bulkhead
    const terrace = rgBlockA?.floors.find(f => f.floorCode === "TERRACE");
    expect(terrace).toBeDefined();
    expect(terrace?.elevationBaseM).toBe(20.02);
    expect(terrace?.architecturalGeometry?.roofElements?.length).toBeGreaterThan(0);
  });

  it("should contain all 30 residential flats across floors 1 to 6", () => {
    const rgBlockA = getBuildingFloorStackRecord("rajouri-garden-block-a");
    expect(rgBlockA).toBeDefined();

    let totalFlats = 0;
    for (let f = 1; f <= 6; f++) {
      const floor = rgBlockA?.floors.find(fl => fl.floorCode === `F${f}`);
      expect(floor).toBeDefined();
      expect(floor?.units.length).toBe(5);
      totalFlats += floor?.units.length || 0;
    }
    expect(totalFlats).toBe(30);
  });

  it("should lookup unit-level cadastral details, ownership and statutory clearances", () => {
    const unitDetails = getUnitCadastreDetails("DL-RG-B001-F04-U401");
    expect(unitDetails).not.toBeNull();
    expect(unitDetails?.unit.unitNumber).toContain("Flat 401");
    expect(unitDetails?.unit.carpetAreaSqM).toBe(88.5);
    expect(unitDetails?.unit.owner.verifiedAadhaarPan).toBe(true);
    expect(unitDetails?.unit.clearances.fireNoc).toBe("APPROVED");
    expect(unitDetails?.unit.clearances.municipalTaxStatus).toBe("CLEARED");
    expect(unitDetails?.unit.easements.length).toBeGreaterThanOrEqual(1);
  });

  it("should verify architectural geometry attached to floor stack levels", () => {
    const rgBlockA = getBuildingFloorStackRecord("rajouri-garden-block-a");
    const f2 = rgBlockA?.floors.find(f => f.floorCode === "F2");
    expect(f2?.architecturalGeometry).toBeDefined();
    expect(f2?.architecturalGeometry?.slabPolygon.length).toBeGreaterThanOrEqual(8);
    expect(f2?.architecturalGeometry?.walls.length).toBeGreaterThan(20);
    expect(f2?.architecturalGeometry?.core.lift).toBeDefined();
    expect(f2?.architecturalGeometry?.core.staircase.steps.length).toBeGreaterThan(10);
    expect(f2?.architecturalGeometry?.balconies.length).toBeGreaterThan(0);
  });

  it("should serve building floor stack data via db module", async () => {
    const all = await getAllBuildingFloorStacks();
    expect(all.length).toBeGreaterThanOrEqual(1);

    const stack = await getBuildingFloorStack("DELHI-RAJOURI-B001-3D");
    expect(stack.buildingName).toContain("Rajouri Garden");
    expect(stack.actualHeightM).toBe(20.02);
    expect(stack.floors.length).toBe(8); // G + 6 + Terrace
  });
});
