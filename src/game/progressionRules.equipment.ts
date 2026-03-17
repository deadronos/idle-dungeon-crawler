import { canSellInventoryItem, getNextInventoryCapacityUpgrade } from "./equipmentProgression";
import { prependCombatMessages } from "./combatLog";
import {
    findEquipableInventoryItem,
    getEquipmentInstance,
    getEquipmentOwnerId,
    resolveEquipmentItem,
    synchronizeEquipmentProgression,
} from "./heroBuilds";
import { getRecalculatedParty } from "./progressionRules.shared";
import type { HeroClass } from "./entity";
import type { EquipmentSlot } from "./heroBuilds";
import type { GameState } from "./store/types";

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
