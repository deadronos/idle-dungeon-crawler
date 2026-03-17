import Decimal from "decimal.js";

import { getHeroClassTemplate, type HeroCombatRating } from "./classTemplates";
import { getHeroBuildProfile, type HeroBuildState } from "./heroBuilds";
import { BASE_HERO_EXP_REQUIREMENT, HERO_EXP_GROWTH_RATE } from "./progressionMath";
import { getEnemyCombatRatingBiases } from "./entity.enemies";
import {
    BASE_META_UPGRADES,
    type Attributes,
    type CombatRatings,
    type Entity,
    type EntityClass,
    type HeroClass,
    type MetaUpgrades,
    type PrestigeUpgrades,
} from "./entity.types";

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

export const getBaseAttributes = (entityClass: EntityClass): Attributes => {
    if (isHeroClass(entityClass)) {
        return cloneAttributes(getHeroClassTemplate(entityClass).baseAttributes);
    }

    return { vit: 5, str: 5, dex: 5, int: 5, wis: 5 };
};

export const getExpRequirement = (level: number): Decimal => {
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
        fire: resistVal,
        water: resistVal,
        earth: resistVal,
        air: resistVal,
        light: resistVal,
        shadow: resistVal,
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
