import Decimal from "decimal.js";

/**
 * Combat Formulas - Centralized location for all combat calculations
 * 
 * All magic numbers, multipliers, and formulas are defined here for easy tuning
 * and to maintain consistency across the game.
 */

// ============================================================================
// ATB (Active Time Battle) Constants
// ============================================================================
export const ATB_CONFIG = {
  BASE_RATE: 2,
  HASTE_RATE: 0.08,
  SLOW_MIN_MULTIPLIER: 0.1,
} as const;

// ============================================================================
// Hit Chance Configuration
// ============================================================================
export const HIT_CHANCE_CONFIG = {
  // Physical attacks
  PHYSICAL: {
    MIN: 0.72,
    MAX: 0.97,
    BASE: 0.82,
    ACCURACY_DIFFERENCE_MULTIPLIER: 0.002,
  },
  // Spell attacks
  SPELL: {
    MIN: 0.74,
    MAX: 0.96,
    BASE: 0.82,
    ACCURACY_DIFFERENCE_MULTIPLIER: 0.0016,
    INT_WIS_DIFFERENCE_MULTIPLIER: 0.0008,
  },
} as const;

// ============================================================================
// Parry Configuration
// ============================================================================
export const PARRY_CONFIG = {
  MAX_CHANCE: 0.25,
  BASE_CHANCE: 0.04,
  RATING_MULTIPLIER: 0.0025,
  ACCURACY_PENALTY_MULTIPLIER: 0.3,
} as const;

// ============================================================================
// Penetration & Mitigation
// ============================================================================
export const PENETRATION_CONFIG = {
  MAX_REDUCTION: 0.6,
  SOFTCAP: 60,
} as const;

export const ARMOR_CONFIG = {
  MITIGATION_SCALE: 2,
} as const;

export const TENACITY_CONFIG = {
  MAX_REDUCTION: 0.6,
  SOFTCAP: 80,
} as const;

// ============================================================================
// Critical Hit Configuration
// ============================================================================
export const CRIT_CONFIG = {
  BASE_CHANCE: 0.05,
  CHANCE_PER_RATING: 0.0055,
  MAX_CHANCE: 1.0,
  BASE_DAMAGE_MULTIPLIER: 1.5,
  MAX_BONUS_MULTIPLIER: 0.2,
  BONUS_PER_RATING: 0.01,
} as const;

// ============================================================================
// Resistance Configuration
// ============================================================================
export const RESISTANCE_CONFIG = {
  BASE: 0.02,
  PER_RESOLVE: 0.008,
  MAX: 0.75,
} as const;

// ============================================================================
// Base Stats Configuration
// ============================================================================
export const BASE_STATS = {
  HP: 50,
  PHYSICAL_DAMAGE: 10,
  MAGIC_DAMAGE: 5,
  ACCURACY_RATING: 50,
  EVASION_RATING: 35,
} as const;

// ============================================================================
// Combat Rating Formulas
// ============================================================================

/**
 * Multipliers for attribute contributions to combat ratings
 * These are used by the getCombatRatings function
 * All rating multipliers are centralized here for easy tuning
 */
export const RATING_ATTRIBUTE_MULTIPLIERS: Record<string, Record<string, number>> = {
  power: {
    str: 0.25,
    vit: 0.15,
  },
  spellPower: {
    int: 1.25,
    wis: 0.55,
  },
  precision: {
    dex: 0.6,
    int: 0.35,
    wis: 0.15,
  },
  haste: {
    dex: 0.45,
    vit: 0.15,
    wis: 0.1,
  },
  guard: {
    vit: 0.8,
    str: 0.55,
    dex: 0.1,
  },
  resolve: {
    wis: 0.85,
    vit: 0.3,
    int: 0.35,
  },
  potency: {
    int: 0.45,
    wis: 0.35,
    dex: 0.15,
  },
  crit: {
    dex: 0.35,
    wis: 0.15,
    int: 0.1,
  },
};

// ============================================================================
// Derived Stat Multipliers (from entity.combat.ts STAT_MULTS)
// ============================================================================
export const DERIVED_STAT_MULTIPLIERS = {
  HP_PER_VIT: 10,
  ARMOR_PER_STR: 0.45,
  ARMOR_PER_VIT: 0.25,
  ARMOR_PER_GUARD: 0.4,
  PHYS_DMG_PER_POWER: 0.8,
  PHYS_DMG_PER_CRIT: 0.15,
  MAGIC_DMG_PER_SPELL_POWER: 0.75,
  MAGIC_DMG_PER_POTENCY: 0.15,
  RESOURCE_PER_INT: 5,
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
} as const;

// ============================================================================
// Formula Functions
// ============================================================================

/**
 * Clamp a chance value between min and max
 */
export const clampChance = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Calculate base critical hit chance from combat rating
 * Crit chance cannot go below 0 (negative ratings just mean 0 chance)
 */
export const calculateBaseCritChance = (critRating: number): number =>
  Math.max(0, CRIT_CONFIG.BASE_CHANCE + (critRating * CRIT_CONFIG.CHANCE_PER_RATING));

