import Decimal from "decimal.js";

import { getHeroClassTemplate } from "./classTemplates";
import { getHeroBuildProfile, type HeroBuildState } from "./heroBuilds";
import { BASE_HERO_EXP_REQUIREMENT, HERO_EXP_GROWTH_RATE } from "./progressionMath";
import type { HeroCombatRating } from "./classTemplates";
export { HERO_CLASSES } from "./classTemplates";

// Basic Types
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
    vit: number; // Constitution/Vitality
    str: number; // Strength
    dex: number; // Dexterity
    int: number; // Intelligence
    wis: number; // Wisdom
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
    image: string; // Sprite path
    isEnemy: boolean;
    enemyArchetype?: EnemyArchetype;
    enemyElement?: EnemyElement | null;

    // Progression
    level: number;
    exp: Decimal;
    expToNext: Decimal;

    // Base Attributes
    attributes: Attributes;

    // Derived Stats
    maxHp: Decimal;
    currentHp: Decimal;

    maxResource: Decimal; // Mana, Rage, Cunning
    currentResource: Decimal;

    armor: Decimal;
    physicalDamage: Decimal;
    magicDamage: Decimal;

    critChance: number; // 0 to 1 (e.g. 0.05 = 5%)
    critDamage: number; // multiplier, e.g. 1.5

    accuracyRating: number;
    evasionRating: number;
    parryRating: number;
    armorPenetration: number;
    elementalPenetration: number;
    tenacity: number;

    resistances: Elements;

    // Combat State
    actionProgress: number; // 0 to 100
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

const OFFENSIVE_ENEMY_ARCHETYPES: Array<Exclude<EnemyArchetype, "Support" | "Boss">> = ["Bruiser", "Skirmisher", "Caster"];

const capitalizeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getStatusEffectName = (statusKey: StatusEffectKey) => {
    switch (statusKey) {
        case "burn":
            return "Burn";
        case "slow":
            return "Slow";
        case "weaken":
            return "Weaken";
        case "regen":
            return "Regen";
        case "hex":
            return "Hex";
        case "blind":
            return "Blind";
        default:
            return capitalizeLabel(statusKey);
    }
};

export const getStatusEffectBadge = (statusEffect: Pick<StatusEffect, "key" | "stacks">) => {
    switch (statusEffect.key) {
        case "burn":
            return statusEffect.stacks > 1 ? `BRN x${statusEffect.stacks}` : "BRN";
        case "slow":
            return "SLW";
        case "weaken":
            return "WKN";
        case "regen":
            return "RGN";
        case "hex":
            return "HEX";
        case "blind":
            return "BLD";
        default:
            return capitalizeLabel(statusEffect.key).slice(0, 3).toUpperCase();
    }
};

const applyEnemyArchetypeBias = (attributes: Attributes, archetype: EnemyArchetype): Attributes => {
    switch (archetype) {
        case "Bruiser":
            return {
                vit: attributes.vit * 1.45,
                str: attributes.str * 1.25,
                dex: attributes.dex * 0.75,
                int: attributes.int * 0.7,
                wis: attributes.wis * 0.85,
            };
        case "Skirmisher":
            return {
                vit: attributes.vit * 0.85,
                str: attributes.str * 0.9,
                dex: attributes.dex * 1.45,
                int: attributes.int * 0.8,
                wis: attributes.wis * 1.05,
            };
        case "Caster":
            return {
                vit: attributes.vit * 0.9,
                str: attributes.str * 0.65,
                dex: attributes.dex * 0.95,
                int: attributes.int * 1.45,
                wis: attributes.wis * 1.25,
            };
        case "Support":
            return {
                vit: attributes.vit,
                str: attributes.str * 0.65,
                dex: attributes.dex * 0.95,
                int: attributes.int * 1.25,
                wis: attributes.wis * 1.45,
            };
        case "Boss":
            return {
                vit: attributes.vit * 1.25,
                str: attributes.str * 1.15,
                dex: attributes.dex * 1.2,
                int: attributes.int * 1.2,
                wis: attributes.wis * 1.2,
            };
        default:
            return attributes;
    }
};

export const isBossArchetype = (archetype?: EnemyArchetype | null) => archetype === "Boss";

export const getEnemyArchetypePoolForFloor = (floor: number): EnemyArchetype[] => {
    if (floor % 10 === 0) {
        return ["Boss"];
    }

    if (floor >= 11) {
        return ["Bruiser", "Skirmisher", "Caster", "Support"];
    }

    if (floor >= 5) {
        return ["Bruiser", "Skirmisher", "Caster"];
    }

    return ["Bruiser", "Skirmisher"];
};

