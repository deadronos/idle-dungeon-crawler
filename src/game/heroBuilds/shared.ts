import type { HeroCombatRating } from "../classTemplates";
import type { Entity, HeroClass } from "../entity";
import type { EquipmentItemInstance, EquipmentProgressionState, TalentProgressionState } from "../store/types";

export type EquipmentSlot = "weapon" | "armor" | "charm" | "trinket";

export interface HeroBuildEffects {
    ratingBonuses?: Partial<Record<HeroCombatRating, number>>;
    specialAttackCostDelta?: number;
    specialAttackDamageMultiplierBonus?: number;
    specialAttackCritChanceBonus?: number;
    healMultiplierBonus?: number;
    blessRegenMultiplierBonus?: number;
    resourceOnResolvedAttackBonus?: number;
    resourceOnTakeDamageBonus?: number;
    maxResourceFlatBonus?: number;
}

export interface EquipmentScalingDefinition {
    base: HeroBuildEffects;
    perTier?: HeroBuildEffects;
    perRank?: HeroBuildEffects;
}

export interface ClassPassiveDefinition {
    id: string;
    heroClass: HeroClass;
    name: string;
    description: string;
    effects: HeroBuildEffects;
}

export interface TalentDefinition {
    id: string;
    heroClass: HeroClass;
    name: string;
    description: string;
    effects: HeroBuildEffects;
    maxRank?: number;
    perRankEffects?: HeroBuildEffects;
}

export interface RankedTalentDefinition extends Omit<TalentDefinition, "maxRank"> {
    maxRank: number;
    currentRank: number;
}

export interface EquipmentItemDefinition {
    id: string;
    slot: EquipmentSlot;
    name: string;
    description: string;
    heroClasses?: HeroClass[];
    affinityTags: string[];
    scaling: EquipmentScalingDefinition;
    sellValueBase: number;
    sellValuePerTier: number;
    sellValuePerRank: number;
}

export interface ResolvedEquipmentItem extends EquipmentItemInstance {
    id: string;
    name: string;
    description: string;
    heroClasses?: HeroClass[];
    effects: HeroBuildEffects;
}

export interface HeroBuildState {
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
}

export interface HeroBuildProfile {
    passive: ClassPassiveDefinition | null;
    talents: RankedTalentDefinition[];
    equippedItems: ResolvedEquipmentItem[];
    effects: Required<Omit<HeroBuildEffects, "ratingBonuses">> & {
        ratingBonuses: Partial<Record<HeroCombatRating, number>>;
    };
}

export const EMPTY_RATING_BONUSES: Partial<Record<HeroCombatRating, number>> = {};
export const HERO_RATING_KEYS: HeroCombatRating[] = ["power", "spellPower", "precision", "haste", "guard", "resolve", "potency", "crit"];
export const BUILD_EFFECT_KEYS: Array<keyof Omit<HeroBuildEffects, "ratingBonuses">> = [
    "specialAttackCostDelta",
    "specialAttackDamageMultiplierBonus",
    "specialAttackCritChanceBonus",
    "healMultiplierBonus",
    "blessRegenMultiplierBonus",
    "resourceOnResolvedAttackBonus",
    "resourceOnTakeDamageBonus",
    "maxResourceFlatBonus",
];
export const DEFAULT_TALENT_MAX_RANK = 3;

export const createEmptyEffects = (): HeroBuildProfile["effects"] => ({
    ratingBonuses: {},
    specialAttackCostDelta: 0,
    specialAttackDamageMultiplierBonus: 0,
    specialAttackCritChanceBonus: 0,
    healMultiplierBonus: 0,
    blessRegenMultiplierBonus: 0,
    resourceOnResolvedAttackBonus: 0,
    resourceOnTakeDamageBonus: 0,
    maxResourceFlatBonus: 0,
});

export const mergeEffects = (accumulator: HeroBuildProfile["effects"], effects: HeroBuildEffects) => {
    if (effects.ratingBonuses) {
        HERO_RATING_KEYS.forEach((ratingKey) => {
            const bonus = effects.ratingBonuses?.[ratingKey] ?? 0;
            if (bonus !== 0) {
                accumulator.ratingBonuses[ratingKey] = (accumulator.ratingBonuses[ratingKey] ?? 0) + bonus;
            }
        });
    }

    BUILD_EFFECT_KEYS.forEach((effectKey) => {
        accumulator[effectKey] += effects[effectKey] ?? 0;
    });
};

export const scaleBuildEffects = (effects: HeroBuildEffects | undefined, multiplier: number): HeroBuildEffects => {
    if (!effects || multiplier <= 0) {
        return {};
    }

    const scaled: HeroBuildEffects = {};

    if (effects.ratingBonuses) {
        scaled.ratingBonuses = Object.fromEntries(
            Object.entries(effects.ratingBonuses).map(([rating, value]) => [rating, (value ?? 0) * multiplier]),
        ) as HeroBuildEffects["ratingBonuses"];
    }

    BUILD_EFFECT_KEYS.forEach((effectKey) => {
        const value = effects[effectKey];
        if (value) {
            scaled[effectKey] = value * multiplier;
        }
    });

    return scaled;
};

export const getMergedEffects = (...effectsList: HeroBuildEffects[]): HeroBuildEffects => {
    const merged = createEmptyEffects();
    effectsList.forEach((effects) => mergeEffects(merged, effects));
    return merged;
};

export const isPlayableHeroClass = (heroClass: Entity["class"]): heroClass is HeroClass => heroClass !== "Monster";

export const getRatingBonusValue = (
    effects: HeroBuildEffects | HeroBuildProfile["effects"],
    rating: HeroCombatRating,
) => {
    return effects.ratingBonuses?.[rating] ?? 0;
};

export const hasAnyRatingBonuses = (ratingBonuses: Partial<Record<HeroCombatRating, number>> = EMPTY_RATING_BONUSES) =>
    HERO_RATING_KEYS.some((rating) => (ratingBonuses[rating] ?? 0) !== 0);
