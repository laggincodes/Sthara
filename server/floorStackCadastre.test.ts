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

describe("🏢 3D Cadastre: Exploded Floor Stack & Unit Volumetric Slicing", () => {
  it("should have populated sample multi-storey building records", () => {
    expect(SAMPLE_BUILDING_FLOOR_STACKS.length).toBeGreaterThanOrEqual(2);
    const patnaHeights = SAMPLE_BUILDING_FLOOR_STACKS.find(
      b => b.id === "patna-central-heights"
    );
    expect(patnaHeights).toBeDefined();
    expect(patnaHeights?.buildingName).toBe("Patna Central Heights");
    expect(patnaHeights?.ulpin).toBe("IN-BR-PAT-0042-3D");
  });

  it("should correctly calculate subsurface and above-ground floor elevations", () => {
    const patnaHeights = getBuildingFloorStackRecord("patna-central-heights");
    expect(patnaHeights).toBeDefined();

    // Check Subsurface floors (Z < 0)
    const b2 = patnaHeights?.floors.find(f => f.floorCode === "B2");
    expect(b2).toBeDefined();
    expect(b2?.elevationBaseM).toBeLessThan(0);
    expect(b2?.floorType).toBe("UNDERGROUND_BASEMENT");

    // Check Ground floor (Z = 0)
    const ground = patnaHeights?.floors.find(f => f.floorCode === "G");
    expect(ground).toBeDefined();
    expect(ground?.elevationBaseM).toBe(0.0);
    expect(ground?.floorType).toBe("GROUND_RETAIL");

    // Check Upper floors (Z > 0)
    const f4 = patnaHeights?.floors.find(f => f.floorCode === "F4");
    expect(f4).toBeDefined();
    expect(f4?.elevationBaseM).toBeGreaterThan(10);
  });

  it("should identify municipal height clashes and unauthorized floors", () => {
    const patnaHeights = getBuildingFloorStackRecord("patna-central-heights");
    expect(patnaHeights).toBeDefined();
    expect(patnaHeights?.sanctionedHeightM).toBe(15.0);
    expect(patnaHeights?.actualHeightM).toBeGreaterThan(15.0);

    // Floors above 15.0m should be flagged as unauthorized height deviations
    const f5 = patnaHeights?.floors.find(f => f.floorCode === "F5");
    const f6 = patnaHeights?.floors.find(f => f.floorCode === "F6");
    const f7 = patnaHeights?.floors.find(f => f.floorCode === "F7");

    expect(f5?.isUnauthorizedFloor).toBe(true);
    expect(f6?.isUnauthorizedFloor).toBe(true);
    expect(f7?.isUnauthorizedFloor).toBe(true);
    expect(f5?.heightViolationNotice).toContain("Exceeds sanctioned municipal height limit");
  });

  it("should lookup unit-level cadastral details, ownership and statutory clearances", () => {
    const unitDetails = getUnitCadastreDetails("IN-BR-PAT-0042-3D-F04-U01");
    expect(unitDetails).not.toBeNull();
    expect(unitDetails?.unit.unitNumber).toContain("Flat 401");
    expect(unitDetails?.unit.carpetAreaSqM).toBe(172.5);
    expect(unitDetails?.unit.owner.name).toBe("Rajesh Ranjan & Rashmi Ranjan");
    expect(unitDetails?.unit.owner.verifiedAadhaarPan).toBe(true);
    expect(unitDetails?.unit.clearances.fireNoc).toBe("APPROVED");
    expect(unitDetails?.unit.clearances.municipalTaxStatus).toBe("CLEARED");
    expect(unitDetails?.unit.easements.length).toBeGreaterThanOrEqual(1);
  });

  it("should return compliant building record for Exhibition Road Tower", () => {
    const tower = getBuildingFloorStackRecord("exhibition-road-tower");
    expect(tower).toBeDefined();
    expect(tower?.sanctionStatus).toBe("FULLY_COMPLIANT");
    expect(tower?.actualHeightM).toBeLessThanOrEqual(tower?.sanctionedHeightM ?? 0);
  });

  it("should serve building floor stack data via db module", async () => {
    const all = await getAllBuildingFloorStacks();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const stack = await getBuildingFloorStack("IN-BR-PAT-0042-3D");
    expect(stack.buildingName).toBe("Patna Central Heights");
    expect(stack.floors.length).toBeGreaterThanOrEqual(8);
  });
});