export const getEncounterArchetypes = (floor: number, encounterSize: number): EnemyArchetype[] => {
    if (floor % 10 === 0) {
        return ["Boss"];
    }

    const archetypes: EnemyArchetype[] = Array.from({ length: encounterSize }, (_, index) => {
        const offensivePool = floor >= 5 ? OFFENSIVE_ENEMY_ARCHETYPES : OFFENSIVE_ENEMY_ARCHETYPES.slice(0, 2);
        return offensivePool[(floor + index) % offensivePool.length];
    });

    if (floor >= 11 && encounterSize >= 2 && floor % 2 === 1) {
        archetypes[encounterSize - 1] = "Support";
    }

    return archetypes;
};

export const getEnemyElementForEncounter = (floor: number, encounterIndex = 0): EnemyElement => {
    return ENEMY_ELEMENTS[(floor + encounterIndex) % ENEMY_ELEMENTS.length];
};

export const getEnemyArchetypeLabel = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "enemyElement">) => {
    if (!entity.isEnemy || !entity.enemyArchetype) {
        return null;
    }

    if ((entity.enemyArchetype === "Caster" || entity.enemyArchetype === "Boss") && entity.enemyElement) {
        return `${capitalizeLabel(entity.enemyElement)} ${entity.enemyArchetype}`;
    }

    return entity.enemyArchetype;
};

export const inferEnemyArchetype = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "name">): EnemyArchetype | undefined => {
    if (!entity.isEnemy) {
        return undefined;
    }

    if (entity.enemyArchetype) {
        return entity.enemyArchetype;
    }

    if (entity.name.startsWith("Boss:")) {
        return "Boss";
    }

    return "Bruiser";
};

const getEnemyCombatRatingBiases = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "name">): Partial<CombatRatings> => {
    switch (inferEnemyArchetype(entity)) {
        case "Bruiser":
            return { power: 3, guard: 5 };
        case "Skirmisher":
            return { precision: 5, haste: 5, crit: 4 };
        case "Caster":
            return { spellPower: 5, resolve: 2, potency: 4 };
        case "Support":
            return { spellPower: 3, resolve: 5, potency: 3 };
        case "Boss":
            return { power: 4, spellPower: 4, precision: 3, haste: 3, guard: 4, resolve: 4, potency: 4, crit: 3 };
        default:
            return {};
    }
};

// Global Stat Multipliers
export const STAT_MULTS = {
    HP_PER_VIT: 10,
    ARMOR_PER_STR: 0.45,
    ARMOR_PER_VIT: 0.25,
    ARMOR_PER_GUARD: 0.4,
    PHYS_DMG_PER_POWER: 0.8,
    PHYS_DMG_PER_CRIT: 0.15,
    MAGIC_DMG_PER_SPELL_POWER: 0.75,
    MAGIC_DMG_PER_POTENCY: 0.15,
    RESOURCE_PER_INT: 5,
    CRIT_CHANCE_PER_RATING: 0.0055,
    RESIST_BASE: 0.02,
    RESIST_PER_RESOLVE: 0.008,
    ACCURACY_PER_PRECISION: 1.2,
    ACCURACY_PER_CRIT: 0.1,
    EVASION_PER_HASTE: 0.8,
    EVASION_PER_RESOLVE: 0.25,
    PARRY_PER_GUARD: 0.8,
    PARRY_PER_PRECISION: 0.2,
    ARMOR_PEN_PER_POWER: 0.5,
    ARMOR_PEN_PER_GUARD: 0.12,
    ELEMENTAL_PEN_PER_SPELL_POWER: 0.22,
    ELEMENTAL_PEN_PER_POTENCY: 0.4,
    ELEMENTAL_PEN_PER_PRECISION: 0.08,
    TENACITY_PER_RESOLVE: 0.65,
    TENACITY_PER_GUARD: 0.2,
};

export const isHeroClass = (entityClass: EntityClass): entityClass is HeroClass => entityClass !== "Monster";

const cloneAttributes = (attributes: Attributes): Attributes => ({ ...attributes });
const createEmptyCombatRatings = (): CombatRatings => ({
    power: 0,
    spellPower: 0,
    precision: 0,
    haste: 0,
    guard: 0,
    resolve: 0,
    potency: 0,
    crit: 0,
});

