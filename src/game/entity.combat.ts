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
import {
  BASE_STATS,
  DERIVED_STAT_MULTIPLIERS,
  RATING_ATTRIBUTE_MULTIPLIERS,
  CRIT_CONFIG,
  RESISTANCE_CONFIG,
} from "./engine/combatFormulas";

// Re-export formulas for backward compatibility
export { DERIVED_STAT_MULTIPLIERS as STAT_MULTS };

/**
 * Simple memoization cache for combat rating calculations
 * This helps reduce repeated calculations for the same entity state
 */
class CombatRatingCache {
  private cache: Map<string, CombatRatings> = new Map();
  private maxSize = 1000;

  generateKey(entityId: string, attributes: Attributes, buildStateKey: string | undefined): string {
    const attrKey = `${attributes.vit},${attributes.str},${attributes.dex},${attributes.int},${attributes.wis}`;
    return `${entityId}:${attrKey}:${buildStateKey || ""}`;
  }

  get(key: string): CombatRatings | undefined {
    return this.cache.get(key);
  }

  set(key: string, ratings: CombatRatings): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, ratings);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const ratingCache = new CombatRatingCache();

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
  // Generate cache key
  const buildStateKey = buildState ? JSON.stringify(buildState) : undefined;
  const cacheKey = ratingCache.generateKey(entity.id, entity.attributes, buildStateKey);

  // Check cache
  const cached = ratingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const attrs = entity.attributes;
  const template = isHeroClass(entity.class) ? getHeroClassTemplate(entity.class) : null;
  const physicalSourceAttribute = template?.combatProfile.physicalDamageSourceAttribute ?? "str";
  const physicalSourceMultiplier = template?.combatProfile.physicalDamageSourceMultiplier ?? 1.5;
  const buildProfile = getHeroBuildProfile(entity, buildState);

  // Use centralized multipliers for better maintainability
  const multipliers = RATING_ATTRIBUTE_MULTIPLIERS;

  const ratings: CombatRatings = {
    power: (attrs[physicalSourceAttribute] * physicalSourceMultiplier * 0.8)
      + (attrs.str * multipliers.power.str)
      + (attrs.vit * multipliers.power.vit),
    spellPower: (attrs.int * multipliers.spellPower.int) + (attrs.wis * multipliers.spellPower.wis),
    precision: (attrs.dex * multipliers.precision.dex)
      + (attrs.int * multipliers.precision.int)
      + (attrs.wis * multipliers.precision.wis),
    haste: (attrs.dex * multipliers.haste.dex)
      + (attrs.vit * multipliers.haste.vit)
      + (attrs.wis * multipliers.haste.wis),
    guard: (attrs.vit * multipliers.guard.vit)
      + (attrs.str * multipliers.guard.str)
      + (attrs.dex * multipliers.guard.dex),
    resolve: (attrs.wis * multipliers.resolve.wis)
      + (attrs.vit * multipliers.resolve.vit)
      + (attrs.int * multipliers.resolve.int),
    potency: (attrs.int * multipliers.potency.int)
      + (attrs.wis * multipliers.potency.wis)
      + (attrs.dex * multipliers.potency.dex),
    crit: (attrs.dex * multipliers.crit.dex)
      + (attrs.wis * multipliers.crit.wis)
      + (attrs.int * multipliers.crit.int),
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

  // Store in cache
  ratingCache.set(cacheKey, ratings);

  return ratings;
};

