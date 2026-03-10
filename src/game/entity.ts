import Decimal from "decimal.js";

// Basic Types
export type EntityClass = "Warrior" | "Cleric" | "Archer" | "Monster";

export interface MetaUpgrades {
    training: number;
    fortification: number;
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

export interface Entity {
    id: string;
    name: string;
    class: EntityClass;
    image: string; // Sprite path
    isEnemy: boolean;

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

    resistances: Elements;

    // Combat State
    actionProgress: number; // 0 to 100
    activeSkill: string | null;
    activeSkillTicks: number;
}

export const BASE_META_UPGRADES: MetaUpgrades = {
    training: 0,
    fortification: 0,
};

const PARTY_CLASS_ORDER: EntityClass[] = ["Warrior", "Cleric", "Archer"];

const COMPANION_NAMES: Record<Exclude<EntityClass, "Monster">, string> = {
    Warrior: "Brom",
    Cleric: "Lyra",
    Archer: "Kestrel",
};

// Global Stat Multipliers
export const STAT_MULTS = {
    HP_PER_VIT: 10,
    ARMOR_PER_STR: 2,
    ARMOR_PER_VIT: 1,
    PHYS_DMG_PER_STR: 1.5, // For melee
    RANGED_DMG_PER_DEX: 1.5, // For archers
    MAGIC_DMG_PER_INT: 2,
    RESOURCE_PER_INT: 5,
    CRIT_CHANCE_PER_DEX: 0.005, // 0.5% per Dex
    RESIST_PER_WIS: 0.01, // 1% per Wis
};

// Start Stats Helpers
export const getBaseAttributes = (entityClass: EntityClass): Attributes => {
    switch (entityClass) {
        case "Warrior": return { vit: 10, str: 10, dex: 5, int: 3, wis: 3 };
        case "Cleric": return { vit: 7, str: 4, dex: 4, int: 8, wis: 10 };
        case "Archer": return { vit: 6, str: 5, dex: 12, int: 4, wis: 4 };
        case "Monster": return { vit: 5, str: 5, dex: 5, int: 5, wis: 5 }; // Base, scaled later
        default: return { vit: 5, str: 5, dex: 5, int: 5, wis: 5 };
    }
};

export const getExpRequirement = (level: number): Decimal => {
    // Basic scaling: 100 * (1.5 ^ (level - 1))
    return new Decimal(100).times(Decimal.pow(1.5, level - 1)).floor();
};

export const calculateDerivedStats = (entity: Entity): Entity => {
    const attrs = entity.attributes;

    // Base logic for HP
    entity.maxHp = new Decimal(50).plus(attrs.vit * STAT_MULTS.HP_PER_VIT);
    if (entity.currentHp.gt(entity.maxHp)) entity.currentHp = entity.maxHp;

    // Armor
    entity.armor = new Decimal(attrs.str * STAT_MULTS.ARMOR_PER_STR).plus(attrs.vit * STAT_MULTS.ARMOR_PER_VIT);

    // Damage
    entity.physicalDamage = new Decimal(10).plus(
        entity.class === "Archer" ? attrs.dex * STAT_MULTS.RANGED_DMG_PER_DEX : attrs.str * STAT_MULTS.PHYS_DMG_PER_STR
    );
    entity.magicDamage = new Decimal(5).plus(attrs.int * STAT_MULTS.MAGIC_DMG_PER_INT);

    // Resource (Mana/Cunning/Rage)
    if (entity.class === "Warrior") {
        entity.maxResource = new Decimal(100); // Fixed rage
    } else {
        entity.maxResource = new Decimal(50).plus(attrs.int * STAT_MULTS.RESOURCE_PER_INT);
    }
    if (entity.currentResource.gt(entity.maxResource)) entity.currentResource = entity.maxResource;

    // Crit
    entity.critChance = Math.min(0.05 + (attrs.dex * STAT_MULTS.CRIT_CHANCE_PER_DEX), 1.0); // Cap at 100%
    entity.critDamage = entity.class === "Archer" ? 2.0 : 1.5;

    // Resists
    const resistVal = Math.min(attrs.wis * STAT_MULTS.RESIST_PER_WIS, 0.75); // Cap at 75%
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

export const recalculateEntity = (entity: Entity, upgrades: MetaUpgrades = BASE_META_UPGRADES): Entity => {
    calculateDerivedStats(entity);
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
    entityClass: EntityClass,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
): Entity => {
    let hero: Entity = {
        id, name, class: entityClass,
        isEnemy: false,
        image: `/assets/hero_${entityClass.toLowerCase()}.png`, // placeholder
        level: 1,
        exp: new Decimal(0),
        expToNext: getExpRequirement(1),
        attributes: getBaseAttributes(entityClass),
        maxHp: new Decimal(1), currentHp: new Decimal(1),
        maxResource: new Decimal(1), currentResource: new Decimal(0), // Rage starts at 0, others start full
        armor: new Decimal(0), physicalDamage: new Decimal(0), magicDamage: new Decimal(0),
        critChance: 0.05, critDamage: 1.5,
        resistances: { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 },
        actionProgress: 0,
        activeSkill: null,
        activeSkillTicks: 0,
    };

    hero = recalculateEntity(hero, upgrades);
    // Fill resources (except warrior rage)
    if (entityClass === "Cleric" || entityClass === "Archer") {
        hero.currentResource = hero.maxResource;
    }
    hero.currentHp = hero.maxHp;

    return hero;
};

export const createStarterParty = (
    leaderName: string,
    leaderClass: Exclude<EntityClass, "Monster">,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
): Entity[] => {
    const companionClasses = PARTY_CLASS_ORDER.filter((entityClass) => entityClass !== leaderClass) as Exclude<EntityClass, "Monster">[];

    const party = [
        createHero("hero_1", leaderName, leaderClass, upgrades),
        ...companionClasses.map((entityClass, index) => createHero(`hero_${index + 2}`, COMPANION_NAMES[entityClass], entityClass, upgrades)),
    ];

    return party;
};

// Enemy generation (simple for now)
export const createEnemy = (level: number, id: string): Entity => {
    const images = ["/assets/enemy_rat.png", "/assets/enemy_goblin.png", "/assets/enemy_skeleton.png"];
    const names = ["Sewer Rat", "Goblin Trainee", "Skeleton Guard"];
    const idx = (level - 1) % images.length;

    let enemy: Entity = {
        id, name: `${names[idx]} Lv${level}`, class: "Monster",
        isEnemy: true,
        image: images[idx],
        level,
        exp: new Decimal(0), expToNext: new Decimal(0), // Enemies don't level up
        attributes: {
            vit: 5 + (level * 2),
            str: 5 + (level * 1.5),
            dex: 5 + (level * 1.5),
            int: 2 + level,
            wis: 2 + level
        },
        maxHp: new Decimal(1), currentHp: new Decimal(1),
        maxResource: new Decimal(100), currentResource: new Decimal(0),
        armor: new Decimal(0), physicalDamage: new Decimal(0), magicDamage: new Decimal(0),
        critChance: 0.05, critDamage: 1.5,
        resistances: { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 },
        actionProgress: 0,
        activeSkill: null,
        activeSkillTicks: 0,
    };

    // Boss floor
    if (level % 10 === 0) {
        enemy.attributes.vit *= 3;
        enemy.attributes.str *= 2;
        enemy.name = `Boss: ${enemy.name}`;
    }

    enemy = recalculateEntity(enemy);
    enemy.currentHp = enemy.maxHp;

    return enemy;
};
