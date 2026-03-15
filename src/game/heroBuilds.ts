import type { HeroCombatRating } from "./classTemplates";
import type { Entity, HeroClass } from "./entity";
import type { EquipmentItemInstance, EquipmentProgressionState, TalentProgressionState } from "./store/types";

export type EquipmentSlot = "weapon" | "armor" | "charm" | "trinket";

export interface HeroBuildEffects {
    ratingBonuses?: Partial<Record<HeroCombatRating, number>>;
    specialAttackCostDelta?: number;
    specialAttackDamageMultiplierBonus?: number;
    specialAttackCritChanceBonus?: number;
    healMultiplierBonus?: number;
    blessRegenMultiplierBonus?: number;
    resourceOnResolvedAttackBonus?: number;
    resourceOnTakeDamageBonus?: number;
    maxResourceFlatBonus?: number;
}

interface EquipmentScalingDefinition {
    base: HeroBuildEffects;
    perTier?: HeroBuildEffects;
    perRank?: HeroBuildEffects;
}

export interface ClassPassiveDefinition {
    id: string;
    heroClass: HeroClass;
    name: string;
    description: string;
    effects: HeroBuildEffects;
}

export interface TalentDefinition {
    id: string;
    heroClass: HeroClass;
    name: string;
    description: string;
    effects: HeroBuildEffects;
}

export interface EquipmentItemDefinition {
    id: string;
    slot: EquipmentSlot;
    name: string;
    description: string;
    heroClasses?: HeroClass[];
    affinityTags: string[];
    scaling: EquipmentScalingDefinition;
    sellValueBase: number;
    sellValuePerTier: number;
    sellValuePerRank: number;
}

export interface ResolvedEquipmentItem extends EquipmentItemInstance {
    id: string;
    name: string;
    description: string;
    heroClasses?: HeroClass[];
    effects: HeroBuildEffects;
}

export interface HeroBuildState {
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
}

export interface HeroBuildProfile {
    passive: ClassPassiveDefinition | null;
    talents: TalentDefinition[];
    equippedItems: ResolvedEquipmentItem[];
    effects: Required<Omit<HeroBuildEffects, "ratingBonuses">> & {
        ratingBonuses: Partial<Record<HeroCombatRating, number>>;
    };
}

const EMPTY_RATING_BONUSES: Partial<Record<HeroCombatRating, number>> = {};
const HERO_RATING_KEYS: HeroCombatRating[] = ["power", "spellPower", "precision", "haste", "guard", "resolve", "potency", "crit"];
const BUILD_EFFECT_KEYS: Array<keyof Omit<HeroBuildEffects, "ratingBonuses">> = [
    "specialAttackCostDelta",
    "specialAttackDamageMultiplierBonus",
    "specialAttackCritChanceBonus",
    "healMultiplierBonus",
    "blessRegenMultiplierBonus",
    "resourceOnResolvedAttackBonus",
    "resourceOnTakeDamageBonus",
    "maxResourceFlatBonus",
];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
    weapon: "Weapon",
    armor: "Armor",
    charm: "Charm",
    trinket: "Trinket",
};

export const CLASS_PASSIVES: Record<HeroClass, ClassPassiveDefinition> = {
    Warrior: {
        id: "warrior-battle-rhythm",
        heroClass: "Warrior",
        name: "Battle Rhythm",
        description: "Frontline grit sharpens defense and adds extra Rage whenever attacks resolve.",
        effects: {
            ratingBonuses: { guard: 3, power: 2 },
            resourceOnResolvedAttackBonus: 2,
        },
    },
    Cleric: {
        id: "cleric-sanctified-reserves",
        heroClass: "Cleric",
        name: "Sanctified Reserves",
        description: "Sacred discipline strengthens resolve and improves Bless's regeneration support.",
        effects: {
            ratingBonuses: { resolve: 3, spellPower: 2 },
            blessRegenMultiplierBonus: 0.05,
        },
    },
    Archer: {
        id: "archer-keen-eye",
        heroClass: "Archer",
        name: "Keen Eye",
        description: "A practiced eye boosts precision and adds extra crit pressure to burst shots.",
        effects: {
            ratingBonuses: { precision: 3, crit: 2 },
            specialAttackCritChanceBonus: 0.05,
        },
    },
};

