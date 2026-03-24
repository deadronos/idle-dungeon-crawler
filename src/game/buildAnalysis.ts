import { createStarterParty } from "./entity";
import { calculateDerivedStats, getCombatRatings } from "./entity.combat";
import type { CombatRatings, HeroClass } from "./entity.types";

// Define hero build configurations for analysis
export interface BuildConfiguration {
  name: string;
  heroClass: HeroClass;
  attributes: {
    vit: number;
    str: number;
    dex: number;
    int: number;
    wis: number;
  };
  expectedFocus: (keyof CombatRatings)[];
  description: string;
}

const buildConfigurations: BuildConfiguration[] = [
  {
    name: "Tank Warrior",
    heroClass: "Warrior",
    attributes: { vit: 25, str: 15, dex: 5, int: 3, wis: 3 },
    expectedFocus: ["guard", "resolve"],
    description: "High survivability, focuses on armor and tenacity",
  },
  {
    name: "Balanced Warrior",
    heroClass: "Warrior",
    attributes: { vit: 15, str: 15, dex: 8, int: 3, wis: 3 },
    expectedFocus: ["power", "guard"],
    description: "Even mix of offense and defense",
  },
  {
    name: "DPS Warrior",
    heroClass: "Warrior",
    attributes: { vit: 10, str: 20, dex: 8, int: 3, wis: 3 },
    expectedFocus: ["power", "crit"],
    description: "Focuses on physical damage output",
  },
  {
    name: "Healer Cleric",
    heroClass: "Cleric",
    attributes: { vit: 12, str: 4, dex: 4, int: 15, wis: 25 },
    expectedFocus: ["spellPower", "resolve", "potency"],
    description: "Maximizes healing and support abilities",
  },
  {
    name: "Battle Cleric",
    heroClass: "Cleric",
    attributes: { vit: 15, str: 8, dex: 5, int: 12, wis: 15 },
    expectedFocus: ["power", "spellPower", "guard"],
    description: "Mix of melee and spell casting",
  },
  {
    name: "DPS Archer",
    heroClass: "Archer",
    attributes: { vit: 8, str: 8, dex: 30, int: 4, wis: 4 },
    expectedFocus: ["precision", "crit", "haste"],
    description: "High damage, fast attacks, critical hits",
  },
  {
    name: "Trickster Archer",
    heroClass: "Archer",
    attributes: { vit: 10, str: 6, dex: 20, int: 8, wis: 6 },
    expectedFocus: ["precision", "haste", "potency"],
    description: "Focus on speed and status effects",
  },
  {
    name: "Sniper Archer",
    heroClass: "Archer",
    attributes: { vit: 6, str: 10, dex: 22, int: 4, wis: 4 },
    expectedFocus: ["precision", "power", "crit"],
    description: "Slow but powerful ranged attacks",
  },
];

// Individual build analysis result
export interface BuildAnalysisResult {
  name: string;
  heroClass: HeroClass;
  ratings: CombatRatings;
  expectedFocus: (keyof CombatRatings)[];
  description: string;
  effectivenessScore: number;
  focusScore: number;
  balanceScore: number;
  primaryRating: keyof CombatRatings;
  primaryRatingValue: number;
}

// Overall diversity analysis
export interface DiversityAnalysis {
  builds: BuildAnalysisResult[];
  classSummaries: Record<HeroClass, {
    averageEffectiveness: number;
    highestBuild: string;
    lowestBuild: string;
    buildCount: number;
  }>;
  overallStats: {
    averageEffectiveness: number;
    mostEffectiveBuild: string;
    leastEffectiveBuild: string;
    ratingVariety: Record<keyof CombatRatings, { min: number; max: number; avg: number }>;
  };
  recommendations: string[];
}

/**
 * Analyze all predefined builds for effectiveness and diversity
 */
