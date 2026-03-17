import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "./upgrades";
import { createRecruitHero } from "./entity";
import type { HeroClass } from "./entity";
import { canUnlockPartySlot, getNextPartySlotUnlock, getRecruitCost as calculateRecruitCost } from "./partyProgression";
import { canSellInventoryItem, getNextInventoryCapacityUpgrade } from "./equipmentProgression";
import {
    findEquipableInventoryItem,
    getEquipmentInstance,
    getEquipmentOwnerId,
    getTalentDefinition,
    resolveEquipmentItem,
    synchronizeEquipmentProgression,
    synchronizeTalentProgression,
} from "./heroBuilds";
import { prependCombatMessages, recalculateParty } from "./engine/simulation";
import type { EquipmentSlot } from "./heroBuilds";
import type { GameState, PrestigeUpgrades } from "./store/types";

const getRecalculatedParty = ({
    state,
    party,
    talentProgression = state.talentProgression,
    equipmentProgression = state.equipmentProgression,
    metaUpgrades = state.metaUpgrades,
    prestigeUpgrades = state.prestigeUpgrades,
}: {
    state: GameState;
    party: GameState["party"];
    talentProgression?: GameState["talentProgression"];
    equipmentProgression?: GameState["equipmentProgression"];
    metaUpgrades?: GameState["metaUpgrades"];
    prestigeUpgrades?: GameState["prestigeUpgrades"];
}) => recalculateParty(party, metaUpgrades, prestigeUpgrades, {
    talentProgression,
    equipmentProgression,
});

export const PRESTIGE_BASE_COSTS: Record<keyof PrestigeUpgrades, number> = {
    costReducer: 10,
    hpMultiplier: 15,
    gameSpeed: 25,
    xpMultiplier: 10,
};

export const PRESTIGE_UPGRADE_NAMES: Record<keyof PrestigeUpgrades, string> = {
    costReducer: "Greed (Gold Cost Reducer)",
    hpMultiplier: "Vitality (HP Multiplier)",
    gameSpeed: "Haste (Game Speed Booster)",
    xpMultiplier: "Insight (XP Multiplier)",
};

export const getPrestigeUpgradeCost = (upgradeId: keyof PrestigeUpgrades, currentLevel: number) =>
    Math.floor(PRESTIGE_BASE_COSTS[upgradeId] * Math.pow(1.5, currentLevel));

export const getRetirementHeroSoulReward = (heroLevel: number) => Math.floor(heroLevel / 5) * 10;

export const getTrainingUpgradePurchaseState = (state: GameState): Partial<GameState> | null => {
    const cost = calculateTrainingUpgradeCost(state.metaUpgrades.training, state.prestigeUpgrades.costReducer);
    if (state.gold.lt(cost)) {
        return null;
    }

    const metaUpgrades = {
        ...state.metaUpgrades,
        training: state.metaUpgrades.training + 1,
    };

    return {
        gold: state.gold.minus(cost),
        metaUpgrades,
        party: getRecalculatedParty({ state, party: state.party, metaUpgrades }),
    };
};

export const getFortificationUpgradePurchaseState = (state: GameState): Partial<GameState> | null => {
    const cost = calculateFortificationUpgradeCost(state.metaUpgrades.fortification, state.prestigeUpgrades.costReducer);
    if (state.gold.lt(cost)) {
        return null;
    }

    const metaUpgrades = {
        ...state.metaUpgrades,
        fortification: state.metaUpgrades.fortification + 1,
    };

    return {
        gold: state.gold.minus(cost),
        metaUpgrades,
        party: getRecalculatedParty({ state, party: state.party, metaUpgrades }),
    };
};

export const getPartySlotUnlockState = (state: GameState): Partial<GameState> | null => {
    const nextUnlock = getNextPartySlotUnlock(state.partyCapacity);
    if (!nextUnlock || !canUnlockPartySlot(state.partyCapacity, state.highestFloorCleared) || state.gold.lt(nextUnlock.cost)) {
        return null;
    }

    return {
        gold: state.gold.minus(nextUnlock.cost),
        partyCapacity: nextUnlock.capacity,
        combatLog: prependCombatMessages(state.combatLog, `Party capacity expanded to ${nextUnlock.capacity}.`),
    };
};

