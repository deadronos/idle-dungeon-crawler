import { type SecureRandomSource } from "../utils/random";
import type { Entity, HeroClass } from "./entity";
import {
    EQUIPMENT_DEFINITIONS,
    createEquipmentItemInstance,
    getEquipmentDefinition,
    getEquipmentOwnerId,
    type EquipmentItemDefinition,
    type ResolvedEquipmentItem,
} from "./heroBuilds";
import type { EquipmentItemInstance, EquipmentProgressionState } from "./store/types";

export interface InventoryCapacityUpgrade {
    level: number;
    milestoneFloor: number;
    cost: number;
    capacity: number;
}

export type RandomSourceLike = SecureRandomSource;

export interface GrantedLootResult {
    equipmentProgression: EquipmentProgressionState;
    gainedItems: EquipmentItemInstance[];
    autoSoldItems: EquipmentItemInstance[];
    autoSellGold: number;
}

const STARTING_INVENTORY_CAPACITY = 12;
const INVENTORY_CAPACITY_INCREMENT = 6;
const MAX_EQUIPMENT_TIER = 5;

export const INVENTORY_CAPACITY_UPGRADES: InventoryCapacityUpgrade[] = [
    { level: 1, milestoneFloor: 3, cost: 40, capacity: STARTING_INVENTORY_CAPACITY + INVENTORY_CAPACITY_INCREMENT },
    { level: 2, milestoneFloor: 8, cost: 120, capacity: STARTING_INVENTORY_CAPACITY + (INVENTORY_CAPACITY_INCREMENT * 2) },
    { level: 3, milestoneFloor: 18, cost: 350, capacity: STARTING_INVENTORY_CAPACITY + (INVENTORY_CAPACITY_INCREMENT * 3) },
    { level: 4, milestoneFloor: 28, cost: 900, capacity: STARTING_INVENTORY_CAPACITY + (INVENTORY_CAPACITY_INCREMENT * 4) },
];

const EQUIPMENT_TIER_UNLOCKS = [
    { tier: 1, milestoneFloor: 1, minRank: 1, maxRank: 1 },
    { tier: 2, milestoneFloor: 3, minRank: 1, maxRank: 2 },
    { tier: 3, milestoneFloor: 8, minRank: 2, maxRank: 3 },
    { tier: 4, milestoneFloor: 16, minRank: 3, maxRank: 4 },
    { tier: 5, milestoneFloor: 26, minRank: 4, maxRank: 5 },
];

const FAVORABLE_DROP_WEIGHT = 0.7;

const getPartyClasses = (party: Array<Pick<Entity, "class" | "isEnemy">>) =>
    [...new Set(
        party
            .filter((hero) => !hero.isEnemy && hero.class !== "Monster")
            .map((hero) => hero.class as HeroClass),
    )];

const getClassAffinityTag = (heroClass: HeroClass) => heroClass.toLowerCase();

const getDefinitionsForParty = (partyClasses: HeroClass[]) => {
    const partyTags = new Set(partyClasses.map(getClassAffinityTag));
    const favored = EQUIPMENT_DEFINITIONS.filter((definition) => {
        const heroClassHit = definition.heroClasses?.some((heroClass) => partyClasses.includes(heroClass)) ?? false;
        const affinityHit = definition.affinityTags.some((tag) => partyTags.has(tag));
        return heroClassHit || affinityHit;
    });
    const flexible = EQUIPMENT_DEFINITIONS.filter((definition) => !favored.includes(definition));

    return {
        favored,
        flexible,
    };
};

const pickOne = <T>(values: T[], randomSource: RandomSourceLike) => {
    if (values.length === 0) {
        return null;
    }

    const index = Math.min(values.length - 1, Math.floor(randomSource.next() * values.length));
    return values[index] ?? null;
};

const getUnlockedTierEntry = (highestFloorCleared: number) =>
    [...EQUIPMENT_TIER_UNLOCKS]
        .reverse()
        .find((entry) => highestFloorCleared >= entry.milestoneFloor) ?? EQUIPMENT_TIER_UNLOCKS[0];

export const getHighestUnlockedEquipmentTier = (highestFloorCleared: number) =>
    Math.min(MAX_EQUIPMENT_TIER, getUnlockedTierEntry(highestFloorCleared).tier);

export const getEquipmentRankRangeForTier = (tier: number) => {
    const entry = EQUIPMENT_TIER_UNLOCKS.find((unlock) => unlock.tier === tier) ?? EQUIPMENT_TIER_UNLOCKS[0];
    return { minRank: entry.minRank, maxRank: entry.maxRank };
};

export const getInventoryCapacityForLevel = (inventoryCapacityLevel: number) =>
    INVENTORY_CAPACITY_UPGRADES.find((upgrade) => upgrade.level === inventoryCapacityLevel)?.capacity
    ?? (STARTING_INVENTORY_CAPACITY + (Math.max(0, inventoryCapacityLevel) * INVENTORY_CAPACITY_INCREMENT));

export const getNextInventoryCapacityUpgrade = (inventoryCapacityLevel: number) =>
    INVENTORY_CAPACITY_UPGRADES.find((upgrade) => upgrade.level === inventoryCapacityLevel + 1) ?? null;

export const getDropCountForFloor = (floor: number) => (floor % 10 === 0 ? 2 : 1);

