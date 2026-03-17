import type { Entity, HeroClass } from "../entity";
import type { EquipmentItemInstance, EquipmentProgressionState } from "../store/types";

import {
    getMergedEffects,
    isPlayableHeroClass,
    scaleBuildEffects,
    type EquipmentItemDefinition,
    type EquipmentSlot,
    type ResolvedEquipmentItem,
} from "./shared";

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
    weapon: "Weapon",
    armor: "Armor",
    charm: "Charm",
    trinket: "Trinket",
};

export const EQUIPMENT_DEFINITIONS: EquipmentItemDefinition[] = [
    {
        id: "greatblade-of-embers",
        slot: "weapon",
        name: "Greatblade of Embers",
        description: "Warrior-only greatblade tuned for relentless frontline pressure.",
        heroClasses: ["Warrior"],
        affinityTags: ["warrior", "offense", "guard"],
        scaling: {
            base: { ratingBonuses: { power: 5, guard: 2 } },
            perTier: { ratingBonuses: { power: 1, guard: 1 } },
            perRank: { ratingBonuses: { power: 1 } },
        },
        sellValueBase: 24,
        sellValuePerTier: 10,
        sellValuePerRank: 6,
    },
    {
        id: "sunlit-censer",
        slot: "weapon",
        name: "Sunlit Censer",
        description: "Cleric-only holy focus that steadies spells and support.",
        heroClasses: ["Cleric"],
        affinityTags: ["cleric", "support", "spell"],
        scaling: {
            base: { ratingBonuses: { spellPower: 5, resolve: 2 } },
            perTier: { ratingBonuses: { spellPower: 1, resolve: 1 } },
            perRank: { ratingBonuses: { spellPower: 1 } },
        },
        sellValueBase: 24,
        sellValuePerTier: 10,
        sellValuePerRank: 6,
    },
    {
        id: "hawkstring-bow",
        slot: "weapon",
        name: "Hawkstring Bow",
        description: "Archer-only bow that sharpens ranged accuracy and crits.",
        heroClasses: ["Archer"],
        affinityTags: ["archer", "precision", "tempo"],
        scaling: {
            base: { ratingBonuses: { precision: 5, crit: 3 } },
            perTier: { ratingBonuses: { precision: 1, crit: 1 } },
            perRank: { ratingBonuses: { precision: 1 } },
        },
        sellValueBase: 24,
        sellValuePerTier: 10,
        sellValuePerRank: 6,
    },
    {
        id: "bastion-plate",
        slot: "armor",
        name: "Bastion Plate",
        description: "Heavy armor for heroes who want sturdier physical defenses.",
        affinityTags: ["warrior", "defense", "universal"],
        scaling: {
            base: { ratingBonuses: { guard: 5, resolve: 1 } },
            perTier: { ratingBonuses: { guard: 1, resolve: 1 } },
            perRank: { ratingBonuses: { guard: 1 } },
        },
        sellValueBase: 18,
        sellValuePerTier: 8,
        sellValuePerRank: 5,
    },
    {
        id: "pilgrim-vestments",
        slot: "armor",
        name: "Pilgrim Vestments",
        description: "Light ceremonial robes with magical staying power.",
        affinityTags: ["cleric", "resolve", "universal"],
        scaling: {
            base: { ratingBonuses: { resolve: 4, spellPower: 2 } },
            perTier: { ratingBonuses: { resolve: 1, spellPower: 1 } },
            perRank: { ratingBonuses: { resolve: 1 } },
        },
        sellValueBase: 18,
        sellValuePerTier: 8,
        sellValuePerRank: 5,
    },
    {
        id: "shadowhide-leathers",
        slot: "armor",
        name: "Shadowhide Leathers",
        description: "Flexible leathers that favor action speed and shot setup.",
        affinityTags: ["archer", "tempo", "precision"],
        scaling: {
            base: { ratingBonuses: { haste: 4, precision: 2 } },
            perTier: { ratingBonuses: { haste: 1, precision: 1 } },
            perRank: { ratingBonuses: { haste: 1 } },
        },
        sellValueBase: 18,
        sellValuePerTier: 8,
        sellValuePerRank: 5,
    },
    {
        id: "ember-charm",
        slot: "charm",
        name: "Ember Charm",
        description: "A charm for heroes who want extra elemental pressure.",
        affinityTags: ["cleric", "potency", "universal"],
        scaling: {
            base: { ratingBonuses: { potency: 4, spellPower: 2 } },
            perTier: { ratingBonuses: { potency: 1, spellPower: 1 } },
            perRank: { ratingBonuses: { potency: 1 } },
        },
        sellValueBase: 16,
        sellValuePerTier: 7,
        sellValuePerRank: 4,
    },
    {
        id: "whetstone-token",
        slot: "charm",
        name: "Whetstone Token",
        description: "A simple token that rewards direct damage builds.",
        affinityTags: ["warrior", "offense", "universal"],
        scaling: {
            base: { ratingBonuses: { power: 3, crit: 2 } },
            perTier: { ratingBonuses: { power: 1 } },
            perRank: { ratingBonuses: { power: 1, crit: 1 } },
        },
        sellValueBase: 16,
        sellValuePerTier: 7,
        sellValuePerRank: 4,
    },
    {
        id: "ward-icon",
        slot: "charm",
        name: "Ward Icon",
        description: "An icon that balances physical and magical staying power.",
        affinityTags: ["defense", "support", "universal"],
        scaling: {
            base: { ratingBonuses: { guard: 2, resolve: 3 } },
            perTier: { ratingBonuses: { guard: 1, resolve: 1 } },
            perRank: { ratingBonuses: { resolve: 1 } },
        },
        sellValueBase: 16,
        sellValuePerTier: 7,
        sellValuePerRank: 4,
    },
    {
        id: "duelist-loop",
        slot: "trinket",
        name: "Duelist Loop",
        description: "A nimble ring that turns clean hits into sharper bursts.",
        affinityTags: ["archer", "crit", "universal"],
        scaling: {
            base: { ratingBonuses: { crit: 4, precision: 1 } },
            perTier: { ratingBonuses: { crit: 1, precision: 1 } },
            perRank: { ratingBonuses: { crit: 1 } },
        },
        sellValueBase: 14,
        sellValuePerTier: 6,
        sellValuePerRank: 4,
    },
    {
        id: "timeworn-hourglass",
        slot: "trinket",
        name: "Timeworn Hourglass",
        description: "A relic that keeps action tempo high.",
        affinityTags: ["tempo", "universal"],
        scaling: {
            base: { ratingBonuses: { haste: 4 } },
            perTier: { ratingBonuses: { haste: 1 } },
            perRank: { ratingBonuses: { haste: 1 } },
        },
        sellValueBase: 14,
        sellValuePerTier: 6,
        sellValuePerRank: 4,
    },
    {
        id: "iron-prayer-bead",
        slot: "trinket",
        name: "Iron Prayer Bead",
        description: "A sturdy bead that reinforces resolve and status pressure.",
        affinityTags: ["cleric", "resolve", "universal"],
        scaling: {
            base: {
                ratingBonuses: { resolve: 2, potency: 2 },
                maxResourceFlatBonus: 10,
            },
            perTier: {
                ratingBonuses: { resolve: 1, potency: 1 },
                maxResourceFlatBonus: 2,
            },
            perRank: {
                ratingBonuses: { resolve: 1 },
                maxResourceFlatBonus: 1,
            },
        },
        sellValueBase: 14,
        sellValuePerTier: 6,
        sellValuePerRank: 4,
    },
];