/**
 * Calculate critical hit damage multiplier
 */
export const calculateCritDamage = (
  baseMultiplier: number,
  critRating: number
): number =>
  baseMultiplier +
  Math.min(CRIT_CONFIG.MAX_BONUS_MULTIPLIER, critRating * CRIT_CONFIG.BONUS_PER_RATING);

/**
 * Calculate resistance value
 */
export const calculateResistance = (resolveRating: number): number =>
  Math.min(
    RESISTANCE_CONFIG.MAX,
    RESISTANCE_CONFIG.BASE + (resolveRating * RESISTANCE_CONFIG.PER_RESOLVE)
  );

/**
 * Calculate physical hit chance
 */
export const calculatePhysicalHitChance = (
  attackerAccuracy: number,
  defenderEvasion: number
): number =>
  clampChance(
    HIT_CHANCE_CONFIG.PHYSICAL.MIN,
    HIT_CHANCE_CONFIG.PHYSICAL.MAX,
    HIT_CHANCE_CONFIG.PHYSICAL.BASE +
      (attackerAccuracy - defenderEvasion) *
        HIT_CHANCE_CONFIG.PHYSICAL.ACCURACY_DIFFERENCE_MULTIPLIER
  );

/**
 * Calculate spell hit chance
 */
export const calculateSpellHitChance = (
  attackerAccuracy: number,
  defenderEvasion: number,
  attackerInt: number,
  defenderWis: number
): number =>
  clampChance(
    HIT_CHANCE_CONFIG.SPELL.MIN,
    HIT_CHANCE_CONFIG.SPELL.MAX,
    HIT_CHANCE_CONFIG.SPELL.BASE +
      (attackerAccuracy - defenderEvasion) *
        HIT_CHANCE_CONFIG.SPELL.ACCURACY_DIFFERENCE_MULTIPLIER +
      (attackerInt - defenderWis) *
        HIT_CHANCE_CONFIG.SPELL.INT_WIS_DIFFERENCE_MULTIPLIER
  );

/**
 * Calculate parry chance
 */
export const calculateParryChance = (
  defenderParry: number,
  attackerAccuracy: number
): number =>
  clampChance(
    0,
    PARRY_CONFIG.MAX_CHANCE,
    PARRY_CONFIG.BASE_CHANCE +
      (defenderParry - attackerAccuracy * PARRY_CONFIG.ACCURACY_PENALTY_MULTIPLIER) *
        PARRY_CONFIG.RATING_MULTIPLIER
  );

/**
 * Calculate penetration reduction
 */
export const calculatePenetrationReduction = (penetration: number): number => {
  if (penetration <= 0) return 0;
  return Math.min(
    PENETRATION_CONFIG.MAX_REDUCTION,
    penetration / (penetration + PENETRATION_CONFIG.SOFTCAP)
  );
};

/**
 * Calculate tenacity reduction
 */
export const calculateTenacityReduction = (tenacity: number): number => {
  if (tenacity <= 0) return 0;
  return Math.min(
    TENACITY_CONFIG.MAX_REDUCTION,
    tenacity / (tenacity + TENACITY_CONFIG.SOFTCAP)
  );
};

/**
 * Apply physical damage mitigation
 */
export const applyPhysicalMitigation = (
  rawDamage: Decimal,
  armor: Decimal,
  armorPenetration = 0
): Decimal => {
  const reduction = calculatePenetrationReduction(armorPenetration);
  const effectiveArmor = armor.times(1 - reduction);
  const mitigatedDamage = rawDamage
    .times(100)
    .div(new Decimal(100).plus(effectiveArmor.times(ARMOR_CONFIG.MITIGATION_SCALE)));
  return Decimal.max(1, mitigatedDamage);
};

/**
 * Apply elemental damage mitigation
 */
export const applyElementalMitigation = (
  rawDamage: Decimal,
  resistance: number,
  elementalPenetration = 0
): Decimal => {
  const reduction = calculatePenetrationReduction(elementalPenetration);
  const effectiveResistance = resistance * (1 - reduction);
  return Decimal.max(1, rawDamage.times(1 - effectiveResistance));
};

/**
 * Calculate effective crit multiplier
 */
export const calculateEffectiveCritMultiplier = (
  critDamage: number,
  targetTenacity: number
): number => {
  const critBonus = Math.max(0, critDamage - 1);
  return 1 + critBonus * (1 - calculateTenacityReduction(targetTenacity));
};

/**
 * Calculate action progress per tick
 */
export const calculateActionProgressPerTick = (
  haste: number,
  gameSpeedLevel: number,
  slowEffect = 0
): number => {
  const hasteBonus = gameSpeedLevel * 0.1;
  const atbMultiplier = Math.max(ATB_CONFIG.SLOW_MIN_MULTIPLIER, 1 - slowEffect);
  return (ATB_CONFIG.BASE_RATE + haste * ATB_CONFIG.HASTE_RATE) * (1 + hasteBonus) * atbMultiplier;
};
