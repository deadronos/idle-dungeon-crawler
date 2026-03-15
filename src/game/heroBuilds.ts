import type { HeroCombatRating } from "./classTemplates";
import type { Entity, HeroClass } from "./entity";
import type { EquipmentProgressionState, TalentProgressionState } from "./store/types";

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
    effects: HeroBuildEffects;
}

export interface HeroBuildState {
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
}

export interface HeroBuildProfile {
    passive: ClassPassiveDefinition | null;
    talents: TalentDefinition[];
    equippedItems: EquipmentItemDefinition[];
    effects: Required<Omit<HeroBuildEffects, "ratingBonuses">> & {
        ratingBonuses: Partial<Record<HeroCombatRating, number>>;
    };
}

const EMPTY_RATING_BONUSES: Partial<Record<HeroCombatRating, number>> = {};
const HERO_RATING_KEYS: HeroCombatRating[] = ["power", "spellPower", "precision", "haste", "guard", "resolve", "potency", "crit"];

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

export const EQUIPMENT_ITEMS: EquipmentItemDefinition[] = [
    {
        id: "greatblade-of-embers",
        slot: "weapon",
        name: "Greatblade of Embers",
        description: "Warrior-only greatblade tuned for relentless frontline pressure.",
        heroClasses: ["Warrior"],
        effects: {
            ratingBonuses: { power: 5, guard: 2 },
        },
    },
    {
        id: "sunlit-censer",
        slot: "weapon",
        name: "Sunlit Censer",
        description: "Cleric-only holy focus that steadies spells and support.",
        heroClasses: ["Cleric"],
        effects: {
            ratingBonuses: { spellPower: 5, resolve: 2 },
        },
    },
    {
        id: "hawkstring-bow",
        slot: "weapon",
        name: "Hawkstring Bow",
        description: "Archer-only bow that sharpens ranged accuracy and crits.",
        heroClasses: ["Archer"],
        effects: {
            ratingBonuses: { precision: 5, crit: 3 },
        },
    },
    {
        id: "bastion-plate",
        slot: "armor",
        name: "Bastion Plate",
        description: "Heavy armor for heroes who want sturdier physical defenses.",
        effects: {
            ratingBonuses: { guard: 5, resolve: 1 },
        },
    },
    {
        id: "pilgrim-vestments",
        slot: "armor",
        name: "Pilgrim Vestments",
        description: "Light ceremonial robes with magical staying power.",
        effects: {
            ratingBonuses: { resolve: 4, spellPower: 2 },
        },
    },
    {
        id: "shadowhide-leathers",
        slot: "armor",
        name: "Shadowhide Leathers",
        description: "Flexible leathers that favor action speed and shot setup.",
        effects: {
            ratingBonuses: { haste: 4, precision: 2 },
        },
    },
    {
        id: "ember-charm",
        slot: "charm",
        name: "Ember Charm",
        description: "A charm for heroes who want extra elemental pressure.",
        effects: {
            ratingBonuses: { potency: 4, spellPower: 2 },
        },
    },
    {
        id: "whetstone-token",
        slot: "charm",
        name: "Whetstone Token",
        description: "A simple token that rewards direct damage builds.",
        effects: {
            ratingBonuses: { power: 3, crit: 2 },
        },
    },
    {
        id: "ward-icon",
        slot: "charm",
        name: "Ward Icon",
        description: "An icon that balances physical and magical staying power.",
        effects: {
            ratingBonuses: { guard: 2, resolve: 3 },
        },
    },
    {
        id: "duelist-loop",
        slot: "trinket",
        name: "Duelist Loop",
        description: "A nimble ring that turns clean hits into sharper bursts.",
        effects: {
            ratingBonuses: { crit: 4, precision: 1 },
        },
    },
    {
        id: "timeworn-hourglass",
        slot: "trinket",
        name: "Timeworn Hourglass",
        description: "A relic that keeps action tempo high.",
        effects: {
            ratingBonuses: { haste: 4 },
        },
    },
    {
        id: "iron-prayer-bead",
        slot: "trinket",
        name: "Iron Prayer Bead",
        description: "A sturdy bead that reinforces resolve and status pressure.",
        effects: {
            ratingBonuses: { resolve: 2, potency: 2 },
            maxResourceFlatBonus: 10,
        },
    },
];

const TALENT_LOOKUP = new Map(TALENT_DEFINITIONS.map((talent) => [talent.id, talent]));
const EQUIPMENT_LOOKUP = new Map(EQUIPMENT_ITEMS.map((item) => [item.id, item]));
const isPlayableHeroClass = (heroClass: Entity["class"]): heroClass is HeroClass => heroClass !== "Monster";