export const shouldAutoSellNewItem = (equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItems.length >= equipmentProgression.inventoryCapacity;

const rollRankForTier = (tier: number, randomSource: RandomSourceLike, bossFloor: boolean) => {
    const { minRank, maxRank } = getEquipmentRankRangeForTier(tier);
    if (bossFloor) {
        return maxRank;
    }

    const spread = maxRank - minRank + 1;
    return minRank + Math.floor(randomSource.next() * spread);
};

const chooseDropDefinition = (
    partyClasses: HeroClass[],
    randomSource: RandomSourceLike,
): EquipmentItemDefinition | null => {
    const { favored, flexible } = getDefinitionsForParty(partyClasses);
    const shouldFavor = randomSource.next() < FAVORABLE_DROP_WEIGHT;

    if (shouldFavor && favored.length > 0) {
        return pickOne(favored, randomSource);
    }

    if (flexible.length > 0) {
        return pickOne(flexible, randomSource);
    }

    return pickOne(EQUIPMENT_DEFINITIONS, randomSource);
};

export const unlockEquipmentTier = (
    equipmentProgression: EquipmentProgressionState,
    highestFloorCleared: number,
): EquipmentProgressionState => ({
    ...equipmentProgression,
    highestUnlockedEquipmentTier: Math.max(
        equipmentProgression.highestUnlockedEquipmentTier,
        getHighestUnlockedEquipmentTier(highestFloorCleared),
    ),
});

export const grantVictoryLoot = (
    equipmentProgression: EquipmentProgressionState,
    party: Array<Pick<Entity, "class" | "isEnemy">>,
    floor: number,
    highestFloorCleared: number,
    randomSource: RandomSourceLike,
): GrantedLootResult => {
    const upgradedProgression = unlockEquipmentTier(equipmentProgression, highestFloorCleared);
    const nextItems = [...upgradedProgression.inventoryItems];
    let nextSequence = upgradedProgression.nextInstanceSequence;
    const gainedItems: EquipmentItemInstance[] = [];
    const autoSoldItems: EquipmentItemInstance[] = [];
    let autoSellGold = 0;
    const partyClasses = getPartyClasses(party);

    for (let index = 0; index < getDropCountForFloor(floor); index += 1) {
        const definition = chooseDropDefinition(partyClasses, randomSource);
        if (!definition) {
            continue;
        }

        const tier = upgradedProgression.highestUnlockedEquipmentTier;
        const rank = rollRankForTier(tier, randomSource, floor % 10 === 0);
        const item = createEquipmentItemInstance(definition.id, {
            tier,
            rank,
            sequence: nextSequence,
        });

        if (!item) {
            continue;
        }

        nextSequence += 1;

        if (nextItems.length >= upgradedProgression.inventoryCapacity) {
            autoSoldItems.push(item);
            autoSellGold += item.sellValue;
            continue;
        }

        nextItems.push(item);
        gainedItems.push(item);
    }

    return {
        equipmentProgression: {
            ...upgradedProgression,
            inventoryItems: nextItems,
            nextInstanceSequence: nextSequence,
        },
        gainedItems,
        autoSoldItems,
        autoSellGold,
    };
};

export const createLegacyEquipmentProgression = (
    inventoryItemIds: string[],
    equippedItemIdsByHeroId: Record<string, string[]>,
) => {
    const inventoryItems: EquipmentItemInstance[] = [];
    const equippedItemInstanceIdsByHeroId: Record<string, string[]> = {};
    let nextInstanceSequence = 1;

    const poolByDefinitionId = new Map<string, EquipmentItemInstance[]>();
    const orderedDefinitionIds = [
        ...inventoryItemIds,
        ...Object.values(equippedItemIdsByHeroId).flat(),
    ];

    orderedDefinitionIds.forEach((definitionId) => {
        const instance = createEquipmentItemInstance(definitionId, { sequence: nextInstanceSequence });
        if (!instance) {
            return;
        }

        nextInstanceSequence += 1;
        inventoryItems.push(instance);
        const pool = poolByDefinitionId.get(definitionId) ?? [];
        pool.push(instance);
        poolByDefinitionId.set(definitionId, pool);
    });

    Object.entries(equippedItemIdsByHeroId).forEach(([heroId, definitionIds]) => {
        equippedItemInstanceIdsByHeroId[heroId] = definitionIds
            .map((definitionId) => {
                const pool = poolByDefinitionId.get(definitionId) ?? [];
                const nextItem = pool.shift() ?? null;
                return nextItem?.instanceId ?? null;
            })
            .filter((instanceId): instanceId is string => Boolean(instanceId));
    });

    return {
        inventoryItems,
        equippedItemInstanceIdsByHeroId,
        highestUnlockedEquipmentTier: 1,
        inventoryCapacityLevel: 0,
        inventoryCapacity: STARTING_INVENTORY_CAPACITY,
        nextInstanceSequence,
    };
};

export const formatEquipmentTierRank = (item: Pick<ResolvedEquipmentItem, "tier" | "rank">) => `T${item.tier} R${item.rank}`;

export const getEquipmentAffinitySummary = (item: Pick<ResolvedEquipmentItem, "heroClasses" | "affinityTags">) => {
    const classSummary = item.heroClasses?.length ? item.heroClasses.join("/") : null;
    const genericTags = item.affinityTags.filter((tag) => !["warrior", "cleric", "archer"].includes(tag)).slice(0, 2);
    return [classSummary, ...genericTags].filter(Boolean).join(" • ");
};

export const getItemSellValue = (definitionId: string, tier: number, rank: number) => {
    const definition = getEquipmentDefinition(definitionId);
    return definition ? definition.sellValueBase + ((tier - 1) * definition.sellValuePerTier) + ((rank - 1) * definition.sellValuePerRank) : 0;
};

export const canSellInventoryItem = (
    itemId: string,
    equipmentProgression: EquipmentProgressionState,
) => !getEquipmentOwnerId(itemId, equipmentProgression);
