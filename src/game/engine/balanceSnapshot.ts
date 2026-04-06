import Decimal from "decimal.js";

import { getHeroClassTemplate, type HeroCombatRating } from "../classTemplates";
import { SECURE_RANDOM_BRAND } from "../../utils/random";
import {
    HERO_CLASSES,
    createHero,
    getCombatRatings,
    recalculateEntity,
    type Attributes,
    type Entity,
    type HeroClass,
} from "../entity";
import { createEquipmentItemInstance } from "../heroBuilds";
import type { EquipmentItemInstance, EquipmentProgressionState, TalentProgressionState } from "../store/types";
import {
    cloneEntity,
    createEncounter,
    createInitialGameState,
    getPostVictoryFloorTransitionState,
    simulateTick,
    type SimulationOutcome,
    type SimulationRandomSource,
} from "./simulation";

interface LegacyStatMultipliers {
    armorPerStr: number;
    armorPerVit: number;
    physicalDamagePerStr: number;
    rangedDamagePerDex: number;
    magicDamagePerInt: number;
    critChancePerDex: number;
    resistancePerWis: number;
    accuracyPerDex: number;
    accuracyPerInt: number;
    evasionPerDex: number;
    evasionPerWis: number;
    parryPerStr: number;
    parryPerDex: number;
}

export interface CombatSnapshot {
    armor: number;
    physicalDamage: number;
    magicDamage: number;
    critChance: number;
    accuracyRating: number;
    evasionRating: number;
    parryRating: number;
    resistance: number;
    armorPenetration?: number;
    elementalPenetration?: number;
    tenacity?: number;
}

export interface CombatIdentityDistribution {
    heroClass: HeroClass;
    signatureRatings: HeroCombatRating[];
    ratingTotals: Partial<Record<HeroCombatRating, number>>;
    biasTotals: Partial<Record<HeroCombatRating, number>>;
    signatureBiasShare: number;
}

export interface MilestoneWinRateSnapshot {
    floor3Solo: Record<HeroClass, number>;
    floor8Duo: {
        warriorCleric: number;
        clericArcher: number;
    };
    floor10Boss: {
        soloWarrior: number;
        soloCleric: number;
        soloArcher: number;
        duoWarriorCleric: number;
        duoClericArcher: number;
    };
    floor18Gate: {
        warriorClericArcher: number;
    };
    floor20Boss: {
        warriorClericArcher: number;
    };
    floor28Gate: {
        warriorClericClericArcher: number;
    };
}

export interface SnapshotEquipmentConfig {
    definitionId: string;
    tier?: number;
    rank?: number;
}

export interface SnapshotHeroBuildConfig {
    talentIds?: string[];
    talentRanks?: Partial<Record<string, number>>;
    equippedItemIds?: string[];
    equippedItems?: SnapshotEquipmentConfig[];
}

export interface BuildAwareMilestoneWinRates {
    baseline: number;
    expectedBuild: number;
    curatedBuild: number;
}

export interface BuildAwareMilestoneWinRateSnapshot {
    floor8Duo: {
        warriorCleric: BuildAwareMilestoneWinRates;
        clericArcher: BuildAwareMilestoneWinRates;
    };
    floor10Boss: {
        duoWarriorCleric: BuildAwareMilestoneWinRates;
        duoClericArcher: BuildAwareMilestoneWinRates;
    };
    floor18Gate: {
        warriorClericArcher: BuildAwareMilestoneWinRates;
    };
    floor20Boss: {
        warriorClericArcher: BuildAwareMilestoneWinRates;
    };
    floor28Gate: {
        warriorClericClericArcher: BuildAwareMilestoneWinRates;
    };
}

export interface RecoveryAwareMilestoneWinRateSnapshot {
    floor8Duo: {
        warriorCleric: BuildAwareMilestoneWinRates;
        clericArcher: BuildAwareMilestoneWinRates;
    };
    floor10Boss: {
        duoWarriorCleric: BuildAwareMilestoneWinRates;
        duoClericArcher: BuildAwareMilestoneWinRates;
    };
    floor18Gate: {
        warriorClericArcher: BuildAwareMilestoneWinRates;
    };
    floor20Boss: {
        warriorClericArcher: BuildAwareMilestoneWinRates;
    };
    floor28Gate: {
        warriorClericClericArcher: BuildAwareMilestoneWinRates;
    };
}

