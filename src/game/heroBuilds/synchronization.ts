import type { Entity } from "../entity";
import type { EquipmentItemInstance, EquipmentProgressionState, TalentProgressionState } from "../store/types";

import {
    canHeroEquipItem,
    getEquipmentDefinition,
    resolveEquipmentItem,
} from "./equipment";
import { isPlayableHeroClass, type EquipmentSlot } from "./shared";
import {
    getEarnedTalentPointTotal,
    getHeroTalentRanks,
    getTalentDefinitionsForClass,
    getTalentMaxRank,
    getTalentPointsForHero,
    getTotalTalentRankCapacity,
} from "./talents";

const dedupeStrings = (values: string[]) => [...new Set(values)];

const dedupeInventoryItems = (items: EquipmentItemInstance[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.instanceId) || !getEquipmentDefinition(item.definitionId)) {
            return false;
        }

        seen.add(item.instanceId);
        return true;
    });
};

export const synchronizeTalentProgression = (
    party: Array<Pick<Entity, "id" | "class" | "level" | "isEnemy">>,
    talentProgression: TalentProgressionState,
): TalentProgressionState => {
    const nextTalentRanks: Record<string, Record<string, number>> = {};
    const nextPoints: Record<string, number> = {};

    party.forEach((hero) => {
        if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
            return;
        }

        const heroClass = hero.class;
        const availableTalents = new Map(getTalentDefinitionsForClass(heroClass).map((talent) => [talent.id, talent]));
        const validTalentRanks: Record<string, number> = Object.fromEntries(
            Object.entries(getHeroTalentRanks(hero.id, talentProgression))
                .filter(([talentId]) => availableTalents.has(talentId))
                .map(([talentId, rank]) => {
                    const talent = availableTalents.get(talentId)!;
                    return [talentId, Math.max(0, Math.min(getTalentMaxRank(talent), Math.floor(rank)))];
                })
                .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0),
        );
        const spentRanks = Object.values(validTalentRanks).reduce<number>((total, rank) => total + rank, 0);
        const minimumRemainingPoints = Math.max(0, getEarnedTalentPointTotal(heroClass, hero.level) - spentRanks);
        const existingPoints = getTalentPointsForHero(hero.id, talentProgression);
        const maximumRemainingPoints = Math.max(0, getTotalTalentRankCapacity(heroClass) - spentRanks);

        nextTalentRanks[hero.id] = validTalentRanks;
        nextPoints[hero.id] = Math.max(0, Math.min(Math.max(existingPoints, minimumRemainingPoints), maximumRemainingPoints));
    });

    return {
        talentRanksByHeroId: nextTalentRanks,
        talentPointsByHeroId: nextPoints,
    };
};

export const synchronizeEquipmentProgression = (
    party: Array<Pick<Entity, "id" | "class" | "isEnemy">>,
    equipmentProgression: EquipmentProgressionState,
): EquipmentProgressionState => {
    const inventoryItems = dedupeInventoryItems(equipmentProgression.inventoryItems);
    const inventoryItemMap = new Map(inventoryItems.map((item) => [item.instanceId, item]));
    const claimedItemIds = new Set<string>();
    const nextEquipped: Record<string, string[]> = {};

    party.forEach((hero) => {
        if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
            return;
        }

        const heroClass = hero.class;
        const usedSlots = new Set<EquipmentSlot>();
        const rawItemIds = dedupeStrings(equipmentProgression.equippedItemInstanceIdsByHeroId[hero.id] ?? []);
        const validItemIds = rawItemIds.filter((itemId) => {
            if (claimedItemIds.has(itemId)) {
                return false;
            }

            const instance = inventoryItemMap.get(itemId);
            const resolved = instance ? resolveEquipmentItem(instance) : null;
            if (!resolved || !canHeroEquipItem(heroClass, resolved) || usedSlots.has(resolved.slot)) {
                return false;
            }

            usedSlots.add(resolved.slot);
            claimedItemIds.add(itemId);
            return true;
        });

        nextEquipped[hero.id] = validItemIds;
    });

    return {
        inventoryItems,
        equippedItemInstanceIdsByHeroId: nextEquipped,
        highestUnlockedEquipmentTier: Math.max(1, equipmentProgression.highestUnlockedEquipmentTier ?? 1),
        inventoryCapacityLevel: Math.max(0, equipmentProgression.inventoryCapacityLevel ?? 0),
        inventoryCapacity: Math.max(1, equipmentProgression.inventoryCapacity ?? 12),
        nextInstanceSequence: Math.max(1, equipmentProgression.nextInstanceSequence ?? (inventoryItems.length + 1)),
    };
};
