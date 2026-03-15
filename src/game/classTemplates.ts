import type { Attributes, DamageElement, EntityClass, HeroClass } from "./entity";

export type HeroCombatRating =
    | "power"
    | "spellPower"
    | "precision"
    | "haste"
    | "guard"
    | "resolve"
    | "potency"
    | "crit";

export type HeroActionPackageId = "warrior" | "cleric" | "archer";
export type ResourceRegenKind = "none" | "flat" | "attribute";
export type CombatDamageStat = "physicalDamage" | "magicDamage";
export type CombatDeliveryType = "melee" | "ranged" | "spell";

export interface HeroResourceModel {
    id: "rage" | "mana" | "cunning";
    displayName: string;
    barColorClass: string;
    startsFull: boolean;
    maxBase: number;
    maxPerInt: number;
    regenKind: ResourceRegenKind;
    regenFlat: number;
    regenAttribute?: keyof Attributes;
    regenAttributeMultiplier?: number;
    gainOnResolvedAttack: number;
    gainOnTakeDamage: number;
}

export interface HeroBasicActionDefinition {
    name: string;
    damageStat: CombatDamageStat;
    damageElement: DamageElement;
    deliveryType: CombatDeliveryType;
    canParry: boolean;
}

export interface HeroSpecialAttackDefinition {
    name: string;
    cost: number;
    damageMultiplier: number;
    critChanceBonus?: number;
    canParry: boolean;
}

export interface HeroHealSupportDefinition {
    name: string;
    cost: number;
    hpThreshold: number;
    healMultiplier: number;
}

export interface HeroBlessSupportDefinition {
    name: string;
    cost: number;
    regenMultiplier: number;
}

export interface HeroActionPackageDefinition {
    id: HeroActionPackageId;
    passiveHooks: string[];
    specialAttack?: HeroSpecialAttackDefinition;
    heal?: HeroHealSupportDefinition;
    bless?: HeroBlessSupportDefinition;
}

export interface HeroCombatProfile {
    physicalDamageSourceAttribute: "str" | "dex";
    physicalDamageSourceMultiplier: number;
    critMultiplier: number;
    basicAction: HeroBasicActionDefinition;
    baselineRatings: HeroCombatRating[];
}

export interface HeroClassTemplate {
    id: HeroClass;
    displayName: string;
    description: string;
    imageAsset: string;
    namePool: string[];
    baseAttributes: Attributes;
    growth: Attributes;
    resourceModel: HeroResourceModel;
    combatProfile: HeroCombatProfile;
    actionPackage: HeroActionPackageDefinition;
}

export const HERO_CLASS_TEMPLATES: Record<HeroClass, HeroClassTemplate> = {
    Warrior: {
        id: "Warrior",
        displayName: "Warrior",
        description: "High HP, builds Rage into crushing weapon skills.",
        imageAsset: "assets/hero_warrior.png",
        namePool: ["Brom", "Tarin", "Mira", "Hale", "Sable"],
        baseAttributes: { vit: 10, str: 10, dex: 5, int: 3, wis: 3 },
        growth: { vit: 2, str: 2, dex: 1, int: 1, wis: 1 },
        resourceModel: {
            id: "rage",
            displayName: "Rage",
            barColorClass: "bg-red-500",
            startsFull: false,
            maxBase: 100,
            maxPerInt: 0,
            regenKind: "none",
            regenFlat: 0,
            gainOnResolvedAttack: 8,
            gainOnTakeDamage: 5,
        },
        combatProfile: {
            physicalDamageSourceAttribute: "str",
            physicalDamageSourceMultiplier: 1.5,
            critMultiplier: 1.5,
            basicAction: {
                name: "Attack",
                damageStat: "physicalDamage",
                damageElement: "physical",
                deliveryType: "melee",
                canParry: true,
            },
            baselineRatings: ["guard", "power"],
        },
        actionPackage: {
            id: "warrior",
            passiveHooks: ["resource-on-resolved-attack", "resource-on-take-damage"],
            specialAttack: {
                name: "Rage Strike",
                cost: 40,
                damageMultiplier: 2,
                canParry: false,
            },
        },
    },
    Cleric: {
        id: "Cleric",
        displayName: "Cleric",
        description: "Uses Mana to smite enemies and heal injured allies.",
        imageAsset: "assets/hero_cleric.png",
        namePool: ["Lyra", "Seren", "Ione", "Thess", "Aster"],
        baseAttributes: { vit: 7, str: 4, dex: 4, int: 8, wis: 10 },
        growth: { vit: 1, str: 1, dex: 1, int: 2, wis: 2 },
        resourceModel: {
            id: "mana",
            displayName: "Mana",
            barColorClass: "bg-blue-500",
            startsFull: true,
            maxBase: 50,
            maxPerInt: 5,
            regenKind: "attribute",
            regenFlat: 0,
            regenAttribute: "wis",
            regenAttributeMultiplier: 0.5,
            gainOnResolvedAttack: 0,
            gainOnTakeDamage: 0,
        },
        combatProfile: {
            physicalDamageSourceAttribute: "str",
            physicalDamageSourceMultiplier: 1.5,
            critMultiplier: 1.5,
            basicAction: {
                name: "Smite",
                damageStat: "magicDamage",
                damageElement: "light",
                deliveryType: "spell",
                canParry: false,
            },
            baselineRatings: ["spellPower", "resolve"],
        },
        actionPackage: {
            id: "cleric",
            passiveHooks: ["support-priority", "cleanse-on-bless"],
            heal: {
                name: "Mend",
                cost: 35,
                hpThreshold: 0.65,
                healMultiplier: 1.75,
            },
            bless: {
                name: "Bless",
                cost: 25,
                regenMultiplier: 0.15,
            },
        },
    },
    Archer: {
        id: "Archer",
        displayName: "Archer",
        description: "Uses Cunning for precision shots and lethal crits.",
        imageAsset: "assets/hero_archer.png",
        namePool: ["Kestrel", "Nyx", "Corin", "Vera", "Pike"],
        baseAttributes: { vit: 6, str: 5, dex: 12, int: 4, wis: 4 },
        growth: { vit: 1, str: 1, dex: 2, int: 1, wis: 1 },
        resourceModel: {
            id: "cunning",
            displayName: "Cunning",
            barColorClass: "bg-yellow-500",
            startsFull: true,
            maxBase: 50,
            maxPerInt: 5,
            regenKind: "flat",
            regenFlat: 0.75,
            gainOnResolvedAttack: 0,
            gainOnTakeDamage: 0,
        },
        combatProfile: {
            physicalDamageSourceAttribute: "dex",
            physicalDamageSourceMultiplier: 1.5,
            critMultiplier: 2,
            basicAction: {
                name: "Attack",
                damageStat: "physicalDamage",
                damageElement: "physical",
                deliveryType: "ranged",
                canParry: false,
            },
            baselineRatings: ["precision", "haste", "crit"],
        },
        actionPackage: {
            id: "archer",
            passiveHooks: ["precision-burst"],
            specialAttack: {
                name: "Piercing Shot",
                cost: 35,
                damageMultiplier: 1.6,
                critChanceBonus: 0.15,
                canParry: false,
            },
        },
    },
};

export const HERO_CLASSES: HeroClass[] = ["Warrior", "Cleric", "Archer"];

export const getHeroClassTemplate = (heroClass: HeroClass | EntityClass): HeroClassTemplate => {
    if (heroClass === "Monster") {
        throw new Error("Monster does not have a hero class template.");
    }

    return HERO_CLASS_TEMPLATES[heroClass];
};