interface BuildAwareMilestoneScenario {
    partyClasses: HeroClass[];
    partyLevels: number[];
    floor: number;
    expectedBuilds: SnapshotHeroBuildConfig[];
    curatedBuilds: SnapshotHeroBuildConfig[];
}

interface RecoveryAwareMilestoneScenario extends Omit<BuildAwareMilestoneScenario, "floor"> {
    startFloor: number;
    endFloor: number;
}

const LEGACY_STAT_MULTS: LegacyStatMultipliers = {
    armorPerStr: 1,
    armorPerVit: 0.5,
    physicalDamagePerStr: 1.5,
    rangedDamagePerDex: 1.5,
    magicDamagePerInt: 2,
    critChancePerDex: 0.005,
    resistancePerWis: 0.01,
    accuracyPerDex: 1.5,
    accuracyPerInt: 1,
    evasionPerDex: 1,
    evasionPerWis: 1,
    parryPerStr: 1.75,
    parryPerDex: 0.25,
};

const getHeroName = (heroClass: HeroClass) => getHeroClassTemplate(heroClass).namePool[0];
const ENCOUNTER_TICK_LIMIT = 12_000;
const DEFAULT_SNAPSHOT_LEVEL = 1;

const getSnapshotLevelForIndex = (levels: number | number[], index: number) => {
    if (Array.isArray(levels)) {
        const fallbackLevel = levels[levels.length - 1] ?? DEFAULT_SNAPSHOT_LEVEL;
        return Math.max(DEFAULT_SNAPSHOT_LEVEL, Math.floor(levels[index] ?? fallbackLevel));
    }

    return Math.max(DEFAULT_SNAPSHOT_LEVEL, Math.floor(levels));
};

const createSnapshotParty = (partyClasses: HeroClass[], levels: number | number[]) =>
    partyClasses.map((heroClass, index) =>
        createLeveledHero(heroClass, getSnapshotLevelForIndex(levels, index), `hero_${index + 1}`),
    );

const gear = (definitionId: string, tier: number, rank: number): SnapshotEquipmentConfig => ({
    definitionId,
    tier,
    rank,
});

const createSeededRandomSource = (seed: number): SimulationRandomSource => {
    let state = seed >>> 0;

    return {
        [SECURE_RANDOM_BRAND]: true,
        next: () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 0x100000000;
        },
    } as SimulationRandomSource;
};

const getCurrentHero = (heroClass: HeroClass, attributes?: Attributes): Entity => {
    const hero = createHero(`snapshot-${heroClass.toLowerCase()}`, getHeroName(heroClass), heroClass);

    if (attributes) {
        hero.attributes = { ...attributes };
        recalculateEntity(hero);
        const template = getHeroClassTemplate(heroClass);
        hero.currentHp = hero.maxHp;
        hero.currentResource = template.resourceModel.startsFull ? hero.maxResource : new Decimal(0);
    }

    return hero;
};