export const calculateDerivedStats = (entity: Entity, prestigeUpgrades?: PrestigeUpgrades, buildState?: HeroBuildState): Entity => {
  const attrs = entity.attributes;
  const template = isHeroClass(entity.class) ? getHeroClassTemplate(entity.class) : null;
  const buildProfile = getHeroBuildProfile(entity, buildState);
  const ratings = getCombatRatings(entity, buildState);
  const sm = DERIVED_STAT_MULTIPLIERS;

  const hpPerVit = sm.HP_PER_VIT + (prestigeUpgrades?.hpMultiplier ?? 0);
  entity.maxHp = new Decimal(BASE_STATS.HP).plus(attrs.vit * hpPerVit);
  if (entity.currentHp.gt(entity.maxHp)) entity.currentHp = entity.maxHp;

  entity.armor = new Decimal(attrs.str * sm.ARMOR_PER_STR)
    .plus(attrs.vit * sm.ARMOR_PER_VIT)
    .plus(ratings.guard * sm.ARMOR_PER_GUARD);
  entity.physicalDamage = new Decimal(BASE_STATS.PHYSICAL_DAMAGE)
    .plus(ratings.power * sm.PHYS_DMG_PER_POWER)
    .plus(ratings.crit * sm.PHYS_DMG_PER_CRIT);
  entity.magicDamage = new Decimal(BASE_STATS.MAGIC_DAMAGE)
    .plus(ratings.spellPower * sm.MAGIC_DMG_PER_SPELL_POWER)
    .plus(ratings.potency * sm.MAGIC_DMG_PER_POTENCY);

  const maxResourceBase = template?.resourceModel.maxBase ?? 100;
  const maxResourcePerInt = template?.resourceModel.maxPerInt ?? 0;
  entity.maxResource = new Decimal(maxResourceBase)
    .plus(attrs.int * maxResourcePerInt)
    .plus(buildProfile.effects.maxResourceFlatBonus);
  if (entity.currentResource.gt(entity.maxResource)) entity.currentResource = entity.maxResource;

  // Use centralized config for crit calculations
  entity.critChance = Math.min(
    CRIT_CONFIG.BASE_CHANCE + (ratings.crit * CRIT_CONFIG.CHANCE_PER_RATING),
    CRIT_CONFIG.MAX_CHANCE
  );
  const baseCritMultiplier = template?.combatProfile.critMultiplier ?? CRIT_CONFIG.BASE_DAMAGE_MULTIPLIER;
  entity.critDamage = baseCritMultiplier + Math.min(CRIT_CONFIG.MAX_BONUS_MULTIPLIER, ratings.crit * CRIT_CONFIG.BONUS_PER_RATING);

  entity.accuracyRating = BASE_STATS.ACCURACY_RATING
    + (ratings.precision * sm.ACCURACY_PER_PRECISION)
    + (ratings.crit * sm.ACCURACY_PER_CRIT);
  entity.evasionRating = BASE_STATS.EVASION_RATING
    + (ratings.haste * sm.EVASION_PER_HASTE)
    + (ratings.resolve * sm.EVASION_PER_RESOLVE);
  entity.parryRating = (ratings.guard * sm.PARRY_PER_GUARD) + (ratings.precision * sm.PARRY_PER_PRECISION);
  entity.armorPenetration = (ratings.power * sm.ARMOR_PEN_PER_POWER) + (ratings.guard * sm.ARMOR_PEN_PER_GUARD);
  entity.elementalPenetration = (ratings.spellPower * sm.ELEMENTAL_PEN_PER_SPELL_POWER)
    + (ratings.potency * sm.ELEMENTAL_PEN_PER_POTENCY)
    + (ratings.precision * sm.ELEMENTAL_PEN_PER_PRECISION);
  entity.tenacity = (ratings.resolve * sm.TENACITY_PER_RESOLVE) + (ratings.guard * sm.TENACITY_PER_GUARD);

  // Use centralized resistance calculation
  const resistVal = Math.min(
    RESISTANCE_CONFIG.BASE + (ratings.resolve * RESISTANCE_CONFIG.PER_RESOLVE),
    RESISTANCE_CONFIG.MAX
  );
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

/**
 * Clear the combat rating cache. Call this when you need to force recalculation
 * (e.g., after major game state changes or memory pressure concerns).
 */
export const clearCombatRatingCache = (): void => {
  ratingCache.clear();
};
