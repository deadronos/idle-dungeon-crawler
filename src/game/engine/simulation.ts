import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import {
    getEarnedTalentPointTotal,
    type HeroBuildState,
} from "../heroBuilds";
import {
    getExpRequirement,
    isHeroClass,
    recalculateEntity,
    type Entity,
    type StatusEffectKey,
} from "../entity";
import { formatEquipmentTierRank, getHighestUnlockedEquipmentTier, grantVictoryLoot } from "../equipmentProgression";
import { getEquipmentDefinition } from "../heroBuilds";
import { getNextPartySlotUnlock } from "../partyProgression";
import { getInsightXpMultiplier } from "../progressionMath";
import type { CombatEvent, GameState } from "../store/types";
import { secureRandom } from "../../utils/random";

import {
    COMBAT_EVENT_TICKS,
    createCombatEvent,
    decrementCombatEvents,
    prependCombatMessages,
} from "./combatEvents";
import {
    cloneEntity,
    getPartyWipeState,
    getPostVictoryFloorReplayState,
    getPostVictoryFloorTransitionState,
} from "./encounter";
import { GAME_TICK_MS } from "./constants";
import {
    processStatusEffects,
} from "./statusEffects";
import { applyActiveSkill, resolveCombatTurn, updateSkillBanner } from "./turnResolution";

export { ATB_RATE, GAME_TICK_MS, GAME_TICK_RATE, HASTE_ATB_RATE } from "./constants";
export { COMBAT_EVENT_TICKS, prependCombatMessages } from "./combatEvents";
export {
    getActionProgressPerTick,
    getEffectiveCritMultiplier,
    getParryChance,
    getPenetrationReduction,
    getPhysicalHitChance,
    getSpellHitChance,
    applyElementalMitigation,
    applyPhysicalMitigation,
} from "./combatMath";
export {
    cloneEntity,
    createEncounter,
    createInitialGameState,
    getEncounterSize,
    getFloorReplayState,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    getPostVictoryFloorReplayState,
    getPostVictoryFloorTransitionState,
    isBossFloor,
    POST_VICTORY_HP_RECOVERY_RATIO,
    recalculateParty,
} from "./encounter";
export {
    getStatusApplicationChance,
    BURN_DURATION_TICKS,
    HEX_DURATION_TICKS,
    REGEN_DURATION_TICKS,
} from "./statusEffects";

export const WARRIOR_RAGE_STRIKE_COST = getHeroClassTemplate("Warrior").actionPackage.specialAttack?.cost ?? 40;
export const WARRIOR_RAGE_PER_ATTACK = getHeroClassTemplate("Warrior").resourceModel.gainOnResolvedAttack;
export const WARRIOR_RAGE_WHEN_HIT = getHeroClassTemplate("Warrior").resourceModel.gainOnTakeDamage;
export const ARCHER_PIERCING_SHOT_COST = getHeroClassTemplate("Archer").actionPackage.specialAttack?.cost ?? 35;
export const ARCHER_PIERCING_SHOT_CRIT_BONUS = getHeroClassTemplate("Archer").actionPackage.specialAttack?.critChanceBonus ?? 0.15;
export const ARCHER_CUNNING_REGEN_PER_TICK = getHeroClassTemplate("Archer").resourceModel.regenFlat;
export const CLERIC_BLESS_COST = getHeroClassTemplate("Cleric").actionPackage.bless?.cost ?? 25;

export type SimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

export interface SimulationResult {
    state: GameState;
    outcome: SimulationOutcome;
}

export interface SimulationRandomSource {
    next: () => number;
}

const defaultRandomSource: SimulationRandomSource = {
    next: () => secureRandom(),
};

export const createSequenceRandomSource = (...rolls: number[]): SimulationRandomSource => {
    let index = 0;

    return {
        next: () => {
            if (rolls.length === 0) {
                return 0;
            }

            const nextRoll = rolls[Math.min(index, rolls.length - 1)];
            index += 1;
            return nextRoll;
        },
    };
};

const getVictoryLootMessages = ({
    previousHighestTier,
    highestFloorCleared,
    lootResult,
}: {
    previousHighestTier: number;
    highestFloorCleared: number;
    lootResult: ReturnType<typeof grantVictoryLoot>;
}) => {
    const unlockedTier = getHighestUnlockedEquipmentTier(highestFloorCleared);
    return [
        unlockedTier > previousHighestTier ? `Armory tier ${unlockedTier} is now available.` : null,
        ...lootResult.gainedItems.map((item) => {
            const definition = getEquipmentDefinition(item.definitionId);
            return definition ? `Found ${definition.name} ${formatEquipmentTierRank(item)}.` : null;
        }),
        ...lootResult.autoSoldItems.map((item) => {
            const definition = getEquipmentDefinition(item.definitionId);
            return definition ? `${definition.name} ${formatEquipmentTierRank(item)} auto-sold for ${item.sellValue} gold.` : null;
        }),
    ].filter((message): message is string => Boolean(message));
};

