import type { Entity, HeroClass } from "../entity";
import type { TalentProgressionState } from "../store/types";

import {
    DEFAULT_TALENT_MAX_RANK,
    getMergedEffects,
    isPlayableHeroClass,
    scaleBuildEffects,
    type HeroBuildEffects,
    type RankedTalentDefinition,
    type TalentDefinition,
} from "./shared";

export const TALENT_DEFINITIONS: TalentDefinition[] = [
    {
        id: "warrior-unyielding",
        heroClass: "Warrior",
        name: "Unyielding",
        description: "Fortify the frontline with heavier guard and steadier resolve.",
        effects: {
            ratingBonuses: { guard: 4, resolve: 2 },
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            ratingBonuses: { guard: 2, resolve: 1 },
        },
    },
    {
        id: "warrior-rampage",
        heroClass: "Warrior",
        name: "Rampage",
        description: "Rage Strike becomes cheaper and lands with a fiercer follow-through.",
        effects: {
            specialAttackCostDelta: -5,
            specialAttackDamageMultiplierBonus: 0.35,
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            specialAttackCostDelta: -1,
            specialAttackDamageMultiplierBonus: 0.12,
        },
    },
    {
        id: "cleric-sunfire",
        heroClass: "Cleric",
        name: "Sunfire",
        description: "Lean harder into radiant pressure with stronger spell output and potency.",
        effects: {
            ratingBonuses: { spellPower: 4, potency: 3 },
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            ratingBonuses: { spellPower: 2, potency: 1 },
        },
    },
    {
        id: "cleric-shepherd",
        heroClass: "Cleric",
        name: "Shepherd",
        description: "Improve triage healing and reinforce Bless's regen package.",
        effects: {
            healMultiplierBonus: 0.35,
            blessRegenMultiplierBonus: 0.05,
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            healMultiplierBonus: 0.1,
            blessRegenMultiplierBonus: 0.03,
        },
    },
    {
        id: "archer-deadeye",
        heroClass: "Archer",
        name: "Deadeye",
        description: "Trade discipline for deadlier crit pressure and cleaner shots.",
        effects: {
            ratingBonuses: { precision: 4, crit: 4 },
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            ratingBonuses: { precision: 2, crit: 1 },
        },
    },
    {
        id: "archer-quickdraw",
        heroClass: "Archer",
        name: "Quickdraw",
        description: "Accelerate ranged tempo and make Piercing Shot hit harder.",
        effects: {
            ratingBonuses: { haste: 3 },
            specialAttackDamageMultiplierBonus: 0.2,
        },
        maxRank: DEFAULT_TALENT_MAX_RANK,
        perRankEffects: {
            ratingBonuses: { haste: 1 },
            specialAttackDamageMultiplierBonus: 0.08,
        },
    },
];

const TALENT_LOOKUP = new Map(TALENT_DEFINITIONS.map((talent) => [talent.id, talent]));

export const getTalentDefinition = (talentId: string) => TALENT_LOOKUP.get(talentId) ?? null;

export const getTalentMaxRank = (talent: Pick<TalentDefinition, "maxRank">) => Math.max(1, talent.maxRank ?? DEFAULT_TALENT_MAX_RANK);

export const getTalentDefinitionsForClass = (heroClass: HeroClass) =>
    TALENT_DEFINITIONS.filter((talent) => talent.heroClass === heroClass);

export const getTotalTalentRankCapacity = (heroClass: HeroClass) =>
    getTalentDefinitionsForClass(heroClass).reduce((total, talent) => total + getTalentMaxRank(talent), 0);

export const getTalentPointsForHero = (heroId: string, talentProgression: TalentProgressionState) =>
    talentProgression.talentPointsByHeroId[heroId] ?? 0;

export const getHeroTalentRanks = (heroId: string, talentProgression: TalentProgressionState) =>
    talentProgression.talentRanksByHeroId[heroId] ?? {};

export const getTalentRankForHero = (heroId: string, talentId: string, talentProgression: TalentProgressionState) =>
    getHeroTalentRanks(heroId, talentProgression)[talentId] ?? 0;

export const getSpentTalentRanksForHero = (heroId: string, talentProgression: TalentProgressionState) =>
    Object.values(getHeroTalentRanks(heroId, talentProgression)).reduce((total, rank) => total + rank, 0);

export const getTalentEffectsForRank = (talent: TalentDefinition, rank: number): HeroBuildEffects =>
    getMergedEffects(talent.effects, scaleBuildEffects(talent.perRankEffects, Math.max(0, rank - 1)));

export const getHeroUnlockedTalents = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    talentProgression: TalentProgressionState,
) => {
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return [];
    }
    const heroClass = hero.class;
    const heroTalentRanks = getHeroTalentRanks(hero.id, talentProgression);

    return Object.entries(heroTalentRanks)
        .map(([talentId, rank]) => {
            const talent = getTalentDefinition(talentId);
            if (!talent || talent.heroClass !== heroClass || rank <= 0) {
                return null;
            }

            return {
                ...talent,
                maxRank: getTalentMaxRank(talent),
                currentRank: Math.min(getTalentMaxRank(talent), rank),
                effects: getTalentEffectsForRank(talent, rank),
            } satisfies RankedTalentDefinition;
        })
        .filter((talent): talent is RankedTalentDefinition => Boolean(talent));
};

export const getEarnedTalentPointTotal = (heroClass: HeroClass, level: number) =>
    Math.min(getTotalTalentRankCapacity(heroClass), Math.floor(level / 2));