// Start Stats Helpers
export const getBaseAttributes = (entityClass: EntityClass): Attributes => {
    if (isHeroClass(entityClass)) {
        return cloneAttributes(getHeroClassTemplate(entityClass).baseAttributes);
    }

    return { vit: 5, str: 5, dex: 5, int: 5, wis: 5 };
};

export const getExpRequirement = (level: number): Decimal => {
    // First-region scaling: 100 * (1.26 ^ (level - 1))
    return new Decimal(BASE_HERO_EXP_REQUIREMENT).times(Decimal.pow(HERO_EXP_GROWTH_RATE, level - 1)).floor();
};

export const getCombatRatings = (
    entity: Pick<Entity, "id" | "class" | "isEnemy" | "attributes" | "enemyArchetype" | "name">,
    buildState?: HeroBuildState,
): CombatRatings => {
    const attrs = entity.attributes;
    const template = isHeroClass(entity.class) ? getHeroClassTemplate(entity.class) : null;
    const physicalSourceAttribute = template?.combatProfile.physicalDamageSourceAttribute ?? "str";
    const physicalSourceMultiplier = template?.combatProfile.physicalDamageSourceMultiplier ?? 1.5;
    const buildProfile = getHeroBuildProfile(entity, buildState);

    const ratings: CombatRatings = {
        power: (attrs[physicalSourceAttribute] * physicalSourceMultiplier * 0.8) + (attrs.str * 0.25) + (attrs.vit * 0.15),
        spellPower: (attrs.int * 1.25) + (attrs.wis * 0.55),
        precision: (attrs.dex * 0.6) + (attrs.int * 0.35) + (attrs.wis * 0.15),
        haste: (attrs.dex * 0.45) + (attrs.vit * 0.15) + (attrs.wis * 0.1),
        guard: (attrs.vit * 0.8) + (attrs.str * 0.55) + (attrs.dex * 0.1),
        resolve: (attrs.wis * 0.85) + (attrs.vit * 0.3) + (attrs.int * 0.35),
        potency: (attrs.int * 0.45) + (attrs.wis * 0.35) + (attrs.dex * 0.15),
        crit: (attrs.dex * 0.35) + (attrs.wis * 0.15) + (attrs.int * 0.1),
    };

    const biasSources: Array<Partial<CombatRatings>> = [
        template?.combatProfile.ratingBiases ?? createEmptyCombatRatings(),
        buildProfile.effects.ratingBonuses,
        entity.isEnemy ? getEnemyCombatRatingBiases(entity) : createEmptyCombatRatings(),
    ];

    biasSources.forEach((biases) => {
        (Object.keys(ratings) as HeroCombatRating[]).forEach((ratingKey) => {
            ratings[ratingKey] += biases[ratingKey] ?? 0;
        });
    });

    return ratings;
};

