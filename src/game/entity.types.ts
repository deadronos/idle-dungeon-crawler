import Decimal from "decimal.js";

import type { HeroCombatRating } from "./classTemplates";

export type EntityClass = "Warrior" | "Cleric" | "Archer" | "Monster";
export type HeroClass = Exclude<EntityClass, "Monster">;
export type DamageElement = "physical" | keyof Elements;
export type EnemyElement = Exclude<DamageElement, "physical">;
export type EnemyArchetype = "Bruiser" | "Skirmisher" | "Caster" | "Support" | "Boss";
export type StatusEffectKey = "burn" | "slow" | "weaken" | "regen" | "hex" | "blind";
export type StatusEffectPolarity = "buff" | "debuff";

export interface MetaUpgrades {
    training: number;
    fortification: number;
}

export interface PrestigeUpgrades {
    costReducer: number;
    hpMultiplier: number;
    gameSpeed: number;
    xpMultiplier?: number;
}

export interface Attributes {
    vit: number;
    str: number;
    dex: number;
    int: number;
    wis: number;
}

export interface Elements {
    fire: number;
    water: number;
    earth: number;
    air: number;
    light: number;
    shadow: number;
}

export interface StatusEffect {
    key: StatusEffectKey;
    polarity: StatusEffectPolarity;
    sourceId: string;
    remainingTicks: number;
    stacks: number;
    maxStacks: number;
    potency: number;
}

export interface Entity {
    id: string;
    name: string;
    class: EntityClass;
    image: string;
    isEnemy: boolean;
    enemyArchetype?: EnemyArchetype;
    enemyElement?: EnemyElement | null;
    level: number;
    exp: Decimal;
    expToNext: Decimal;
    attributes: Attributes;
    maxHp: Decimal;
    currentHp: Decimal;
    maxResource: Decimal;
    currentResource: Decimal;
    armor: Decimal;
    physicalDamage: Decimal;
    magicDamage: Decimal;
    critChance: number;
    critDamage: number;
    accuracyRating: number;
    evasionRating: number;
    parryRating: number;
    armorPenetration: number;
    elementalPenetration: number;
    tenacity: number;
    resistances: Elements;
    actionProgress: number;
    activeSkill: string | null;
    activeSkillTicks: number;
    guardStacks: number;
    statusEffects: StatusEffect[];
}

export interface CreateEnemyOptions {
    archetype?: EnemyArchetype;
    boss?: boolean;
    element?: EnemyElement;
}

export type CombatRatings = Record<HeroCombatRating, number>;

export const BASE_META_UPGRADES: MetaUpgrades = {
    training: 0,
    fortification: 0,
};
export const BOSS_VITALITY_MULTIPLIER = 2;
export const BOSS_STRENGTH_MULTIPLIER = 1.3;
export const ENEMY_ELEMENTS: EnemyElement[] = ["fire", "water", "earth", "air", "light", "shadow"];