const createBuildProgression = (
    party: Entity[],
    buildConfigs?: SnapshotHeroBuildConfig[],
): {
    talentProgression?: TalentProgressionState;
    equipmentProgression?: EquipmentProgressionState;
} => {
    if (!buildConfigs || buildConfigs.length === 0) {
        return {};
    }

    const talentRanksByHeroId: Record<string, Record<string, number>> = {};
    const talentPointsByHeroId: Record<string, number> = {};
    const equippedItemInstanceIdsByHeroId: Record<string, string[]> = {};
    const inventoryItems: EquipmentItemInstance[] = [];
    let nextInstanceSequence = 1;

    buildConfigs.forEach((buildConfig, index) => {
        const hero = party[index];
        if (!hero) {
            return;
        }

        const talentRanks: Record<string, number> = buildConfig.talentRanks
            ? Object.fromEntries(
                Object.entries(buildConfig.talentRanks)
                    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
                    .map(([talentId, rank]): [string, number] => [talentId, Math.max(0, Math.floor(rank))])
                    .filter(([, rank]) => rank > 0),
            )
            : Object.fromEntries([...new Set(buildConfig.talentIds ?? [])].map((talentId) => [talentId, 1]));
        const equippedItemConfigs: SnapshotEquipmentConfig[] = buildConfig.equippedItems
            ? buildConfig.equippedItems
            : [...new Set(buildConfig.equippedItemIds ?? [])].map((definitionId) => ({ definitionId }));
        const equippedItems = equippedItemConfigs
            .map((itemConfig, itemIndex) =>
                createEquipmentItemInstance(itemConfig.definitionId, {
                    instanceId: `${hero.id}-item-${itemIndex + 1}`,
                    sequence: nextInstanceSequence + itemIndex,
                    tier: itemConfig.tier,
                    rank: itemConfig.rank,
                }),
            )
            .filter((item): item is EquipmentItemInstance => Boolean(item));

        talentRanksByHeroId[hero.id] = talentRanks;
        talentPointsByHeroId[hero.id] = 0;
        equippedItemInstanceIdsByHeroId[hero.id] = equippedItems.map((item: EquipmentItemInstance) => item.instanceId);
        inventoryItems.push(...equippedItems);
        nextInstanceSequence += equippedItems.length;
    });

    return {
        talentProgression: {
            talentRanksByHeroId,
            talentPointsByHeroId,
        },
        equipmentProgression: {
            inventoryItems,
            equippedItemInstanceIdsByHeroId,
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: Math.max(12, inventoryItems.length),
            nextInstanceSequence,
        },
    };
};

const getSnapshotFromEntity = (hero: Entity): CombatSnapshot => ({
    armor: hero.armor.toNumber(),
    physicalDamage: hero.physicalDamage.toNumber(),
    magicDamage: hero.magicDamage.toNumber(),
    critChance: hero.critChance,
    accuracyRating: hero.accuracyRating,
    evasionRating: hero.evasionRating,
    parryRating: hero.parryRating,
    resistance: hero.resistances.shadow,
    armorPenetration: hero.armorPenetration,
    elementalPenetration: hero.elementalPenetration,
    tenacity: hero.tenacity,
});

const getSignatureRatings = (heroClass: HeroClass): HeroCombatRating[] => {
    const ratingBiases = getHeroClassTemplate(heroClass).combatProfile.ratingBiases;
    const biasRatings = (Object.keys(ratingBiases) as HeroCombatRating[])
        .filter((rating) => (ratingBiases[rating] ?? 0) > 0);

    return biasRatings.length > 0
        ? biasRatings
        : [...getHeroClassTemplate(heroClass).combatProfile.baselineRatings];
};

const createLeveledHero = (heroClass: HeroClass, level: number, id: string): Entity => {
    const hero = createHero(id, getHeroName(heroClass), heroClass);
    const template = getHeroClassTemplate(heroClass);

    for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
        hero.level += 1;
        hero.attributes.str += template.growth.str;
        hero.attributes.vit += template.growth.vit;
        hero.attributes.dex += template.growth.dex;
        hero.attributes.int += template.growth.int;
        hero.attributes.wis += template.growth.wis;
    }

    recalculateEntity(hero);
    hero.currentHp = hero.maxHp;
    hero.currentResource = template.resourceModel.startsFull ? hero.maxResource : new Decimal(0);

    return hero;
};

const runEncounter = (
    party: Entity[],
    floor: number,
    seed: number,
    buildProgression?: {
        talentProgression?: TalentProgressionState;
        equipmentProgression?: EquipmentProgressionState;
    },
): SimulationOutcome => {
    let state = createInitialGameState({
        floor,
        party,
        enemies: createEncounter(floor),
        combatLog: [],
        ...buildProgression,
    });
    let outcome: SimulationOutcome = "running";
    const randomSource = createSeededRandomSource(seed);

    for (let tick = 0; tick < ENCOUNTER_TICK_LIMIT; tick += 1) {
        const result = simulateTick(state, randomSource);
        state = result.state;
        outcome = result.outcome;

        if (outcome === "victory" || outcome === "party-wipe") {
            return outcome;
        }
    }

    return outcome;
};