export const getRecruitHeroState = (state: GameState, heroClass: HeroClass): Partial<GameState> | null => {
    const cost = calculateRecruitCost(state.party.length);
    if (state.gold.lt(cost) || state.party.length >= state.partyCapacity) {
        return null;
    }

    const newHero = createRecruitHero(heroClass, state.party, state.metaUpgrades, state.prestigeUpgrades);
    const party = [...state.party, newHero];
    const talentProgression = synchronizeTalentProgression(party, state.talentProgression);
    const equipmentProgression = synchronizeEquipmentProgression(party, state.equipmentProgression);

    return {
        gold: state.gold.minus(cost),
        party: getRecalculatedParty({ state, party, talentProgression, equipmentProgression }),
        talentProgression,
        equipmentProgression,
        combatLog: prependCombatMessages(state.combatLog, `${newHero.name} the ${heroClass} joined the party!`),
    };
};

export const getRetireHeroState = (state: GameState, heroId: string): Partial<GameState> | null => {
    const heroIndex = state.party.findIndex((hero) => hero.id === heroId);
    if (heroIndex === -1 || heroId === "hero_1") {
        return null;
    }

    const hero = state.party[heroIndex];
    const heroSoulsAwarded = getRetirementHeroSoulReward(hero.level);
    const party = [...state.party];
    party.splice(heroIndex, 1);
    const talentProgression = synchronizeTalentProgression(party, state.talentProgression);
    const equipmentProgression = synchronizeEquipmentProgression(party, state.equipmentProgression);

    return {
        party: getRecalculatedParty({ state, party, talentProgression, equipmentProgression }),
        talentProgression,
        equipmentProgression,
        heroSouls: state.heroSouls.plus(heroSoulsAwarded),
        combatLog: prependCombatMessages(
            state.combatLog,
            heroSoulsAwarded > 0
                ? `${hero.name} was retired in exchange for ${heroSoulsAwarded} Hero Souls.`
                : `${hero.name} was dismissed.`,
        ),
    };
};

export const getTalentUnlockState = (state: GameState, heroId: string, talentId: string): Partial<GameState> | null => {
    const hero = state.party.find((partyMember) => partyMember.id === heroId);
    const talentDefinition = getTalentDefinition(talentId);

    if (!hero || !talentDefinition || talentDefinition.heroClass !== hero.class) {
        return null;
    }

    const heroTalentRanks = state.talentProgression.talentRanksByHeroId[heroId] ?? {};
    const currentRank = heroTalentRanks[talentId] ?? 0;
    const availablePoints = state.talentProgression.talentPointsByHeroId[heroId] ?? 0;
    if (availablePoints <= 0 || currentRank >= (talentDefinition.maxRank ?? 3)) {
        return null;
    }

    const nextRank = currentRank + 1;
    const talentProgression = synchronizeTalentProgression(state.party, {
        talentRanksByHeroId: {
            ...state.talentProgression.talentRanksByHeroId,
            [heroId]: {
                ...heroTalentRanks,
                [talentId]: nextRank,
            },
        },
        talentPointsByHeroId: {
            ...state.talentProgression.talentPointsByHeroId,
            [heroId]: availablePoints - 1,
        },
    });

    return {
        talentProgression,
        party: getRecalculatedParty({ state, party: state.party, talentProgression }),
        combatLog: prependCombatMessages(
            state.combatLog,
            currentRank === 0
                ? `${hero.name} learned ${talentDefinition.name} (Rank ${nextRank}).`
                : `${hero.name} upgraded ${talentDefinition.name} to Rank ${nextRank}.`,
        ),
    };
};

export const getEquipItemState = (state: GameState, heroId: string, itemId: string): Partial<GameState> | null => {
    const hero = state.party.find((partyMember) => partyMember.id === heroId);
    if (!hero || hero.isEnemy) {
        return null;
    }

    const item = findEquipableInventoryItem(itemId, hero.class as HeroClass, state.equipmentProgression);
    if (!item) {
        return null;
    }

    const ownerId = getEquipmentOwnerId(item.id, state.equipmentProgression);
    if (ownerId && ownerId !== heroId) {
        return null;
    }

    const currentItemIds = state.equipmentProgression.equippedItemInstanceIdsByHeroId[heroId] ?? [];
    const nextItemIds = currentItemIds
        .filter((equippedItemId) => getEquipmentInstance(equippedItemId, state.equipmentProgression)?.slot !== item.slot)
        .concat(item.id);
    const equipmentProgression = synchronizeEquipmentProgression(state.party, {
        ...state.equipmentProgression,
        equippedItemInstanceIdsByHeroId: {
            ...state.equipmentProgression.equippedItemInstanceIdsByHeroId,
            [heroId]: nextItemIds,
        },
    });

    return {
        equipmentProgression,
        party: getRecalculatedParty({ state, party: state.party, equipmentProgression }),
        combatLog: prependCombatMessages(state.combatLog, `${hero.name} equipped ${item.name}.`),
    };
};