export const analyzeBuildDiversity = (): DiversityAnalysis => {
  const results: BuildAnalysisResult[] = [];

  for (const build of buildConfigurations) {
    const party = createStarterParty("TestHero", build.heroClass);
    const hero = party[0];

    // Override attributes
    hero.attributes = { ...build.attributes };

    // Recalculate stats
    calculateDerivedStats(hero, undefined, undefined);

    const ratings = getCombatRatings(hero);

    // Calculate effectiveness scores
    const focusScore = calculateFocusScore(ratings, build.expectedFocus);
    const balanceScore = calculateBalanceScore(ratings);
    const effectivenessScore = focusScore * 0.6 + balanceScore * 0.4;

    // Find primary rating
    const entries = Object.entries(ratings) as [keyof CombatRatings, number][];
    const [primaryRating, primaryValue] = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );

    results.push({
      name: build.name,
      heroClass: build.heroClass,
      ratings,
      expectedFocus: build.expectedFocus,
      description: build.description,
      effectivenessScore,
      focusScore,
      balanceScore,
      primaryRating,
      primaryRatingValue: primaryValue,
    });
  }

  // Generate class summaries
  const classSummaries = generateClassSummaries(results);

  // Generate overall stats
  const overallStats = generateOverallStats(results);

  // Generate recommendations
  const recommendations = generateRecommendations(results, overallStats);

  return {
    builds: results,
    classSummaries,
    overallStats,
    recommendations,
  };
};

/**
 * Calculate how well a build focuses on its intended ratings
 */
const calculateFocusScore = (
  ratings: CombatRatings,
  expectedFocus: (keyof CombatRatings)[]
): number => {
  if (expectedFocus.length === 0) return 0;

  const focusValues = expectedFocus.map((focus) => ratings[focus] ?? 0);
  const totalRatings = Object.values(ratings).reduce((sum, val) => sum + val, 0);

  if (totalRatings === 0) return 0;

  // Calculate what percentage of total ratings come from focus areas
  const focusTotal = focusValues.reduce((sum, val) => sum + val, 0);
  return focusTotal / totalRatings;
};

/**
 * Calculate balance score (higher = more balanced across all ratings)
 */
const calculateBalanceScore = (ratings: CombatRatings): number => {
  const values = Object.values(ratings);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;

  if (average === 0) return 0;

  // Calculate coefficient of variation (lower = more balanced)
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / average;

  // Invert so higher is better, cap at 1
  return Math.max(0, 1 - cv);
};

/**
 * Generate summary statistics per class
 */
const generateClassSummaries = (
  results: BuildAnalysisResult[]
): DiversityAnalysis["classSummaries"] => {
  const summaries: Partial<DiversityAnalysis["classSummaries"]> = {};

  const classes: HeroClass[] = ["Warrior", "Cleric", "Archer"];
  for (const heroClass of classes) {
    const classBuilds = results.filter((b) => b.heroClass === heroClass);
    if (classBuilds.length === 0) continue;

    const avgEffectiveness =
      classBuilds.reduce((sum, b) => sum + b.effectivenessScore, 0) / classBuilds.length;

    const sortedByEffectiveness = [...classBuilds].sort(
      (a, b) => b.effectivenessScore - a.effectivenessScore
    );

    summaries[heroClass] = {
      averageEffectiveness: avgEffectiveness,
      highestBuild: sortedByEffectiveness[0]?.name ?? "",
      lowestBuild: sortedByEffectiveness[sortedByEffectiveness.length - 1]?.name ?? "",
      buildCount: classBuilds.length,
    };
  }

  return summaries as DiversityAnalysis["classSummaries"];
};

/**
 * Generate overall statistics across all builds
 */
const generateOverallStats = (
  results: BuildAnalysisResult[]
): DiversityAnalysis["overallStats"] => {
  const avgEffectiveness =
    results.reduce((sum, b) => sum + b.effectivenessScore, 0) / results.length;

  const sortedByEffectiveness = [...results].sort(
    (a, b) => b.effectivenessScore - a.effectivenessScore
  );

  // Calculate rating variety
  const ratingKeys: (keyof CombatRatings)[] = [
    "power",
    "spellPower",
    "precision",
    "haste",
    "guard",
    "resolve",
    "potency",
    "crit",
  ];

  const ratingVariety = {} as DiversityAnalysis["overallStats"]["ratingVariety"];

  for (const key of ratingKeys) {
    const values = results.map((r) => r.ratings[key]);
    ratingVariety[key] = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    };
  }

  return {
    averageEffectiveness: avgEffectiveness,
    mostEffectiveBuild: sortedByEffectiveness[0]?.name ?? "",
    leastEffectiveBuild: sortedByEffectiveness[sortedByEffectiveness.length - 1]?.name ?? "",
    ratingVariety,
  };
};