const runCheckpointSequence = (
    party: Entity[],
    startFloor: number,
    endFloor: number,
    seed: number,
    buildProgression?: {
        talentProgression?: TalentProgressionState;
        equipmentProgression?: EquipmentProgressionState;
    },
): SimulationOutcome => {
    let state = createInitialGameState({
        floor: startFloor,
        party,
        enemies: createEncounter(startFloor),
        combatLog: [],
        ...buildProgression,
    });
    const randomSource = createSeededRandomSource(seed);

    for (let floor = startFloor; floor <= endFloor; floor += 1) {
        let outcome: SimulationOutcome = "running";

        for (let tick = 0; tick < ENCOUNTER_TICK_LIMIT; tick += 1) {
            const result = simulateTick(state, randomSource);
            state = result.state;
            outcome = result.outcome;

            if (outcome === "victory" || outcome === "party-wipe") {
                break;
            }
        }

        if (outcome !== "victory") {
            return outcome;
        }

        if (floor < endFloor) {
            state = { ...state, ...getPostVictoryFloorTransitionState(state, floor + 1) };
        }
    }

    return "victory";
};

export const createLegacyCombatSnapshot = (
    heroClass: HeroClass,
    attributes: Attributes = getHeroClassTemplate(heroClass).baseAttributes,
): CombatSnapshot => {
    const physicalDamageSource = heroClass === "Archer" ? attributes.dex : attributes.str;
    const resistance = Math.min(attributes.wis * LEGACY_STAT_MULTS.resistancePerWis, 0.75);

    return {
        armor: (attributes.str * LEGACY_STAT_MULTS.armorPerStr) + (attributes.vit * LEGACY_STAT_MULTS.armorPerVit),
        physicalDamage: 10 + (
            physicalDamageSource * (
                heroClass === "Archer"
                    ? LEGACY_STAT_MULTS.rangedDamagePerDex
                    : LEGACY_STAT_MULTS.physicalDamagePerStr
            )
        ),
        magicDamage: 5 + (attributes.int * LEGACY_STAT_MULTS.magicDamagePerInt),
        critChance: Math.min(0.05 + (attributes.dex * LEGACY_STAT_MULTS.critChancePerDex), 1),
        accuracyRating: 50
            + (attributes.dex * LEGACY_STAT_MULTS.accuracyPerDex)
            + (attributes.int * LEGACY_STAT_MULTS.accuracyPerInt),
        evasionRating: 35
            + (attributes.dex * LEGACY_STAT_MULTS.evasionPerDex)
            + (attributes.wis * LEGACY_STAT_MULTS.evasionPerWis),
        parryRating: (attributes.str * LEGACY_STAT_MULTS.parryPerStr) + (attributes.dex * LEGACY_STAT_MULTS.parryPerDex),
        resistance,
    };
};

export const createCurrentCombatSnapshot = (
    heroClass: HeroClass,
    attributes?: Attributes,
): CombatSnapshot => {
    return getSnapshotFromEntity(getCurrentHero(heroClass, attributes));
};

export const getCombatIdentityDistribution = (
    heroClass: HeroClass,
    attributes: Attributes = getHeroClassTemplate(heroClass).baseAttributes,
): CombatIdentityDistribution => {
    const hero = getCurrentHero(heroClass, attributes);
    const ratingTotals = getCombatRatings(hero);
    const ratingBiases = getHeroClassTemplate(heroClass).combatProfile.ratingBiases;
    const signatureRatings = getSignatureRatings(heroClass);
    const biasTotals = signatureRatings.reduce<Partial<Record<HeroCombatRating, number>>>((totals, rating) => {
        totals[rating] = ratingBiases[rating] ?? 0;
        return totals;
    }, {});
    const totalSignatureRating = signatureRatings.reduce((total, rating) => total + (ratingTotals[rating] ?? 0), 0);
    const totalSignatureBias = signatureRatings.reduce((total, rating) => total + (ratingBiases[rating] ?? 0), 0);

    return {
        heroClass,
        signatureRatings,
        ratingTotals,
        biasTotals,
        signatureBiasShare: totalSignatureRating === 0 ? 0 : totalSignatureBias / totalSignatureRating,
    };
};

