import { describe, expect, it } from "vitest";
import { confirmedSourceAlias, eligibleSourceAliases } from "./buildingSearchAliases";

describe("source-backed AI building aliases", () => {
  it("makes only lexically anchored source areas eligible for AI routing", () => {
    expect(eligibleSourceAliases("Amity building near Rupaspur")).toContain("Amity University Patna");
    expect(eligibleSourceAliases("Indian Institute of Technology Patna buildings")).toContain("IIT Patna reference area");
    expect(eligibleSourceAliases("All India Institute of Medical Sciences Patna campus")).toContain("AIIMS Patna reference area");
    expect(eligibleSourceAliases("Gandhi Maidan landmark in Patna")).toContain("Gandhi Maidan Patna reference area");
    expect(eligibleSourceAliases("Unknown tower in Patna")).toEqual([]);
  });

  it("requires both a catalog-supported alias and sufficient confidence", () => {
    expect(confirmedSourceAlias("Amity building", "Amity University Patna", 0.8)).toBe("Amity University Patna");
    expect(confirmedSourceAlias("Amity building", "Koramangala 5th Block", 0.95)).toBeNull();
    expect(confirmedSourceAlias("Amity building", "Amity University Patna", 0.4)).toBeNull();
    expect(confirmedSourceAlias("AIIMS Patna", "AIIMS Patna reference area", 0.8)).toBe("AIIMS Patna reference area");
    expect(confirmedSourceAlias("Unknown building in Patna", "AIIMS Patna reference area", 0.99)).toBeNull();
  });
});
