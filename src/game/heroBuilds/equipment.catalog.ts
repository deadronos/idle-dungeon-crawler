import {
    getMergedEffects,
    scaleBuildEffects,
    type EquipmentItemDefinition,
} from "./shared";

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