export const estimateEncounterWinRate = (
    partyClasses: HeroClass[],
    levels: number | number[],
    floor: number,
    attempts = 12,
    buildConfigs?: SnapshotHeroBuildConfig[],
): number => {
    let wins = 0;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const party = createSnapshotParty(partyClasses, levels);
        const buildProgression = createBuildProgression(party, buildConfigs);
        const outcome = runEncounter(party.map((hero) => cloneEntity(hero)), floor, attempt, buildProgression);

        if (outcome === "victory") {
            wins += 1;
        }
    }

    return wins / attempts;
};

export const estimateCheckpointRunWinRate = (
    partyClasses: HeroClass[],
    levels: number | number[],
    startFloor: number,
    endFloor: number,
    attempts = 12,
    buildConfigs?: SnapshotHeroBuildConfig[],
): number => {
    let wins = 0;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const party = createSnapshotParty(partyClasses, levels);
        const buildProgression = createBuildProgression(party, buildConfigs);
        const outcome = runCheckpointSequence(
            party.map((hero) => cloneEntity(hero)),
            startFloor,
            endFloor,
            attempt,
            buildProgression,
        );

        if (outcome === "victory") {
            wins += 1;
        }
    }

    return wins / attempts;
};

export const createRepresentativeMilestoneWinRates = (attempts = 12): MilestoneWinRateSnapshot => ({
    floor3Solo: {
        Warrior: estimateEncounterWinRate(["Warrior"], 1, 3, attempts),
        Cleric: estimateEncounterWinRate(["Cleric"], 1, 3, attempts),
        Archer: estimateEncounterWinRate(["Archer"], 1, 3, attempts),
    },
    floor8Duo: {
        warriorCleric: estimateEncounterWinRate(["Warrior", "Cleric"], [4, 4], 8, attempts),
        clericArcher: estimateEncounterWinRate(["Cleric", "Archer"], [4, 4], 8, attempts),
    },
    floor10Boss: {
        soloWarrior: estimateEncounterWinRate(["Warrior"], 5, 10, attempts),
        soloCleric: estimateEncounterWinRate(["Cleric"], 5, 10, attempts),
        soloArcher: estimateEncounterWinRate(["Archer"], 5, 10, attempts),
        duoWarriorCleric: estimateEncounterWinRate(["Warrior", "Cleric"], [5, 5], 10, attempts),
        duoClericArcher: estimateEncounterWinRate(["Cleric", "Archer"], [5, 5], 10, attempts),
    },
    floor18Gate: {
        warriorClericArcher: estimateEncounterWinRate(["Warrior", "Cleric", "Archer"], [13, 13, 12], 18, attempts),
    },
    floor20Boss: {
        warriorClericArcher: estimateEncounterWinRate(["Warrior", "Cleric", "Archer"], [13, 13, 13], 20, attempts),
    },
    floor28Gate: {
        warriorClericClericArcher: estimateEncounterWinRate(["Warrior", "Cleric", "Cleric", "Archer"], [18, 18, 17, 16], 28, attempts),
    },
});

const createBuildAwareScenarioWinRates = (
    scenario: BuildAwareMilestoneScenario,
    attempts: number,
): BuildAwareMilestoneWinRates => ({
    baseline: estimateEncounterWinRate(scenario.partyClasses, scenario.partyLevels, scenario.floor, attempts),
    expectedBuild: estimateEncounterWinRate(
        scenario.partyClasses,
        scenario.partyLevels,
        scenario.floor,
        attempts,
        scenario.expectedBuilds,
    ),
    curatedBuild: estimateEncounterWinRate(
        scenario.partyClasses,
        scenario.partyLevels,
        scenario.floor,
        attempts,
        scenario.curatedBuilds,
    ),
});