const getPostVictorySimulationState = (
    state: GameState,
    randomSource: SimulationRandomSource,
): GameState => {
    const clearedFloor = state.floor;
    const highestFloorCleared = Math.max(state.highestFloorCleared, clearedFloor);
    const previousHighestTier = state.equipmentProgression.highestUnlockedEquipmentTier;
    let nextState = state;

    if (highestFloorCleared !== state.highestFloorCleared) {
        const nextUnlock = getNextPartySlotUnlock(state.partyCapacity);
        const hasUnlockedNextSlot = nextUnlock && highestFloorCleared >= nextUnlock.milestoneFloor;

        nextState = {
            ...nextState,
            highestFloorCleared,
            combatLog: hasUnlockedNextSlot
                ? prependCombatMessages(nextState.combatLog, "A new party slot can now be unlocked in the shop.")
                : nextState.combatLog,
        };
    }

    const lootResult = grantVictoryLoot(
        nextState.equipmentProgression,
        nextState.party,
        clearedFloor,
        highestFloorCleared,
        randomSource,
    );
    const lootMessages = getVictoryLootMessages({
        previousHighestTier,
        highestFloorCleared,
        lootResult,
    });

    nextState = {
        ...nextState,
        gold: nextState.gold.plus(lootResult.autoSellGold),
        equipmentProgression: lootResult.equipmentProgression,
        combatLog: lootMessages.length > 0 ? prependCombatMessages(nextState.combatLog, ...lootMessages) : nextState.combatLog,
    };

    return nextState.autoAdvance
        ? { ...nextState, ...getPostVictoryFloorTransitionState(nextState, nextState.floor + 1) }
        : { ...nextState, ...getPostVictoryFloorReplayState(nextState) };
};

export const stepSimulationState = (
    state: GameState,
    deltaMs = GAME_TICK_MS,
    randomSource: SimulationRandomSource = defaultRandomSource,
): GameState => {
    const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));
    let nextState = state;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        const result = simulateTick(nextState, randomSource);
        nextState = result.state;

        if (result.outcome === "party-wipe") {
            return { ...nextState, ...getPartyWipeState(nextState) };
        }

        if (result.outcome === "victory") {
            return getPostVictorySimulationState(nextState, randomSource);
        }
    }

    return nextState;
};