const EQUIPMENT_LOOKUP = new Map(EQUIPMENT_DEFINITIONS.map((item) => [item.id, item]));
const equipmentOwnerCache = new WeakMap<Record<string, string[]>, Map<string, string>>();

export const getDefaultEquipmentInventoryItemIds = () => EQUIPMENT_DEFINITIONS.map((item) => item.id);

export const getEquipmentDefinition = (definitionId: string) => EQUIPMENT_LOOKUP.get(definitionId) ?? null;

export const getEquipmentSellValue = (definition: EquipmentItemDefinition, tier: number, rank: number) =>
    definition.sellValueBase + ((tier - 1) * definition.sellValuePerTier) + ((rank - 1) * definition.sellValuePerRank);

export const resolveEquipmentItemEffects = (definition: EquipmentItemDefinition, tier: number, rank: number) =>
    getMergedEffects(
        definition.scaling.base,
        scaleBuildEffects(definition.scaling.perTier, tier - 1),
        scaleBuildEffects(definition.scaling.perRank, rank - 1),
    );

export const createEquipmentItemInstance = (
    definitionId: string,
    options?: {
        tier?: number;
        rank?: number;
        instanceId?: string;
        sequence?: number;
    },
): EquipmentItemInstance | null => {
    const definition = getEquipmentDefinition(definitionId);
    if (!definition) {
        return null;
    }

    const tier = Math.max(1, options?.tier ?? 1);
    const rank = Math.max(1, options?.rank ?? 1);
    const sequence = Math.max(1, options?.sequence ?? 1);

    return {
        instanceId: options?.instanceId ?? `equipment_${sequence}`,
        definitionId,
        slot: definition.slot,
        tier,
        rank,
        sellValue: getEquipmentSellValue(definition, tier, rank),
        affinityTags: [...definition.affinityTags],
    };
};