const createRecoveryAwareScenarioWinRates = (
    scenario: RecoveryAwareMilestoneScenario,
    attempts: number,
): BuildAwareMilestoneWinRates => ({
    baseline: estimateCheckpointRunWinRate(
        scenario.partyClasses,
        scenario.partyLevels,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
    ),
    expectedBuild: estimateCheckpointRunWinRate(
        scenario.partyClasses,
        scenario.partyLevels,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
        scenario.expectedBuilds,
    ),
    curatedBuild: estimateCheckpointRunWinRate(
        scenario.partyClasses,
        scenario.partyLevels,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
        scenario.curatedBuilds,
    ),
});

const BUILD_AWARE_SCENARIOS = {
    floor8WarriorCleric: {
        partyClasses: ["Warrior", "Cleric"],
        partyLevels: [4, 4],
        floor: 8,
        expectedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 2 },
                equippedItems: [
                    gear("greatblade-of-embers", 2, 1),
                    gear("bastion-plate", 2, 1),
                ],
            },
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 2, 1),
                    gear("pilgrim-vestments", 2, 1),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 2 },
                equippedItems: [
                    gear("greatblade-of-embers", 2, 2),
                    gear("bastion-plate", 2, 2),
                    gear("whetstone-token", 2, 2),
                    gear("timeworn-hourglass", 2, 2),
                ],
            },
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 2, 2),
                    gear("pilgrim-vestments", 2, 2),
                    gear("ember-charm", 2, 2),
                    gear("iron-prayer-bead", 2, 2),
                ],
            },
        ],
    },
    floor8ClericArcher: {
        partyClasses: ["Cleric", "Archer"],
        partyLevels: [4, 4],
        floor: 8,
        expectedBuilds: [
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 2, 1),
                    gear("pilgrim-vestments", 2, 1),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 2 },
                equippedItems: [
                    gear("hawkstring-bow", 2, 1),
                    gear("shadowhide-leathers", 2, 1),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 2, 2),
                    gear("pilgrim-vestments", 2, 2),
                    gear("ember-charm", 2, 2),
                    gear("iron-prayer-bead", 2, 2),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 2 },
                equippedItems: [
                    gear("hawkstring-bow", 2, 2),
                    gear("shadowhide-leathers", 2, 2),
                    gear("duelist-loop", 2, 2),
                    gear("timeworn-hourglass", 2, 2),
                ],
            },
        ],
    },
    floor10WarriorCleric: {
        partyClasses: ["Warrior", "Cleric"],
        partyLevels: [5, 5],
        floor: 10,
        expectedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 2 },
                equippedItems: [
                    gear("greatblade-of-embers", 3, 2),
                    gear("bastion-plate", 3, 2),
                ],
            },
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 3, 2),
                    gear("pilgrim-vestments", 3, 2),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 2 },
                equippedItems: [
                    gear("greatblade-of-embers", 3, 3),
                    gear("bastion-plate", 3, 3),
                    gear("whetstone-token", 3, 3),
                    gear("timeworn-hourglass", 3, 3),
                ],
            },
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 3, 3),
                    gear("pilgrim-vestments", 3, 3),
                    gear("ember-charm", 3, 3),
                    gear("iron-prayer-bead", 3, 3),
                ],
            },
        ],
    },
    floor10ClericArcher: {
        partyClasses: ["Cleric", "Archer"],
        partyLevels: [5, 5],
        floor: 10,
        expectedBuilds: [
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 3, 2),
                    gear("pilgrim-vestments", 3, 2),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 2 },
                equippedItems: [
                    gear("hawkstring-bow", 3, 2),
                    gear("shadowhide-leathers", 3, 2),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "cleric-shepherd": 2 },
                equippedItems: [
                    gear("sunlit-censer", 3, 3),
                    gear("pilgrim-vestments", 3, 3),
                    gear("ember-charm", 3, 3),
                    gear("iron-prayer-bead", 3, 3),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 2 },
                equippedItems: [
                    gear("hawkstring-bow", 3, 3),
                    gear("shadowhide-leathers", 3, 3),
                    gear("duelist-loop", 3, 3),
                    gear("timeworn-hourglass", 3, 3),
                ],
            },
        ],
    },
    floor18WarriorClericArcher: {
        partyClasses: ["Warrior", "Cleric", "Archer"],
        partyLevels: [13, 13, 12],
        floor: 18,
        expectedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 4, 3),
                    gear("bastion-plate", 4, 3),
                    gear("whetstone-token", 4, 3),
                    gear("timeworn-hourglass", 4, 3),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 4, 3),
                    gear("pilgrim-vestments", 4, 3),
                    gear("ember-charm", 4, 3),
                    gear("iron-prayer-bead", 4, 3),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 4, 3),
                    gear("shadowhide-leathers", 4, 3),
                    gear("duelist-loop", 4, 3),
                    gear("timeworn-hourglass", 4, 3),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 4, 4),
                    gear("bastion-plate", 4, 4),
                    gear("whetstone-token", 4, 4),
                    gear("ward-icon", 4, 4),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 4, 4),
                    gear("pilgrim-vestments", 4, 4),
                    gear("ember-charm", 4, 4),
                    gear("iron-prayer-bead", 4, 4),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 4, 4),
                    gear("shadowhide-leathers", 4, 4),
                    gear("duelist-loop", 4, 4),
                    gear("timeworn-hourglass", 4, 4),
                ],
            },
        ],
    },
    floor20WarriorClericArcher: {
        partyClasses: ["Warrior", "Cleric", "Archer"],
        partyLevels: [13, 13, 13],
        floor: 20,
        expectedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 4, 3),
                    gear("bastion-plate", 4, 3),
                    gear("whetstone-token", 4, 3),
                    gear("timeworn-hourglass", 4, 3),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 4, 3),
                    gear("pilgrim-vestments", 4, 3),
                    gear("ember-charm", 4, 3),
                    gear("iron-prayer-bead", 4, 3),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 4, 3),
                    gear("shadowhide-leathers", 4, 3),
                    gear("duelist-loop", 4, 3),
                    gear("timeworn-hourglass", 4, 3),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 4, 4),
                    gear("bastion-plate", 4, 4),
                    gear("whetstone-token", 4, 4),
                    gear("ward-icon", 4, 4),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 4, 4),
                    gear("pilgrim-vestments", 4, 4),
                    gear("ember-charm", 4, 4),
                    gear("iron-prayer-bead", 4, 4),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 4, 4),
                    gear("shadowhide-leathers", 4, 4),
                    gear("duelist-loop", 4, 4),
                    gear("timeworn-hourglass", 4, 4),
                ],
            },
        ],
    },
    floor28WarriorClericClericArcher: {
        partyClasses: ["Warrior", "Cleric", "Cleric", "Archer"],
        partyLevels: [18, 18, 17, 16],
        floor: 28,
        expectedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 5, 4),
                    gear("bastion-plate", 5, 4),
                    gear("whetstone-token", 5, 4),
                    gear("ward-icon", 5, 4),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 5, 4),
                    gear("pilgrim-vestments", 5, 4),
                    gear("ember-charm", 5, 4),
                    gear("iron-prayer-bead", 5, 4),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 5, 4),
                    gear("pilgrim-vestments", 5, 4),
                    gear("ember-charm", 5, 4),
                    gear("iron-prayer-bead", 5, 4),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 5, 4),
                    gear("shadowhide-leathers", 5, 4),
                    gear("duelist-loop", 5, 4),
                    gear("timeworn-hourglass", 5, 4),
                ],
            },
        ],
        curatedBuilds: [
            {
                talentRanks: { "warrior-unyielding": 3, "warrior-rampage": 3 },
                equippedItems: [
                    gear("greatblade-of-embers", 5, 5),
                    gear("bastion-plate", 5, 5),
                    gear("whetstone-token", 5, 5),
                    gear("ward-icon", 5, 5),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 5, 5),
                    gear("pilgrim-vestments", 5, 5),
                    gear("ember-charm", 5, 5),
                    gear("iron-prayer-bead", 5, 5),
                ],
            },
            {
                talentRanks: { "cleric-sunfire": 3, "cleric-shepherd": 3 },
                equippedItems: [
                    gear("sunlit-censer", 5, 5),
                    gear("pilgrim-vestments", 5, 5),
                    gear("ember-charm", 5, 5),
                    gear("iron-prayer-bead", 5, 5),
                ],
            },
            {
                talentRanks: { "archer-deadeye": 3, "archer-quickdraw": 3 },
                equippedItems: [
                    gear("hawkstring-bow", 5, 5),
                    gear("shadowhide-leathers", 5, 5),
                    gear("duelist-loop", 5, 5),
                    gear("timeworn-hourglass", 5, 5),
                ],
            },
        ],
    },
} satisfies Record<string, BuildAwareMilestoneScenario>;