export const simulateTick = (state: GameState, randomSource: SimulationRandomSource = defaultRandomSource): SimulationResult => {
    const draft: GameState = {
        ...state,
        party: state.party.map(cloneEntity),
        enemies: state.enemies.map(cloneEntity),
        gold: new Decimal(state.gold),
        combatLog: [...state.combatLog],
        combatEvents: state.combatEvents.map((event) => ({ ...event })),
        metaUpgrades: { ...state.metaUpgrades },
        talentProgression: {
            talentRanksByHeroId: Object.fromEntries(
                Object.entries(state.talentProgression.talentRanksByHeroId).map(([heroId, talentRanks]) => [heroId, { ...talentRanks }]),
            ),
            talentPointsByHeroId: { ...state.talentProgression.talentPointsByHeroId },
        },
        equipmentProgression: {
            inventoryItems: state.equipmentProgression.inventoryItems.map((item) => ({ ...item, affinityTags: [...item.affinityTags] })),
            equippedItemInstanceIdsByHeroId: Object.fromEntries(
                Object.entries(state.equipmentProgression.equippedItemInstanceIdsByHeroId).map(([heroId, itemIds]) => [heroId, [...itemIds]]),
            ),
            highestUnlockedEquipmentTier: state.equipmentProgression.highestUnlockedEquipmentTier,
            inventoryCapacityLevel: state.equipmentProgression.inventoryCapacityLevel,
            inventoryCapacity: state.equipmentProgression.inventoryCapacity,
            nextInstanceSequence: state.equipmentProgression.nextInstanceSequence,
        },
    };
    const buildState: HeroBuildState = {
        talentProgression: draft.talentProgression,
        equipmentProgression: draft.equipmentProgression,
    };

    let anyActionTaken = false;
    let anyVisualUpdate = false;
    const logMessages: string[] = [];
    const addLogMessage = (message: string) => {
        logMessages.push(message);
    };
    const combatEvents: CombatEvent[] = decrementCombatEvents(draft.combatEvents);
    if (draft.combatEvents.length > 0) {
        anyVisualUpdate = true;
    }
    draft.combatEvents = combatEvents;

    const queueCombatEvent = (event: Omit<CombatEvent, "id">) => {
        draft.combatEvents.push(createCombatEvent(event));
        anyVisualUpdate = true;
    };

    const queueStatusEvent = ({
        target,
        statusKey,
        statusPhase,
        text,
        amount,
    }: {
        target: Entity;
        statusKey: StatusEffectKey;
        statusPhase: "apply" | "tick" | "expire" | "cleanse";
        text: string;
        amount?: string;
    }) => {
        queueCombatEvent({
            targetId: target.id,
            kind: "status",
            text,
            amount,
            statusKey,
            statusPhase,
            ttlTicks: COMBAT_EVENT_TICKS,
        });
    };

    const handleDefeat = (target: Entity) => {
        queueCombatEvent({
            targetId: target.id,
            kind: "defeat",
            text: "Defeated",
            ttlTicks: COMBAT_EVENT_TICKS,
        });
        logMessages.push(`${target.name} was defeated!`);

        if (!target.isEnemy) {
            return;
        }

        const baseExp = new Decimal(draft.floor).times(10).plus(target.attributes.vit);
        const xpBonus = getInsightXpMultiplier(draft.prestigeUpgrades.xpMultiplier);
        const experienceReward = baseExp.times(xpBonus).floor();
        const goldReward = new Decimal(draft.floor).times(2).plus(5);
        draft.gold = draft.gold.plus(goldReward);

        draft.party.forEach((hero, index) => {
            if (hero.currentHp.lte(0)) {
                return;
            }

            draft.party[index] = { ...hero, exp: hero.exp.plus(experienceReward) };

            let nextHero = draft.party[index];
            while (nextHero.exp.gte(nextHero.expToNext)) {
                const earnedPointsBefore = isHeroClass(nextHero.class)
                    ? getEarnedTalentPointTotal(nextHero.class, nextHero.level)
                    : 0;
                nextHero.exp = nextHero.exp.minus(nextHero.expToNext);
                nextHero.level += 1;
                nextHero.expToNext = getExpRequirement(nextHero.level);
                const heroTemplate = getHeroClassTemplate(nextHero.class);
                nextHero.attributes.str += heroTemplate.growth.str;
                nextHero.attributes.vit += heroTemplate.growth.vit;
                nextHero.attributes.dex += heroTemplate.growth.dex;
                nextHero.attributes.int += heroTemplate.growth.int;
                nextHero.attributes.wis += heroTemplate.growth.wis;
                const earnedPointsAfter = isHeroClass(nextHero.class)
                    ? getEarnedTalentPointTotal(nextHero.class, nextHero.level)
                    : 0;
                const gainedTalentPoints = Math.max(0, earnedPointsAfter - earnedPointsBefore);

                if (gainedTalentPoints > 0) {
                    draft.talentProgression.talentPointsByHeroId[nextHero.id] =
                        (draft.talentProgression.talentPointsByHeroId[nextHero.id] ?? 0) + gainedTalentPoints;
                    logMessages.push(`${nextHero.name} gained ${gainedTalentPoints} talent point${gainedTalentPoints === 1 ? "" : "s"}!`);
                }

                nextHero = recalculateEntity(nextHero, draft.metaUpgrades, draft.prestigeUpgrades, buildState);
                logMessages.push(`${nextHero.name} reached level ${nextHero.level}!`);
            }

            draft.party[index] = nextHero;
        });
    };

    const setActiveSkill = (entity: Entity, skill: string) => {
        anyVisualUpdate = true;
        applyActiveSkill(entity, skill, queueCombatEvent);
    };

    draft.party.forEach((hero) => {
        anyVisualUpdate = updateSkillBanner(hero) || anyVisualUpdate;
    });
    draft.enemies.forEach((enemy) => {
        anyVisualUpdate = updateSkillBanner(enemy) || anyVisualUpdate;
    });

    let livingHeroes = draft.party.filter((hero) => hero.currentHp.gt(0));
    let livingEnemies = draft.enemies.filter((enemy) => enemy.currentHp.gt(0));

    if (livingHeroes.length === 0) {
        return { state, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        return { state: anyVisualUpdate ? draft : state, outcome: "victory" };
    }

    if (!draft.autoFight) {
        return { state: anyVisualUpdate ? draft : state, outcome: "paused" };
    }

    draft.party.forEach((hero) => processStatusEffects(hero, queueStatusEvent, addLogMessage, handleDefeat));
    draft.enemies.forEach((enemy) => processStatusEffects(enemy, queueStatusEvent, addLogMessage, handleDefeat));

    livingHeroes = draft.party.filter((hero) => hero.currentHp.gt(0));
    livingEnemies = draft.enemies.filter((enemy) => enemy.currentHp.gt(0));

    if (livingHeroes.length === 0) {
        if (logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        if (logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "victory" };
    }

    draft.party.forEach((hero) => {
        anyActionTaken = resolveCombatTurn({
            entity: hero,
            allies: draft.party,
            targets: draft.enemies,
            prestigeUpgrades: draft.prestigeUpgrades,
            buildState,
            randomSource,
            setActiveSkill,
            queueCombatEvent,
            queueStatusEvent,
            addLogMessage,
            handleDefeat,
        }) || anyActionTaken;
    });

    draft.enemies.forEach((enemy) => {
        anyActionTaken = resolveCombatTurn({
            entity: enemy,
            allies: draft.enemies,
            targets: draft.party,
            prestigeUpgrades: draft.prestigeUpgrades,
            buildState,
            randomSource,
            setActiveSkill,
            queueCombatEvent,
            queueStatusEvent,
            addLogMessage,
            handleDefeat,
        }) || anyActionTaken;
    });

    if (logMessages.length > 0) {
        draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
    }

    if (anyActionTaken || anyVisualUpdate) {
        return { state: draft, outcome: "running" };
    }

    return { state: draft, outcome: "running" };
};
