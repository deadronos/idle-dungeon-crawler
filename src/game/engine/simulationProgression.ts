import Decimal from "decimal.js";

import { type SecureRandomSource } from "../../utils/random";
import { prependCombatMessages } from "../combatLog";
import { getHeroClassTemplate } from "../classTemplates";
import { getEarnedTalentPointTotal, type HeroBuildState } from "../heroBuilds";
import { getExpRequirement, isHeroClass, recalculateEntity, type Entity } from "../entity";
import { formatEquipmentTierRank, getHighestUnlockedEquipmentTier, grantVictoryLoot } from "../equipmentProgression";
import { getEquipmentDefinition } from "../heroBuilds";
import { getNextPartySlotUnlock } from "../partyProgression";
import { getInsightXpMultiplier } from "../progressionMath";
import type { GameState } from "../store/types";
import { getPostVictoryFloorReplayState, getPostVictoryFloorTransitionState } from "./encounter";

interface RandomSourceLike extends SecureRandomSource {}

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

export const getPostVictorySimulationState = (
    state: GameState,
    randomSource: RandomSourceLike,
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

export const applyEnemyDefeatRewards = ({
    state,
    target,
    buildState,
    addLogMessage,
}: {
    state: GameState;
    target: Entity;
    buildState: HeroBuildState;
    addLogMessage: (message: string) => void;
}) => {
    if (!target.isEnemy) {
        return;
    }

    const baseExp = new Decimal(state.floor).times(10).plus(target.attributes.vit);
    const xpBonus = getInsightXpMultiplier(state.prestigeUpgrades.xpMultiplier);
    const experienceReward = baseExp.times(xpBonus).floor();
    const goldReward = new Decimal(state.floor).times(2).plus(5);
    state.gold = state.gold.plus(goldReward);

    state.party.forEach((hero, index) => {
        if (hero.currentHp.lte(0)) {
            return;
        }

        state.party[index] = { ...hero, exp: hero.exp.plus(experienceReward) };

        let nextHero = state.party[index];
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
                state.talentProgression.talentPointsByHeroId[nextHero.id] =
                    (state.talentProgression.talentPointsByHeroId[nextHero.id] ?? 0) + gainedTalentPoints;
                addLogMessage(`${nextHero.name} gained ${gainedTalentPoints} talent point${gainedTalentPoints === 1 ? "" : "s"}!`);
            }

            nextHero = recalculateEntity(nextHero, state.metaUpgrades, state.prestigeUpgrades, buildState);
            addLogMessage(`${nextHero.name} reached level ${nextHero.level}!`);
        }

        state.party[index] = nextHero;
    });
};
