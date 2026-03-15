import Decimal from "decimal.js";

import { getHeroClassTemplate, type HeroCombatRating } from "../classTemplates";
import {
    HERO_CLASSES,
    createHero,
    getCombatRatings,
    recalculateEntity,
    type Attributes,
    type Entity,
    type HeroClass,
} from "../entity";
import { createEquipmentInstancesFromDefinitionIds } from "../heroBuilds";
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
        warriorClericLevel4: number;
        clericArcherLevel4: number;
    };
    floor10Boss: {
        soloWarriorLevel5: number;
        soloClericLevel5: number;
        soloArcherLevel5: number;
        duoWarriorClericLevel5: number;
        duoClericArcherLevel5: number;
    };
    floor18Slot4: {
        trioWarriorClericArcherLevel10: number;
    };
    floor20Boss: {
        trioWarriorClericArcherLevel11: number;
        trioWarriorClericArcherLevel12: number;
    };
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: number;
    };
}

export interface SnapshotHeroBuildConfig {
    talentIds?: string[];
    equippedItemIds?: string[];
}

export interface BuildAwareMilestoneWinRates {
    baseline: number;
    expectedBuild: number;
    curatedBuild: number;
}

export interface BuildAwareMilestoneWinRateSnapshot {
    floor8Duo: {
        warriorClericLevel4: BuildAwareMilestoneWinRates;
        clericArcherLevel4: BuildAwareMilestoneWinRates;
    };
    floor10Boss: {
        duoWarriorClericLevel5: BuildAwareMilestoneWinRates;
        duoClericArcherLevel5: BuildAwareMilestoneWinRates;
    };
    floor18Slot4: {
        trioWarriorClericArcherLevel10: BuildAwareMilestoneWinRates;
    };
    floor20Boss: {
        trioWarriorClericArcherLevel11: BuildAwareMilestoneWinRates;
        trioWarriorClericArcherLevel12: BuildAwareMilestoneWinRates;
    };
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: BuildAwareMilestoneWinRates;
    };
}

export interface RecoveryAwareMilestoneWinRateSnapshot {
    floor8Duo: {
        warriorClericLevel4: BuildAwareMilestoneWinRates;
        clericArcherLevel4: BuildAwareMilestoneWinRates;
    };
    floor10Boss: {
        duoWarriorClericLevel5: BuildAwareMilestoneWinRates;
        duoClericArcherLevel5: BuildAwareMilestoneWinRates;
    };
    floor18Slot4: {
        trioWarriorClericArcherLevel10: BuildAwareMilestoneWinRates;
    };
    floor20Boss: {
        trioWarriorClericArcherLevel11: BuildAwareMilestoneWinRates;
        trioWarriorClericArcherLevel12: BuildAwareMilestoneWinRates;
    };
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: BuildAwareMilestoneWinRates;
    };
}

interface BuildAwareMilestoneScenario {
    partyClasses: HeroClass[];
    level: number;
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

const createSeededRandomSource = (seed: number): SimulationRandomSource => {
    let state = seed >>> 0;

    return {
        next: () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 0x100000000;
        },
    };
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

    const unlockedTalentIdsByHeroId: Record<string, string[]> = {};
    const talentPointsByHeroId: Record<string, number> = {};
    const equippedItemInstanceIdsByHeroId: Record<string, string[]> = {};
    const inventoryItems: EquipmentItemInstance[] = [];
    let nextInstanceSequence = 1;

    buildConfigs.forEach((buildConfig, index) => {
        const hero = party[index];
        if (!hero) {
            return;
        }

        const talentIds = [...new Set(buildConfig.talentIds ?? [])];
        const equippedItemIds = [...new Set(buildConfig.equippedItemIds ?? [])];
        const equippedItems = createEquipmentInstancesFromDefinitionIds(equippedItemIds, `${hero.id}-item`);

        unlockedTalentIdsByHeroId[hero.id] = talentIds;
        talentPointsByHeroId[hero.id] = 0;
        equippedItemInstanceIdsByHeroId[hero.id] = equippedItems.map((item: EquipmentItemInstance) => item.instanceId);
        inventoryItems.push(...equippedItems);
        nextInstanceSequence += equippedItems.length;
    });