/**
 * Generate recommendations for balance improvements
 */
const generateRecommendations = (
  results: BuildAnalysisResult[],
  stats: DiversityAnalysis["overallStats"]
): string[] => {
  const recommendations: string[] = [];

  // Check for underperforming builds
  const underperforming = results.filter(
    (b) => b.effectivenessScore < stats.averageEffectiveness * 0.8
  );
  if (underperforming.length > 0) {
    recommendations.push(
      `Consider rebalancing ${underperforming.length} underperforming build(s): ${underperforming
        .map((b) => b.name)
        .join(", ")}`
    );
  }

  // Check for rating variety issues
  const ratingEntries = Object.entries(stats.ratingVariety) as [
    keyof CombatRatings,
    { min: number; max: number; avg: number }
  ][];

  for (const [rating, variety] of ratingEntries) {
    if (variety.max - variety.min < 5) {
      recommendations.push(
        `${rating} shows low variety across builds (${variety.min.toFixed(1)} - ${variety.max.toFixed(1)}). Consider tuning multipliers.`
      );
    }
  }

  // Check class balance
  const classAverages: Record<string, number> = {};
  for (const heroClass of ["Warrior", "Cleric", "Archer"] as const) {
    const classBuilds = results.filter((b) => b.heroClass === heroClass);
    if (classBuilds.length > 0) {
      classAverages[heroClass] =
        classBuilds.reduce((sum, b) => sum + b.effectivenessScore, 0) / classBuilds.length;
    }
  }

  const classValues = Object.values(classAverages);
  const maxClassAvg = Math.max(...classValues);
  const minClassAvg = Math.min(...classValues);

  if (maxClassAvg - minClassAvg > 0.1) {
    recommendations.push(
      `Class balance disparity detected (${(maxClassAvg - minClassAvg).toFixed(2)}). Review class templates.`
    );
  }

  // Add positive feedback if everything looks good
  if (recommendations.length === 0) {
    recommendations.push("Build diversity looks good! All builds are performing within expected ranges.");
  }

  return recommendations;
};

/**
 * Compare two specific builds
 */
export const compareBuilds = (
  buildName1: string,
  buildName2: string
): {
  build1: BuildAnalysisResult | undefined;
  build2: BuildAnalysisResult | undefined;
  comparison: {
    winner: string;
    margin: number;
    strengths: { build1: string[]; build2: string[] };
  };
} | null => {
  const analysis = analyzeBuildDiversity();
  const build1 = analysis.builds.find((b) => b.name === buildName1);
  const build2 = analysis.builds.find((b) => b.name === buildName2);

  if (!build1 || !build2) return null;

  const winner =
    build1.effectivenessScore > build2.effectivenessScore ? build1.name : build2.name;
  const margin = Math.abs(build1.effectivenessScore - build2.effectivenessScore);

  // Find comparative strengths
  const strengths = {
    build1: [] as string[],
    build2: [] as string[],
  };

  const ratingKeys = Object.keys(build1.ratings) as (keyof CombatRatings)[];
  for (const key of ratingKeys) {
    if (build1.ratings[key] > build2.ratings[key] * 1.2) {
      strengths.build1.push(`${key} (+${(build1.ratings[key] - build2.ratings[key]).toFixed(1)})`);
    } else if (build2.ratings[key] > build1.ratings[key] * 1.2) {
      strengths.build2.push(`${key} (+${(build2.ratings[key] - build1.ratings[key]).toFixed(1)})`);
    }
  }

  return {
    build1,
    build2,
    comparison: {
      winner,
      margin,
      strengths,
    },
  };
};

/**
 * Get all available build names for UI display
 */
export const getAvailableBuildNames = (): string[] => {
  return buildConfigurations.map((b) => b.name);
};

/**
 * Get build configuration by name
 */
export const getBuildConfiguration = (name: string): BuildConfiguration | undefined => {
  return buildConfigurations.find((b) => b.name === name);
};

// Export configurations for external use
export { buildConfigurations };