const RECOVERY_AWARE_SCENARIOS = {
    floor8WarriorCleric: {
        ...BUILD_AWARE_SCENARIOS.floor8WarriorCleric,
        startFloor: 6,
        endFloor: 8,
    },
    floor8ClericArcher: {
        ...BUILD_AWARE_SCENARIOS.floor8ClericArcher,
        startFloor: 6,
        endFloor: 8,
    },
    floor10WarriorCleric: {
        ...BUILD_AWARE_SCENARIOS.floor10WarriorCleric,
        startFloor: 8,
        endFloor: 10,
    },
    floor10ClericArcher: {
        ...BUILD_AWARE_SCENARIOS.floor10ClericArcher,
        startFloor: 8,
        endFloor: 10,
    },
    floor18WarriorClericArcher: {
        ...BUILD_AWARE_SCENARIOS.floor18WarriorClericArcher,
        startFloor: 16,
        endFloor: 18,
    },
    floor20WarriorClericArcher: {
        ...BUILD_AWARE_SCENARIOS.floor20WarriorClericArcher,
        startFloor: 19,
        endFloor: 20,
    },
    floor28WarriorClericClericArcher: {
        ...BUILD_AWARE_SCENARIOS.floor28WarriorClericClericArcher,
        startFloor: 26,
        endFloor: 28,
    },
} satisfies Record<string, RecoveryAwareMilestoneScenario>;

