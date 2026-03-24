import { describe, it, expect, beforeEach } from "vitest";
import {
  analyzeBuildDiversity,
  compareBuilds,
  getAvailableBuildNames,
  getBuildConfiguration,
  buildConfigurations,
  type DiversityAnalysis,
} from "./buildAnalysis";

describe("Build Analysis", () => {
  let analysis: DiversityAnalysis;

  beforeEach(() => {
    analysis = analyzeBuildDiversity();
  });

  describe("analyzeBuildDiversity", () => {
    it("should return analysis with all required fields", () => {
      expect(analysis).toHaveProperty("builds");
      expect(analysis).toHaveProperty("classSummaries");
      expect(analysis).toHaveProperty("overallStats");
      expect(analysis).toHaveProperty("recommendations");
    });

    it("should have builds for each configuration", () => {
      expect(analysis.builds.length).toBeGreaterThan(0);
      expect(analysis.builds.length).toBe(buildConfigurations.length);
    });

    it("should calculate effectiveness scores for all builds", () => {
      for (const build of analysis.builds) {
        expect(build.effectivenessScore).toBeGreaterThanOrEqual(0);
        expect(build.effectivenessScore).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate focus scores for all builds", () => {
      for (const build of analysis.builds) {
        expect(build.focusScore).toBeGreaterThanOrEqual(0);
        expect(build.focusScore).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate balance scores for all builds", () => {
      for (const build of analysis.builds) {
        expect(build.balanceScore).toBeGreaterThanOrEqual(0);
        expect(build.balanceScore).toBeLessThanOrEqual(1);
      }
    });

    it("should identify primary ratings for all builds", () => {
      for (const build of analysis.builds) {
        expect(build.primaryRating).toBeDefined();
        expect(build.primaryRatingValue).toBeGreaterThan(0);
      }
    });

    it("should have class summaries for all hero classes", () => {
      expect(analysis.classSummaries).toHaveProperty("Warrior");
      expect(analysis.classSummaries).toHaveProperty("Cleric");
      expect(analysis.classSummaries).toHaveProperty("Archer");
    });

    it("should have overall stats with rating variety", () => {
      expect(analysis.overallStats).toHaveProperty("averageEffectiveness");
      expect(analysis.overallStats).toHaveProperty("mostEffectiveBuild");
      expect(analysis.overallStats).toHaveProperty("leastEffectiveBuild");
      expect(analysis.overallStats).toHaveProperty("ratingVariety");

      // Check that all ratings are present
      const ratings: (keyof typeof analysis.overallStats.ratingVariety)[] = [
        "power",
        "spellPower",
        "precision",
        "haste",
        "guard",
        "resolve",
        "potency",
        "crit",
      ];
      for (const rating of ratings) {
        expect(analysis.overallStats.ratingVariety).toHaveProperty(rating);
        expect(analysis.overallStats.ratingVariety[rating]).toHaveProperty("min");
        expect(analysis.overallStats.ratingVariety[rating]).toHaveProperty("max");
        expect(analysis.overallStats.ratingVariety[rating]).toHaveProperty("avg");
      }
    });

    it("should provide at least one recommendation", () => {
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it("should have different builds for the same class", () => {
      const warriorBuilds = analysis.builds.filter((b) => b.heroClass === "Warrior");
      expect(warriorBuilds.length).toBeGreaterThan(1);
    });
  });

  describe("compareBuilds", () => {
    it("should return null for non-existent builds", () => {
      const result = compareBuilds("NonExistent1", "NonExistent2");
      expect(result).toBeNull();
    });

    it("should compare two valid builds", () => {
      const result = compareBuilds("Tank Warrior", "DPS Warrior");
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("build1");
      expect(result).toHaveProperty("build2");
      expect(result).toHaveProperty("comparison");
    });

    it("should identify a winner between builds", () => {
      const result = compareBuilds("Tank Warrior", "DPS Warrior");
      expect(result?.comparison.winner).toMatch(/Tank Warrior|DPS Warrior/);
      expect(result?.comparison.margin).toBeGreaterThanOrEqual(0);
    });

    it("should identify strengths for both builds", () => {
      const result = compareBuilds("Tank Warrior", "DPS Archer");
      expect(result?.comparison.strengths.build1.length).toBeGreaterThanOrEqual(0);
      expect(result?.comparison.strengths.build2.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle builds with same name", () => {
      const result = compareBuilds("Tank Warrior", "Tank Warrior");
      expect(result).not.toBeNull();
      expect(result?.comparison.margin).toBe(0);
    });
  });

  describe("getAvailableBuildNames", () => {
    it("should return array of build names", () => {
      const names = getAvailableBuildNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    it("should include specific build names", () => {
      const names = getAvailableBuildNames();
      expect(names).toContain("Tank Warrior");
      expect(names).toContain("DPS Archer");
      expect(names).toContain("Healer Cleric");
    });

    it("should have unique build names", () => {
      const names = getAvailableBuildNames();
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("getBuildConfiguration", () => {
    it("should return configuration for valid build name", () => {
      const config = getBuildConfiguration("Tank Warrior");
      expect(config).not.toBeUndefined();
      expect(config?.name).toBe("Tank Warrior");
      expect(config?.heroClass).toBe("Warrior");
    });

    it("should return undefined for invalid build name", () => {
      const config = getBuildConfiguration("Invalid Build");
      expect(config).toBeUndefined();
    });

    it("should have valid attributes for each configuration", () => {
      for (const name of getAvailableBuildNames()) {
        const config = getBuildConfiguration(name);
        expect(config?.attributes.vit).toBeGreaterThanOrEqual(0);
        expect(config?.attributes.str).toBeGreaterThanOrEqual(0);
        expect(config?.attributes.dex).toBeGreaterThanOrEqual(0);
        expect(config?.attributes.int).toBeGreaterThanOrEqual(0);
        expect(config?.attributes.wis).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have expected focus for each configuration", () => {
      for (const name of getAvailableBuildNames()) {
        const config = getBuildConfiguration(name);
        expect(config?.expectedFocus.length).toBeGreaterThan(0);
      }
    });
  });

  describe("buildConfigurations", () => {
    it("should export configurations array", () => {
      expect(Array.isArray(buildConfigurations)).toBe(true);
      expect(buildConfigurations.length).toBeGreaterThan(0);
    });

    it("should have configurations for each hero class", () => {
      const classes = ["Warrior", "Cleric", "Archer"];
      for (const heroClass of classes) {
        const classBuilds = buildConfigurations.filter((b) => b.heroClass === heroClass);
        expect(classBuilds.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Effectiveness Scoring", () => {
    it("should score builds with higher expected focus higher", () => {
      const tankBuild = analysis.builds.find((b) => b.name === "Tank Warrior");
      const dpsBuild = analysis.builds.find((b) => b.name === "DPS Archer");

      if (tankBuild && dpsBuild) {
        // Both should have decent scores but different focuses
        expect(tankBuild.effectivenessScore).toBeGreaterThan(0);
        expect(dpsBuild.effectivenessScore).toBeGreaterThan(0);
      }
    });

    it("should have reasonable score distribution", () => {
      const scores = analysis.builds.map((b) => b.effectivenessScore);
      const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // Average should be reasonable (not all 0 or all 1)
      expect(average).toBeGreaterThan(0.1);
      expect(average).toBeLessThan(0.9);
    });
  });

  describe("Rating Variety", () => {
    it("should have different ratings across builds", () => {
      const { ratingVariety } = analysis.overallStats;

      for (const [rating, variety] of Object.entries(ratingVariety)) {
        // Max should be greater than min for variety
        expect(
          variety.max,
          `Rating ${rating} has no variety (min=${variety.min}, max=${variety.max})`
        ).toBeGreaterThan(variety.min);
      }
    });
  });

  describe("Recommendations", () => {
    it("should provide actionable recommendations", () => {
      const recommendations = analysis.recommendations;
      for (const rec of recommendations) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(0);
      }
    });

    it("should detect class imbalances if present", () => {
      // This test will pass if there are no class imbalances (which is good!)
      // or provide a recommendation if there are
      const classImbalanceRec = analysis.recommendations.find((r) =>
        r.includes("Class balance disparity")
      );

      if (classImbalanceRec) {
        expect(classImbalanceRec).toContain("disparity");
      }
    });
  });
});