export const calculateDerivedStats = (entity: Entity, prestigeUpgrades?: PrestigeUpgrades, buildState?: HeroBuildState): Entity => {
    const attrs = entity.attributes;
    const template = isHeroClass(entity.class) ? getHeroClassTemplate(entity.class) : null;
    const buildProfile = getHeroBuildProfile(entity, buildState);
    const ratings = getCombatRatings(entity, buildState);

    // Base logic for HP
    // Vitality Prestige adds +1 HP per VIT point per level
    const hpPerVit = STAT_MULTS.HP_PER_VIT + (prestigeUpgrades?.hpMultiplier ?? 0);
    entity.maxHp = new Decimal(50).plus(attrs.vit * hpPerVit);
    if (entity.currentHp.gt(entity.maxHp)) entity.currentHp = entity.maxHp;

    entity.armor = new Decimal(attrs.str * STAT_MULTS.ARMOR_PER_STR)
        .plus(attrs.vit * STAT_MULTS.ARMOR_PER_VIT)
        .plus(ratings.guard * STAT_MULTS.ARMOR_PER_GUARD);
    entity.physicalDamage = new Decimal(10)
        .plus(ratings.power * STAT_MULTS.PHYS_DMG_PER_POWER)
        .plus(ratings.crit * STAT_MULTS.PHYS_DMG_PER_CRIT);
    entity.magicDamage = new Decimal(5)
        .plus(ratings.spellPower * STAT_MULTS.MAGIC_DMG_PER_SPELL_POWER)
        .plus(ratings.potency * STAT_MULTS.MAGIC_DMG_PER_POTENCY);

    // Resource (Mana/Cunning/Rage)
    const maxResourceBase = template?.resourceModel.maxBase ?? 100;
    const maxResourcePerInt = template?.resourceModel.maxPerInt ?? 0;
    entity.maxResource = new Decimal(maxResourceBase)
        .plus(attrs.int * maxResourcePerInt)
        .plus(buildProfile.effects.maxResourceFlatBonus);
    if (entity.currentResource.gt(entity.maxResource)) entity.currentResource = entity.maxResource;

    entity.critChance = Math.min(0.05 + (ratings.crit * STAT_MULTS.CRIT_CHANCE_PER_RATING), 1.0);
    entity.critDamage = (template?.combatProfile.critMultiplier ?? 1.5) + Math.min(0.2, ratings.crit * 0.01);

    entity.accuracyRating = 50
        + (ratings.precision * STAT_MULTS.ACCURACY_PER_PRECISION)
        + (ratings.crit * STAT_MULTS.ACCURACY_PER_CRIT);
    entity.evasionRating = 35
        + (ratings.haste * STAT_MULTS.EVASION_PER_HASTE)
        + (ratings.resolve * STAT_MULTS.EVASION_PER_RESOLVE);
    entity.parryRating = (ratings.guard * STAT_MULTS.PARRY_PER_GUARD) + (ratings.precision * STAT_MULTS.PARRY_PER_PRECISION);
    entity.armorPenetration = (ratings.power * STAT_MULTS.ARMOR_PEN_PER_POWER) + (ratings.guard * STAT_MULTS.ARMOR_PEN_PER_GUARD);
    entity.elementalPenetration = (ratings.spellPower * STAT_MULTS.ELEMENTAL_PEN_PER_SPELL_POWER)
        + (ratings.potency * STAT_MULTS.ELEMENTAL_PEN_PER_POTENCY)
        + (ratings.precision * STAT_MULTS.ELEMENTAL_PEN_PER_PRECISION);
    entity.tenacity = (ratings.resolve * STAT_MULTS.TENACITY_PER_RESOLVE) + (ratings.guard * STAT_MULTS.TENACITY_PER_GUARD);

    const resistVal = Math.min(STAT_MULTS.RESIST_BASE + (ratings.resolve * STAT_MULTS.RESIST_PER_RESOLVE), 0.75);
    entity.resistances = {
        fire: resistVal, water: resistVal, earth: resistVal,
        air: resistVal, light: resistVal, shadow: resistVal
    };

    return entity;
};

export const applyMetaUpgrades = (entity: Entity, upgrades: MetaUpgrades = BASE_META_UPGRADES): Entity => {
    if (entity.isEnemy) {
        return entity;
    }

    const damageMultiplier = 1 + (upgrades.training * 0.1);
    const armorMultiplier = 1 + (upgrades.fortification * 0.1);

    entity.physicalDamage = entity.physicalDamage.times(damageMultiplier);
    entity.magicDamage = entity.magicDamage.times(damageMultiplier);
    entity.armor = entity.armor.times(armorMultiplier);

    return entity;
};

export const recalculateEntity = (
    entity: Entity,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
    prestigeUpgrades?: PrestigeUpgrades,
    buildState?: HeroBuildState,
): Entity => {
    calculateDerivedStats(entity, prestigeUpgrades, buildState);
    applyMetaUpgrades(entity, upgrades);

    if (entity.currentHp.gt(entity.maxHp)) {
        entity.currentHp = entity.maxHp;
    }

    if (entity.currentResource.gt(entity.maxResource)) {
        entity.currentResource = entity.maxResource;
    }

    return entity;
};

export const createHero = (
    id: string,
    name: string,
    entityClass: HeroClass,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
    prestigeUpgrades?: PrestigeUpgrades,
): Entity => {
    const template = getHeroClassTemplate(entityClass);
    let hero: Entity = {
        id, name, class: entityClass,
        isEnemy: false,
        image: `${import.meta.env.BASE_URL}${template.imageAsset}`,
        level: 1,
        exp: new Decimal(0),
        expToNext: getExpRequirement(1),
        attributes: cloneAttributes(template.baseAttributes),
        maxHp: new Decimal(1), currentHp: new Decimal(1),
        maxResource: new Decimal(1), currentResource: new Decimal(0), // Rage starts at 0, others start full
        armor: new Decimal(0), physicalDamage: new Decimal(0), magicDamage: new Decimal(0),
        critChance: 0.05, critDamage: 1.5,
        accuracyRating: 0, evasionRating: 0, parryRating: 0,
        armorPenetration: 0, elementalPenetration: 0, tenacity: 0,
        resistances: { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 },
        actionProgress: 0,
        activeSkill: null,
        activeSkillTicks: 0,
        guardStacks: 0,
        statusEffects: [],
    };

    hero = recalculateEntity(hero, upgrades, prestigeUpgrades);
    if (template.resourceModel.startsFull) {
        hero.currentResource = hero.maxResource;
    }
    hero.currentHp = hero.maxHp;

    return hero;
};

