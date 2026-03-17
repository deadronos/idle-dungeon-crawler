import Decimal from "decimal.js";

import { getHeroClassTemplate } from "./classTemplates";
export { HERO_CLASSES } from "./classTemplates";
import { applyEnemyArchetypeBias, getEnemyElementForEncounter } from "./entity.enemies";
import { getExpRequirement, recalculateEntity } from "./entity.combat";
import {
    BASE_META_UPGRADES,
    BOSS_STRENGTH_MULTIPLIER,
    BOSS_VITALITY_MULTIPLIER,
    type CreateEnemyOptions,
    type Entity,
    type HeroClass,
    type MetaUpgrades,
    type PrestigeUpgrades,
} from "./entity.types";

export const createHero = (
    id: string,
    name: string,
    entityClass: HeroClass,
    upgrades: MetaUpgrades = BASE_META_UPGRADES,
    prestigeUpgrades?: PrestigeUpgrades,
): Entity => {
    const template = getHeroClassTemplate(entityClass);
    let hero: Entity = {
        id,
        name,
        class: entityClass,
        isEnemy: false,
        image: `${import.meta.env.BASE_URL}${template.imageAsset}`,
        level: 1,
        exp: new Decimal(0),
        expToNext: getExpRequirement(1),
        attributes: { ...template.baseAttributes },
        maxHp: new Decimal(1),
        currentHp: new Decimal(1),
        maxResource: new Decimal(1),
        currentResource: new Decimal(0),
        armor: new Decimal(0),
        physicalDamage: new Decimal(0),
        magicDamage: new Decimal(0),
        critChance: 0.05,
        critDamage: 1.5,
        accuracyRating: 0,
        evasionRating: 0,
        parryRating: 0,
        armorPenetration: 0,
        elementalPenetration: 0,
        tenacity: 0,
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
        id,
        name: `${names[idx]} Lv${level}`,
        class: "Monster",
        isEnemy: true,
        enemyArchetype,
        enemyElement,
        image: `${import.meta.env.BASE_URL}${images[idx]}`,
        level,
        exp: new Decimal(0),
        expToNext: new Decimal(0),
        attributes: applyEnemyArchetypeBias(baseAttributes, enemyArchetype),
        maxHp: new Decimal(1),
        currentHp: new Decimal(1),
        maxResource: new Decimal(100),
        currentResource: new Decimal(0),
        armor: new Decimal(0),
        physicalDamage: new Decimal(0),
        magicDamage: new Decimal(0),
        critChance: 0.05,
        critDamage: 1.5,
        accuracyRating: 0,
        evasionRating: 0,
        parryRating: 0,
        armorPenetration: 0,
        elementalPenetration: 0,
        tenacity: 0,
        resistances: { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 },
        actionProgress: 0,
        activeSkill: null,
        activeSkillTicks: 0,
        guardStacks: 0,
        statusEffects: [],
    };

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