export const createBuildAwareMilestoneWinRates = (attempts = 12): BuildAwareMilestoneWinRateSnapshot => ({
    floor8Duo: {
        warriorCleric: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor8WarriorCleric, attempts),
        clericArcher: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor8ClericArcher, attempts),
    },
    floor10Boss: {
        duoWarriorCleric: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor10WarriorCleric, attempts),
        duoClericArcher: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor10ClericArcher, attempts),
    },
    floor18Gate: {
        warriorClericArcher: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor18WarriorClericArcher, attempts),
    },
    floor20Boss: {
        warriorClericArcher: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor20WarriorClericArcher, attempts),
    },
    floor28Gate: {
        warriorClericClericArcher: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor28WarriorClericClericArcher, attempts),
    },
});

export const createRecoveryAwareMilestoneWinRates = (attempts = 12): RecoveryAwareMilestoneWinRateSnapshot => ({
    floor8Duo: {
        warriorCleric: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor8WarriorCleric, attempts),
        clericArcher: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor8ClericArcher, attempts),
    },
    floor10Boss: {
        duoWarriorCleric: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor10WarriorCleric, attempts),
        duoClericArcher: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor10ClericArcher, attempts),
    },
    floor18Gate: {
        warriorClericArcher: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor18WarriorClericArcher, attempts),
    },
    floor20Boss: {
        warriorClericArcher: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor20WarriorClericArcher, attempts),
    },
    floor28Gate: {
        warriorClericClericArcher: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor28WarriorClericClericArcher, attempts),
    },
});

export const HERO_CLASS_ORDER: HeroClass[] = [...HERO_CLASSES];