export const createEquipmentInstancesFromDefinitionIds = (definitionIds: string[], prefix: string) =>
    definitionIds
        .map((definitionId, index) =>
            createEquipmentItemInstance(definitionId, {
                instanceId: `${prefix}-${index + 1}`,
                sequence: index + 1,
            }),
        )
        .filter((item): item is EquipmentItemInstance => Boolean(item));

export const resolveEquipmentItem = (item: EquipmentItemInstance): ResolvedEquipmentItem | null => {
    const definition = getEquipmentDefinition(item.definitionId);
    if (!definition) {
        return null;
    }

    return {
        ...item,
        id: item.instanceId,
        name: definition.name,
        description: definition.description,
        heroClasses: definition.heroClasses,
        effects: resolveEquipmentItemEffects(definition, item.tier, item.rank),
    };
};

export const canHeroEquipItem = (
    heroClass: HeroClass,
    item: Pick<EquipmentItemDefinition, "heroClasses"> | Pick<ResolvedEquipmentItem, "heroClasses">,
) => !item.heroClasses || item.heroClasses.includes(heroClass);

export const getEquipmentInstance = (itemId: string, equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItems.find((item) => item.instanceId === itemId) ?? null;

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
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return [];
    }
    const heroClass = hero.class;

    return getHeroEquippedItemIds(hero.id, equipmentProgression)
        .map((itemId) => getEquipmentInstance(itemId, equipmentProgression))
        .filter((item): item is EquipmentItemInstance => Boolean(item))
        .map((item) => resolveEquipmentItem(item))
        .filter((item): item is ResolvedEquipmentItem => Boolean(item && canHeroEquipItem(heroClass, item)));
};

export const getEquippedItemForSlot = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
    slot: EquipmentSlot,
) => {
    return getHeroEquippedItems(hero, equipmentProgression).find((item) => item.slot === slot) ?? null;
};

export const getInventoryItems = (equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItems
        .map((item) => resolveEquipmentItem(item))
        .filter((item): item is ResolvedEquipmentItem => Boolean(item));

export const getUnequippedInventoryItems = (
    equipmentProgression: EquipmentProgressionState,
    hero?: Pick<Entity, "class" | "isEnemy">,
) => {
    const items = getInventoryItems(equipmentProgression).filter((item) => !getEquipmentOwnerId(item.id, equipmentProgression));
    if (!hero || hero.isEnemy || !isPlayableHeroClass(hero.class)) {
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
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
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
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
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
