import { describe, expect, it } from "vitest";
import { getDefaultRegionProgress, getRegionDefinition, getStartingFloorContext } from "./regions";

describe("region data model", () => {
  it("should provide a default region definition for Dank Cellar", () => {
    const def = getRegionDefinition("dank cellar");
    expect(def.name).toBe("Dank Cellar");
    expect(def.localFloorEnd).toBe(50);
    expect(def.nextRegionId).toBe("forgotten tunnels");
  });

  it("should return the starting floor context", () => {
    const ctx = getStartingFloorContext();
    expect(ctx.regionId).toBe("dank cellar");
    expect(ctx.localFloor).toBe(1);
    expect(ctx.globalFloor).toBe(1);
  });

  it("should provide empty region progress", () => {
    const progress = getDefaultRegionProgress();
    expect(progress["dank cellar"]).toBeDefined();
    expect(progress["dank cellar"].highestLocalFloorCleared).toBe(0);
    expect(progress["dank cellar"].unlocked).toBe(true);
  });
});