export const getUnequipItemState = (state: GameState, heroId: string, slot: EquipmentSlot): Partial<GameState> | null => {
    const hero = state.party.find((partyMember) => partyMember.id === heroId);
    if (!hero) {
        return null;
    }

    const currentItemIds = state.equipmentProgression.equippedItemInstanceIdsByHeroId[heroId] ?? [];
    const nextItemIds = currentItemIds.filter((itemId) => getEquipmentInstance(itemId, state.equipmentProgression)?.slot !== slot);
    if (nextItemIds.length === currentItemIds.length) {
        return null;
    }

    const equipmentProgression = synchronizeEquipmentProgression(state.party, {
        ...state.equipmentProgression,
        equippedItemInstanceIdsByHeroId: {
            ...state.equipmentProgression.equippedItemInstanceIdsByHeroId,
            [heroId]: nextItemIds,
        },
    });

    return {
        equipmentProgression,
        party: getRecalculatedParty({ state, party: state.party, equipmentProgression }),
        combatLog: prependCombatMessages(state.combatLog, `${hero.name} cleared their ${slot} slot.`),
    };
};

export const getInventoryCapacityUpgradePurchaseState = (state: GameState): Partial<GameState> | null => {
    const nextUpgrade = getNextInventoryCapacityUpgrade(state.equipmentProgression.inventoryCapacityLevel);
    if (!nextUpgrade || state.highestFloorCleared < nextUpgrade.milestoneFloor || state.gold.lt(nextUpgrade.cost)) {
        return null;
    }

    const equipmentProgression = synchronizeEquipmentProgression(state.party, {
        ...state.equipmentProgression,
        inventoryCapacityLevel: nextUpgrade.level,
        inventoryCapacity: nextUpgrade.capacity,
    });

    return {
        gold: state.gold.minus(nextUpgrade.cost),
        equipmentProgression,
        combatLog: prependCombatMessages(state.combatLog, `Inventory capacity expanded to ${nextUpgrade.capacity}.`),
    };
};

export const getSellInventoryItemState = (state: GameState, itemInstanceId: string): Partial<GameState> | null => {
    if (!canSellInventoryItem(itemInstanceId, state.equipmentProgression)) {
        return null;
    }

    const item = getEquipmentInstance(itemInstanceId, state.equipmentProgression);
    if (!item) {
        return null;
    }

    const resolvedItem = resolveEquipmentItem(item);
    const equipmentProgression = synchronizeEquipmentProgression(state.party, {
        ...state.equipmentProgression,
        inventoryItems: state.equipmentProgression.inventoryItems.filter((inventoryItem) => inventoryItem.instanceId !== itemInstanceId),
    });

    return {
        gold: state.gold.plus(item.sellValue),
        equipmentProgression,
        combatLog: prependCombatMessages(
            state.combatLog,
            `Sold ${resolvedItem?.name ?? item.definitionId} for ${item.sellValue} gold.`,
        ),
    };
};

export const getPrestigeUpgradePurchaseState = (
    state: GameState,
    upgradeId: keyof PrestigeUpgrades,
): Partial<GameState> | null => {
    const currentLevel = state.prestigeUpgrades[upgradeId];
    const cost = getPrestigeUpgradeCost(upgradeId, currentLevel);
    if (state.heroSouls.lt(cost)) {
        return null;
    }

    const prestigeUpgrades = {
        ...state.prestigeUpgrades,
        [upgradeId]: currentLevel + 1,
    };

    return {
        heroSouls: state.heroSouls.minus(cost),
        prestigeUpgrades,
        party: getRecalculatedParty({ state, party: state.party, prestigeUpgrades }),
        combatLog: prependCombatMessages(
            state.combatLog,
            `Altar of Souls: Purchased ${PRESTIGE_UPGRADE_NAMES[upgradeId]} Lv ${currentLevel + 1}.`,
        ),
    };
};
