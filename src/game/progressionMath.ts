export const BASE_HERO_EXP_REQUIREMENT = 100;
export const HERO_EXP_GROWTH_RATE = 1.26;
export const INSIGHT_XP_BONUS_PER_LEVEL = 0.6;

export const getInsightXpMultiplier = (insightLevel: number) => 1 + (insightLevel * INSIGHT_XP_BONUS_PER_LEVEL);