    return {
        talentProgression: {
            unlockedTalentIdsByHeroId,
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
    level: number,
    floor: number,
    attempts = 12,
    buildConfigs?: SnapshotHeroBuildConfig[],
): number => {
    let wins = 0;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const party = partyClasses.map((heroClass, index) => createLeveledHero(heroClass, level, `hero_${index + 1}`));
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
    level: number,
    startFloor: number,
    endFloor: number,
    attempts = 12,
    buildConfigs?: SnapshotHeroBuildConfig[],
): number => {
    let wins = 0;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const party = partyClasses.map((heroClass, index) => createLeveledHero(heroClass, level, `hero_${index + 1}`));
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
        warriorClericLevel4: estimateEncounterWinRate(["Warrior", "Cleric"], 4, 8, attempts),
        clericArcherLevel4: estimateEncounterWinRate(["Cleric", "Archer"], 4, 8, attempts),
    },
    floor10Boss: {
        soloWarriorLevel5: estimateEncounterWinRate(["Warrior"], 5, 10, attempts),
        soloClericLevel5: estimateEncounterWinRate(["Cleric"], 5, 10, attempts),
        soloArcherLevel5: estimateEncounterWinRate(["Archer"], 5, 10, attempts),
        duoWarriorClericLevel5: estimateEncounterWinRate(["Warrior", "Cleric"], 5, 10, attempts),
        duoClericArcherLevel5: estimateEncounterWinRate(["Cleric", "Archer"], 5, 10, attempts),
    },
    floor18Slot4: {
        trioWarriorClericArcherLevel10: estimateEncounterWinRate(["Warrior", "Cleric", "Archer"], 10, 18, attempts),
    },
    floor20Boss: {
        trioWarriorClericArcherLevel11: estimateEncounterWinRate(["Warrior", "Cleric", "Archer"], 11, 20, attempts),
        trioWarriorClericArcherLevel12: estimateEncounterWinRate(["Warrior", "Cleric", "Archer"], 12, 20, attempts),
    },
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: estimateEncounterWinRate(["Warrior", "Cleric", "Cleric", "Archer"], 13, 28, attempts),
    },
});

const createBuildAwareScenarioWinRates = (
    scenario: BuildAwareMilestoneScenario,
    attempts: number,
): BuildAwareMilestoneWinRates => ({
    baseline: estimateEncounterWinRate(scenario.partyClasses, scenario.level, scenario.floor, attempts),
    expectedBuild: estimateEncounterWinRate(
        scenario.partyClasses,
        scenario.level,
        scenario.floor,
        attempts,
        scenario.expectedBuilds,
    ),
    curatedBuild: estimateEncounterWinRate(
        scenario.partyClasses,
        scenario.level,
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
        scenario.level,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
    ),
    expectedBuild: estimateCheckpointRunWinRate(
        scenario.partyClasses,
        scenario.level,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
        scenario.expectedBuilds,
    ),
    curatedBuild: estimateCheckpointRunWinRate(
        scenario.partyClasses,
        scenario.level,
        scenario.startFloor,
        scenario.endFloor,
        attempts,
        scenario.curatedBuilds,
    ),
});

