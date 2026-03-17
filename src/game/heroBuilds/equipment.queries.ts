import type { Entity, HeroClass } from "../entity";
import type { EquipmentItemInstance, EquipmentProgressionState } from "../store/types";

import { canHeroEquipItem, isHeroEligibleForEquipment, resolveEquipmentItem } from "./equipment.instances";
import type { ResolvedEquipmentItem } from "./shared";
import type { EquipmentSlot } from "./shared";

const equipmentOwnerCache = new WeakMap<Record<string, string[]>, Map<string, string>>();
const isResolvedEquipmentItem = (item: ResolvedEquipmentItem | null): item is ResolvedEquipmentItem => Boolean(item);
const isEquipmentItemInstance = (item: EquipmentItemInstance | null): item is EquipmentItemInstance => Boolean(item);

export const getEquipmentInstance = (itemId: string, equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItems.find((item) => item.instanceId === itemId) ?? null;

export const getInventoryItems = (equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItems
        .map((item) => resolveEquipmentItem(item))
        .filter(isResolvedEquipmentItem);

export const findEquipableInventoryItem = (
    itemIdentifier: string,
    heroClass: HeroClass,
    equipmentProgression: EquipmentProgressionState,
) => {
    const byInstanceId = getEquipmentInstance(itemIdentifier, equipmentProgression);
    if (byInstanceId) {
        const resolvedByInstance = resolveEquipmentItem(byInstanceId);
        return resolvedByInstance && canHeroEquipItem(heroClass, resolvedByInstance) ? resolvedByInstance : null;
    }

    return getInventoryItems(equipmentProgression).find(
        (item) => item.definitionId === itemIdentifier && canHeroEquipItem(heroClass, item),
    ) ?? null;
};

export const getEquipmentOwnerId = (itemId: string, equipmentProgression: EquipmentProgressionState) => {
    const equippedMapping = equipmentProgression.equippedItemInstanceIdsByHeroId;
    let reverseMapping = equipmentOwnerCache.get(equippedMapping);

    if (!reverseMapping) {
        reverseMapping = new Map<string, string>();
        for (const [heroId, itemIds] of Object.entries(equippedMapping)) {
            for (const id of itemIds) {
                reverseMapping.set(id, heroId);
            }
        }
        equipmentOwnerCache.set(equippedMapping, reverseMapping);
    }

    return reverseMapping.get(itemId) ?? null;
};

export const getHeroEquippedItemIds = (heroId: string, equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.equippedItemInstanceIdsByHeroId[heroId] ?? [];

export const getHeroEquippedItems = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
) => {
    if (!isHeroEligibleForEquipment(hero)) {
        return [];
    }
    const heroClass = hero.class;

    return getHeroEquippedItemIds(hero.id, equipmentProgression)
        .map((itemId) => getEquipmentInstance(itemId, equipmentProgression))
        .filter(isEquipmentItemInstance)
        .map((item) => resolveEquipmentItem(item))
        .filter(isResolvedEquipmentItem)
        .filter((item) => canHeroEquipItem(heroClass, item));
};

export const getEquippedItemForSlot = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
    slot: EquipmentSlot,
) => {
    return getHeroEquippedItems(hero, equipmentProgression).find((item) => item.slot === slot) ?? null;
};

export const getUnequippedInventoryItems = (
    equipmentProgression: EquipmentProgressionState,
    hero?: Pick<Entity, "class" | "isEnemy">,
) => {
    const items = getInventoryItems(equipmentProgression).filter((item) => !getEquipmentOwnerId(item.id, equipmentProgression));
    if (!hero || !isHeroEligibleForEquipment(hero)) {
        return items;
    }

    const heroClass = hero.class;
    return items.filter((item) => canHeroEquipItem(heroClass, item));
};

export const getAvailableInventoryItemsForHero = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
    slot?: EquipmentSlot,
) => {
    if (!isHeroEligibleForEquipment(hero)) {
        return [];
    }
    const heroClass = hero.class;

    return getInventoryItems(equipmentProgression)
        .filter((item) => !slot || item.slot === slot)
        .filter((item) => canHeroEquipItem(heroClass, item));
};

export const getSlotLockedReason = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    item: ResolvedEquipmentItem,
    equipmentProgression: EquipmentProgressionState,
) => {
    if (!isHeroEligibleForEquipment(hero)) {
        return "Only heroes can equip items.";
    }
    const heroClass = hero.class;

    if (!canHeroEquipItem(heroClass, item)) {
        return `${heroClass} cannot equip ${item.name}.`;
    }

    const ownerId = getEquipmentOwnerId(item.id, equipmentProgression);
    if (ownerId && ownerId !== hero.id) {
        return "Equipped by another hero.";
    }

    return null;
};
