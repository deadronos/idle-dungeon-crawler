import { describe, expect, it } from "vitest";
import { getInsightXpMultiplier, INSIGHT_XP_BONUS_PER_LEVEL } from "./progressionMath";

describe("progressionMath", () => {
  describe("getInsightXpMultiplier", () => {
    it("returns 1 when insight level is 0", () => {
      expect(getInsightXpMultiplier(0)).toBe(1);
    });

    it("returns the correct multiplier for insight level 1", () => {
      expect(getInsightXpMultiplier(1)).toBe(1 + INSIGHT_XP_BONUS_PER_LEVEL);
    });

    it("returns the correct multiplier for a higher insight level (e.g., 10)", () => {
      expect(getInsightXpMultiplier(10)).toBe(1 + (10 * INSIGHT_XP_BONUS_PER_LEVEL));
    });

    it("handles negative insight levels correctly", () => {
      expect(getInsightXpMultiplier(-1)).toBe(1 - INSIGHT_XP_BONUS_PER_LEVEL);
    });
  });
});
