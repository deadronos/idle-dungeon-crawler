import type { Entity, HeroClass } from "../entity";
import type { EquipmentItemInstance, EquipmentProgressionState } from "../store/types";

import { canHeroEquipItem, isHeroEligibleForEquipment, resolveEquipmentItem } from "./equipment.instances";
import type { ResolvedEquipmentItem } from "./shared";
import type { EquipmentSlot } from "./shared";

let equipmentOwnerCache = new WeakMap<Record<string, string[]>, Map<string, string>>();
let inventoryCache = new WeakMap<EquipmentItemInstance[], ResolvedEquipmentItem[]>();
let equipmentInstanceCache = new WeakMap<EquipmentItemInstance[], Map<string, EquipmentItemInstance | null>>();
let equippedSlotCache = new WeakMap<Record<string, string[]>, Map<string, Map<EquipmentSlot, ResolvedEquipmentItem | null>>>();
const isResolvedEquipmentItem = (item: ResolvedEquipmentItem | null): item is ResolvedEquipmentItem => Boolean(item);
const isEquipmentItemInstance = (item: EquipmentItemInstance | null): item is EquipmentItemInstance => Boolean(item);

export const __resetEquipmentMemoizationCaches = () => {
    equipmentOwnerCache = new WeakMap();
    inventoryCache = new WeakMap();
    equipmentInstanceCache = new WeakMap();
    equippedSlotCache = new WeakMap();
};

export const getEquipmentInstance = (itemId: string, equipmentProgression: EquipmentProgressionState) => {
    const items = equipmentProgression.inventoryItems;
    let map = equipmentInstanceCache.get(items);
    if (!map) {
        map = new Map<string, EquipmentItemInstance>();
        for (const item of items) {
            map.set(item.instanceId, item);
        }
        equipmentInstanceCache.set(items, map);
    }

    return map.get(itemId) ?? null;
};

export const getInventoryItems = (equipmentProgression: EquipmentProgressionState) => {
    const items = equipmentProgression.inventoryItems;
    let resolved = inventoryCache.get(items);

    if (!resolved) {
        resolved = items
            .map((item) => resolveEquipmentItem(item))
            .filter(isResolvedEquipmentItem);
        inventoryCache.set(items, resolved);
    }

    return resolved;
};

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
    const equippedMapping = equipmentProgression.equippedItemInstanceIdsByHeroId;
    let heroesMap = equippedSlotCache.get(equippedMapping);
    if (!heroesMap) {
        heroesMap = new Map<string, Map<EquipmentSlot, ResolvedEquipmentItem | null>>();
        equippedSlotCache.set(equippedMapping, heroesMap);
    }

    let slotMap = heroesMap.get(hero.id);
    if (!slotMap) {
        slotMap = new Map<EquipmentSlot, ResolvedEquipmentItem | null>();
        const allEquipped = getHeroEquippedItems(hero, equipmentProgression);
        for (const item of allEquipped) {
            slotMap.set(item.slot, item);
        }
        heroesMap.set(hero.id, slotMap);
    }

    return slotMap.get(slot) ?? null;
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
