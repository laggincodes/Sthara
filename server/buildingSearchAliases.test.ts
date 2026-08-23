import { describe, expect, it } from "vitest";
import { confirmedSourceAlias, eligibleSourceAliases } from "./buildingSearchAliases";

describe("source-backed AI building aliases", () => {
  it("makes only lexically anchored source areas eligible for AI routing", () => {
    expect(eligibleSourceAliases("Amity building near Rupaspur")).toContain("Amity University Patna");
    expect(eligibleSourceAliases("Unknown tower in Patna")).toEqual([]);
  });

  it("requires both a catalog-supported alias and sufficient confidence", () => {
    expect(confirmedSourceAlias("Amity building", "Amity University Patna", 0.8)).toBe("Amity University Patna");
    expect(confirmedSourceAlias("Amity building", "Koramangala 5th Block", 0.95)).toBeNull();
    expect(confirmedSourceAlias("Amity building", "Amity University Patna", 0.4)).toBeNull();
  });
});