export const getDefaultEquipmentInventoryItemIds = () => EQUIPMENT_ITEMS.map((item) => item.id);

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

    accumulator.specialAttackCostDelta += effects.specialAttackCostDelta ?? 0;
    accumulator.specialAttackDamageMultiplierBonus += effects.specialAttackDamageMultiplierBonus ?? 0;
    accumulator.specialAttackCritChanceBonus += effects.specialAttackCritChanceBonus ?? 0;
    accumulator.healMultiplierBonus += effects.healMultiplierBonus ?? 0;
    accumulator.blessRegenMultiplierBonus += effects.blessRegenMultiplierBonus ?? 0;
    accumulator.resourceOnResolvedAttackBonus += effects.resourceOnResolvedAttackBonus ?? 0;
    accumulator.resourceOnTakeDamageBonus += effects.resourceOnTakeDamageBonus ?? 0;
    accumulator.maxResourceFlatBonus += effects.maxResourceFlatBonus ?? 0;
};

export const getClassPassive = (heroClass: HeroClass) => CLASS_PASSIVES[heroClass];

export const getTalentDefinition = (talentId: string) => TALENT_LOOKUP.get(talentId) ?? null;

export const getTalentDefinitionsForClass = (heroClass: HeroClass) =>
    TALENT_DEFINITIONS.filter((talent) => talent.heroClass === heroClass);

export const getEquipmentItem = (itemId: string) => EQUIPMENT_LOOKUP.get(itemId) ?? null;

export const canHeroEquipItem = (heroClass: HeroClass, item: EquipmentItemDefinition) =>
    !item.heroClasses || item.heroClasses.includes(heroClass);

export const getEquipmentOwnerId = (itemId: string, equipmentProgression: EquipmentProgressionState) => {
    return Object.entries(equipmentProgression.equippedItemIdsByHeroId).find(([, itemIds]) => itemIds.includes(itemId))?.[0] ?? null;
};

export const getHeroEquippedItemIds = (heroId: string, equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.equippedItemIdsByHeroId[heroId] ?? [];

export const getHeroEquippedItems = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
) => {
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return [];
    }
    const heroClass = hero.class;

    return getHeroEquippedItemIds(hero.id, equipmentProgression)
        .map((itemId) => getEquipmentItem(itemId))
        .filter((item): item is EquipmentItemDefinition => Boolean(item && canHeroEquipItem(heroClass, item)));
};

export const getEquippedItemForSlot = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    equipmentProgression: EquipmentProgressionState,
    slot: EquipmentSlot,
) => {
    return getHeroEquippedItems(hero, equipmentProgression).find((item) => item.slot === slot) ?? null;
};

export const getInventoryItems = (equipmentProgression: EquipmentProgressionState) =>
    equipmentProgression.inventoryItemIds
        .map((itemId) => getEquipmentItem(itemId))
        .filter((item): item is EquipmentItemDefinition => Boolean(item));

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
    const nextInventoryItemIds = dedupeStrings(equipmentProgression.inventoryItemIds)
        .filter((itemId) => Boolean(getEquipmentItem(itemId)));
    const inventoryItemIds = nextInventoryItemIds.length > 0 ? nextInventoryItemIds : getDefaultEquipmentInventoryItemIds();
    const inventoryItemIdSet = new Set(inventoryItemIds);
    const claimedItemIds = new Set<string>();
    const nextEquipped: Record<string, string[]> = {};

    party.forEach((hero) => {
        if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
            return;
        }

        const heroClass = hero.class;
        const usedSlots = new Set<EquipmentSlot>();
        const rawItemIds = dedupeStrings(equipmentProgression.equippedItemIdsByHeroId[hero.id] ?? []);
        const validItemIds = rawItemIds.filter((itemId) => {
            if (!inventoryItemIdSet.has(itemId) || claimedItemIds.has(itemId)) {
                return false;
            }

            const item = getEquipmentItem(itemId);
            if (!item || !canHeroEquipItem(heroClass, item) || usedSlots.has(item.slot)) {
                return false;
            }

            usedSlots.add(item.slot);
            claimedItemIds.add(itemId);
            return true;
        });

        nextEquipped[hero.id] = validItemIds;
    });

    return {
        inventoryItemIds,
        equippedItemIdsByHeroId: nextEquipped,
    };
};

export const getSlotLockedReason = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    item: EquipmentItemDefinition,
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