const BUILD_AWARE_SCENARIOS = {
    floor8WarriorCleric: {
        partyClasses: ["Warrior", "Cleric"],
        level: 4,
        floor: 8,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token", "timeworn-hourglass"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
        ],
    },
    floor8ClericArcher: {
        partyClasses: ["Cleric", "Archer"],
        level: 4,
        floor: 8,
        expectedBuilds: [
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
            },
        ],
    },
    floor10WarriorCleric: {
        partyClasses: ["Warrior", "Cleric"],
        level: 5,
        floor: 10,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token", "timeworn-hourglass"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
        ],
    },
    floor10ClericArcher: {
        partyClasses: ["Cleric", "Archer"],
        level: 5,
        floor: 10,
        expectedBuilds: [
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
            },
        ],
    },
    floor18WarriorClericArcher: {
        partyClasses: ["Warrior", "Cleric", "Archer"],
        level: 10,
        floor: 18,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token", "ward-icon"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
            },
        ],
    },
    floor20WarriorClericArcherLevel11: {
        partyClasses: ["Warrior", "Cleric", "Archer"],
        level: 11,
        floor: 20,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token", "ward-icon"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
            },
        ],
    },
    floor20WarriorClericArcherLevel12: {
        partyClasses: ["Warrior", "Cleric", "Archer"],
        level: 12,
        floor: 20,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token", "ward-icon"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
            },
        ],
    },
    floor28WarriorClericClericArcher: {
        partyClasses: ["Warrior", "Cleric", "Cleric", "Archer"],
        level: 13,
        floor: 28,
        expectedBuilds: [
            {
                talentIds: ["warrior-unyielding"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments"],
            },
            {
                talentIds: ["cleric-shepherd"],
                equippedItemIds: ["ward-icon", "iron-prayer-bead"],
            },
            {
                talentIds: ["archer-deadeye"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers"],
            },
        ],
        curatedBuilds: [
            {
                talentIds: ["warrior-unyielding", "warrior-rampage"],
                equippedItemIds: ["greatblade-of-embers", "bastion-plate", "whetstone-token"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["sunlit-censer", "pilgrim-vestments", "ember-charm"],
            },
            {
                talentIds: ["cleric-sunfire", "cleric-shepherd"],
                equippedItemIds: ["iron-prayer-bead", "ward-icon"],
            },
            {
                talentIds: ["archer-deadeye", "archer-quickdraw"],
                equippedItemIds: ["hawkstring-bow", "shadowhide-leathers", "duelist-loop", "timeworn-hourglass"],
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
    floor20WarriorClericArcherLevel11: {
        ...BUILD_AWARE_SCENARIOS.floor20WarriorClericArcherLevel11,
        startFloor: 19,
        endFloor: 20,
    },
    floor20WarriorClericArcherLevel12: {
        ...BUILD_AWARE_SCENARIOS.floor20WarriorClericArcherLevel12,
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
        warriorClericLevel4: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor8WarriorCleric, attempts),
        clericArcherLevel4: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor8ClericArcher, attempts),
    },
    floor10Boss: {
        duoWarriorClericLevel5: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor10WarriorCleric, attempts),
        duoClericArcherLevel5: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor10ClericArcher, attempts),
    },
    floor18Slot4: {
        trioWarriorClericArcherLevel10: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor18WarriorClericArcher, attempts),
    },
    floor20Boss: {
        trioWarriorClericArcherLevel11: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor20WarriorClericArcherLevel11, attempts),
        trioWarriorClericArcherLevel12: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor20WarriorClericArcherLevel12, attempts),
    },
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: createBuildAwareScenarioWinRates(BUILD_AWARE_SCENARIOS.floor28WarriorClericClericArcher, attempts),
    },
});

export const createRecoveryAwareMilestoneWinRates = (attempts = 12): RecoveryAwareMilestoneWinRateSnapshot => ({
    floor8Duo: {
        warriorClericLevel4: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor8WarriorCleric, attempts),
        clericArcherLevel4: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor8ClericArcher, attempts),
    },
    floor10Boss: {
        duoWarriorClericLevel5: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor10WarriorCleric, attempts),
        duoClericArcherLevel5: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor10ClericArcher, attempts),
    },
    floor18Slot4: {
        trioWarriorClericArcherLevel10: createRecoveryAwareScenarioWinRates(RECOVERY_AWARE_SCENARIOS.floor18WarriorClericArcher, attempts),
    },
    floor20Boss: {
        trioWarriorClericArcherLevel11: createRecoveryAwareScenarioWinRates(
            RECOVERY_AWARE_SCENARIOS.floor20WarriorClericArcherLevel11,
            attempts,
        ),
        trioWarriorClericArcherLevel12: createRecoveryAwareScenarioWinRates(
            RECOVERY_AWARE_SCENARIOS.floor20WarriorClericArcherLevel12,
            attempts,
        ),
    },
    floor28Slot5: {
        quadWarriorClericClericArcherLevel13: createRecoveryAwareScenarioWinRates(
            RECOVERY_AWARE_SCENARIOS.floor28WarriorClericClericArcher,
            attempts,
        ),
    },
});

export const HERO_CLASS_ORDER: HeroClass[] = [...HERO_CLASSES];