export const TALENT_DEFINITIONS: TalentDefinition[] = [
    {
        id: "warrior-unyielding",
        heroClass: "Warrior",
        name: "Unyielding",
        description: "Fortify the frontline with heavier guard and steadier resolve.",
        effects: {
            ratingBonuses: { guard: 4, resolve: 2 },
        },
    },
    {
        id: "warrior-rampage",
        heroClass: "Warrior",
        name: "Rampage",
        description: "Rage Strike becomes cheaper and lands with a fiercer follow-through.",
        effects: {
            specialAttackCostDelta: -5,
            specialAttackDamageMultiplierBonus: 0.35,
        },
    },
    {
        id: "cleric-sunfire",
        heroClass: "Cleric",
        name: "Sunfire",
        description: "Lean harder into radiant pressure with stronger spell output and potency.",
        effects: {
            ratingBonuses: { spellPower: 4, potency: 3 },
        },
    },
    {
        id: "cleric-shepherd",
        heroClass: "Cleric",
        name: "Shepherd",
        description: "Improve triage healing and reinforce Bless's regen package.",
        effects: {
            healMultiplierBonus: 0.35,
            blessRegenMultiplierBonus: 0.05,
        },
    },
    {
        id: "archer-deadeye",
        heroClass: "Archer",
        name: "Deadeye",
        description: "Trade discipline for deadlier crit pressure and cleaner shots.",
        effects: {
            ratingBonuses: { precision: 4, crit: 4 },
        },
    },
    {
        id: "archer-quickdraw",
        heroClass: "Archer",
        name: "Quickdraw",
        description: "Accelerate ranged tempo and make Piercing Shot hit harder.",
        effects: {
            ratingBonuses: { haste: 3 },
            specialAttackDamageMultiplierBonus: 0.2,
        },
    },
];

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

const TALENT_LOOKUP = new Map(TALENT_DEFINITIONS.map((talent) => [talent.id, talent]));
const EQUIPMENT_LOOKUP = new Map(EQUIPMENT_DEFINITIONS.map((item) => [item.id, item]));
const isPlayableHeroClass = (heroClass: Entity["class"]): heroClass is HeroClass => heroClass !== "Monster";

export const getDefaultEquipmentInventoryItemIds = () => EQUIPMENT_DEFINITIONS.map((item) => item.id);

const createEmptyEffects = (): HeroBuildProfile["effects"] => ({
    ratingBonuses: {},
    specialAttackCostDelta: 0,
    specialAttackDamageMultiplierBonus: 0,
    specialAttackCritChanceBonus: 0,
    healMultiplierBonus: 0,
    blessRegenMultiplierBonus: 0,
    resourceOnResolvedAttackBonus: 0,
    resourceOnTakeDamageBonus: 0,
    maxResourceFlatBonus: 0,
});

const mergeEffects = (accumulator: HeroBuildProfile["effects"], effects: HeroBuildEffects) => {
    if (effects.ratingBonuses) {
        HERO_RATING_KEYS.forEach((ratingKey) => {
            const bonus = effects.ratingBonuses?.[ratingKey] ?? 0;
            if (bonus !== 0) {
                accumulator.ratingBonuses[ratingKey] = (accumulator.ratingBonuses[ratingKey] ?? 0) + bonus;
            }
        });
    }

    BUILD_EFFECT_KEYS.forEach((effectKey) => {
        accumulator[effectKey] += effects[effectKey] ?? 0;
    });
};

const scaleBuildEffects = (effects: HeroBuildEffects | undefined, multiplier: number): HeroBuildEffects => {
    if (!effects || multiplier <= 0) {
        return {};
    }

    const scaled: HeroBuildEffects = {};

    if (effects.ratingBonuses) {
        scaled.ratingBonuses = Object.fromEntries(
            Object.entries(effects.ratingBonuses).map(([rating, value]) => [rating, (value ?? 0) * multiplier]),
        ) as HeroBuildEffects["ratingBonuses"];
    }

    BUILD_EFFECT_KEYS.forEach((effectKey) => {
        const value = effects[effectKey];
        if (value) {
            scaled[effectKey] = value * multiplier;
        }
    });

    return scaled;
};

const getMergedEffects = (...effectsList: HeroBuildEffects[]): HeroBuildEffects => {
    const merged = createEmptyEffects();
    effectsList.forEach((effects) => mergeEffects(merged, effects));
    return merged;
};

export const getClassPassive = (heroClass: HeroClass) => CLASS_PASSIVES[heroClass];

export const getTalentDefinition = (talentId: string) => TALENT_LOOKUP.get(talentId) ?? null;