export const createStarterParty = (
    leaderName: string,
    leaderClass: HeroClass,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
    prestigeUpgrades?: PrestigeUpgrades,
): Entity[] => {
    return [createHero("hero_1", leaderName, leaderClass, upgrades, prestigeUpgrades)];
};

const getNextHeroId = (heroes: Entity[]): string => {
    const nextId = heroes.reduce((highestId, hero) => {
        const match = hero.id.match(/^hero_(\d+)$/);
        if (!match) {
            return highestId;
        }

        return Math.max(highestId, Number(match[1]));
    }, 0) + 1;

    return `hero_${nextId}`;
};

const getGeneratedHeroName = (entityClass: HeroClass, heroes: Entity[]): string => {
    const existingNames = new Set(heroes.map((hero) => hero.name));
    const namePool = getHeroClassTemplate(entityClass).namePool;

    for (const candidate of namePool) {
        if (!existingNames.has(candidate)) {
            return candidate;
        }
    }

    const baseName = namePool[0];
    let suffix = 2;
    let candidateName = `${baseName} ${suffix}`;

    while (existingNames.has(candidateName)) {
        suffix += 1;
        candidateName = `${baseName} ${suffix}`;
    }

    return candidateName;
};

export const createRecruitHero = (
    entityClass: HeroClass,
    heroes: Entity[],
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
    prestigeUpgrades?: PrestigeUpgrades,
): Entity => {
    return createHero(
        getNextHeroId(heroes),
        getGeneratedHeroName(entityClass, heroes),
        entityClass,
        upgrades,
        prestigeUpgrades,
    );
};

// Enemy generation (simple for now)
export const createEnemy = (level: number, id: string, options: CreateEnemyOptions = {}): Entity => {
    const images = ["/assets/enemy_rat.png", "/assets/enemy_goblin.png", "/assets/enemy_skeleton.png"];
    const names = ["Sewer Rat", "Goblin Trainee", "Skeleton Guard"];
    const idx = (level - 1) % images.length;
    const isBoss = options.boss ?? (level % 10 === 0);
    const enemyArchetype = options.archetype ?? (isBoss ? "Boss" : "Bruiser");
    const enemyElement = enemyArchetype === "Caster" || enemyArchetype === "Boss"
        ? (options.element ?? getEnemyElementForEncounter(level))
        : null;

    const baseAttributes = {
        vit: 5 + (level * 2),
        str: 5 + (level * 1.5),
        dex: 5 + (level * 1.5),
        int: 2 + level,
        wis: 2 + level,
    };

    let enemy: Entity = {
        id, name: `${names[idx]} Lv${level}`, class: "Monster",
        isEnemy: true,
        enemyArchetype,
        enemyElement,
        image: `${import.meta.env.BASE_URL}${images[idx]}`,
        level,
        exp: new Decimal(0), expToNext: new Decimal(0), // Enemies don't level up
        attributes: applyEnemyArchetypeBias(baseAttributes, enemyArchetype),
        maxHp: new Decimal(1), currentHp: new Decimal(1),
        maxResource: new Decimal(100), currentResource: new Decimal(0),
        armor: new Decimal(0), physicalDamage: new Decimal(0), magicDamage: new Decimal(0),
        critChance: 0.05, critDamage: 1.5,
        accuracyRating: 0, evasionRating: 0, parryRating: 0,
        armorPenetration: 0, elementalPenetration: 0, tenacity: 0,
        resistances: { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 },
        actionProgress: 0,
        activeSkill: null,
        activeSkillTicks: 0,
        guardStacks: 0,
        statusEffects: [],
    };

    // Boss floor
    if (isBoss) {
        enemy.attributes.vit *= BOSS_VITALITY_MULTIPLIER;
        enemy.attributes.str *= BOSS_STRENGTH_MULTIPLIER;
        enemy.attributes.dex *= 1.1;
        enemy.attributes.int *= 1.15;
        enemy.attributes.wis *= 1.15;
        enemy.name = `Boss: ${enemy.name}`;
    }

    enemy = recalculateEntity(enemy);
    enemy.currentHp = enemy.maxHp;

    return enemy;
};