export const getTalentDefinitionsForClass = (heroClass: HeroClass) =>
    TALENT_DEFINITIONS.filter((talent) => talent.heroClass === heroClass);

export const getEquipmentDefinition = (definitionId: string) => EQUIPMENT_LOOKUP.get(definitionId) ?? null;

export const getEquipmentItem = getEquipmentDefinition;

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
    return Object.entries(equipmentProgression.equippedItemInstanceIdsByHeroId).find(([, itemIds]) => itemIds.includes(itemId))?.[0] ?? null;
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

export const getTalentPointsForHero = (heroId: string, talentProgression: TalentProgressionState) =>
    talentProgression.talentPointsByHeroId[heroId] ?? 0;

export const getHeroUnlockedTalentIds = (heroId: string, talentProgression: TalentProgressionState) =>
    talentProgression.unlockedTalentIdsByHeroId[heroId] ?? [];

export const getHeroUnlockedTalents = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    talentProgression: TalentProgressionState,
) => {
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return [];
    }
    const heroClass = hero.class;

    return getHeroUnlockedTalentIds(hero.id, talentProgression)
        .map((talentId) => getTalentDefinition(talentId))
        .filter((talent): talent is TalentDefinition => Boolean(talent && talent.heroClass === heroClass));
};

export const getEarnedTalentPointTotal = (heroClass: HeroClass, level: number) =>
    Math.min(getTalentDefinitionsForClass(heroClass).length, Math.floor(level / 2));

export const getHeroBuildProfile = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    buildState?: HeroBuildState,
): HeroBuildProfile => {
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return {
            passive: null,
            talents: [],
            equippedItems: [],
            effects: createEmptyEffects(),
        };
    }
    const heroClass = hero.class;

    const passive = getClassPassive(heroClass);
    const talents = buildState ? getHeroUnlockedTalents(hero, buildState.talentProgression) : [];
    const equippedItems = buildState ? getHeroEquippedItems(hero, buildState.equipmentProgression) : [];
    const effects = createEmptyEffects();

    mergeEffects(effects, passive.effects);
    talents.forEach((talent) => mergeEffects(effects, talent.effects));
    equippedItems.forEach((item) => mergeEffects(effects, item.effects));

    return {
        passive,
        talents,
        equippedItems,
        effects,
    };
};

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
    const nextUnlocked: Record<string, string[]> = {};
    const nextPoints: Record<string, number> = {};

    party.forEach((hero) => {
        if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
            return;
        }

        const heroClass = hero.class;
        const availableTalentIds = new Set(getTalentDefinitionsForClass(heroClass).map((talent) => talent.id));
        const validUnlockedIds = dedupeStrings(getHeroUnlockedTalentIds(hero.id, talentProgression))
            .filter((talentId) => availableTalentIds.has(talentId));
        const minimumRemainingPoints = Math.max(0, getEarnedTalentPointTotal(heroClass, hero.level) - validUnlockedIds.length);
        const existingPoints = getTalentPointsForHero(hero.id, talentProgression);

        nextUnlocked[hero.id] = validUnlockedIds;
        nextPoints[hero.id] = Math.max(existingPoints, minimumRemainingPoints);
    });

    return {
        unlockedTalentIdsByHeroId: nextUnlocked,
        talentPointsByHeroId: nextPoints,
    };
};

export const synchronizeEquipmentProgression = (
    party: Array<Pick<Entity, "id" | "class" | "isEnemy">>,
    equipmentProgression: EquipmentProgressionState,
): EquipmentProgressionState => {
    const inventoryItems = dedupeInventoryItems(equipmentProgression.inventoryItems);
    const inventoryItemIdSet = new Set(inventoryItems.map((item) => item.instanceId));
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
            if (!inventoryItemIdSet.has(itemId) || claimedItemIds.has(itemId)) {
                return false;
            }

            const instance = inventoryItems.find((item) => item.instanceId === itemId);
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

export const getRatingBonusValue = (
    effects: HeroBuildEffects | HeroBuildProfile["effects"],
    rating: HeroCombatRating,
) => {
    return effects.ratingBonuses?.[rating] ?? 0;
};

export const hasAnyRatingBonuses = (ratingBonuses: Partial<Record<HeroCombatRating, number>> = EMPTY_RATING_BONUSES) =>
    HERO_RATING_KEYS.some((rating) => (ratingBonuses[rating] ?? 0) !== 0);
