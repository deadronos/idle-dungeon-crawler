import Decimal from "decimal.js";

import { getCombatRatings, type Entity } from "../entity";
import type { HeroBuildState } from "../heroBuilds";
import type { PrestigeUpgrades } from "../store/types";

import {
  ATB_CONFIG,
  PENETRATION_CONFIG,
  ARMOR_CONFIG,
  TENACITY_CONFIG,
  calculatePhysicalHitChance as formulaCalcPhysicalHitChance,
  calculateSpellHitChance as formulaCalcSpellHitChance,
  calculateParryChance as formulaCalcParryChance,
  calculatePenetrationReduction as formulaCalcPenetrationReduction,
  calculateTenacityReduction as formulaCalcTenacityReduction,
  applyPhysicalMitigation as formulaApplyPhysicalMitigation,
  applyElementalMitigation as formulaApplyElementalMitigation,
  calculateEffectiveCritMultiplier as formulaCalcEffectiveCritMultiplier,
  calculateActionProgressPerTick as formulaCalcActionProgressPerTick,
} from "./combatFormulas";
import { getStatusPotency } from "./statusEffects";

// Re-export constants for backward compatibility
export {
  PENETRATION_CONFIG,
  ARMOR_CONFIG,
  TENACITY_CONFIG,
};

// Legacy exports maintained for compatibility
export const ARMOR_MITIGATION_SCALE = ARMOR_CONFIG.MITIGATION_SCALE;
export const MAX_PENETRATION_REDUCTION = PENETRATION_CONFIG.MAX_REDUCTION;
export const PENETRATION_SOFTCAP = PENETRATION_CONFIG.SOFTCAP;
export const MAX_TENACITY_REDUCTION = TENACITY_CONFIG.MAX_REDUCTION;
export const TENACITY_SOFTCAP = TENACITY_CONFIG.SOFTCAP;

const getEffectiveAccuracyRating = (entity: Entity) => {
  return Math.max(0, entity.accuracyRating - getStatusPotency(entity, "blind"));
};

export const getPhysicalHitChance = (attacker: Entity, defender: Entity) =>
  formulaCalcPhysicalHitChance(
    getEffectiveAccuracyRating(attacker),
    defender.evasionRating
  );

export const getSpellHitChance = (attacker: Entity, defender: Entity) =>
  formulaCalcSpellHitChance(
    getEffectiveAccuracyRating(attacker),
    defender.evasionRating,
    attacker.attributes.int,
    defender.attributes.wis
  );

export const getParryChance = (attacker: Entity, defender: Entity) =>
  formulaCalcParryChance(
    defender.parryRating,
    attacker.accuracyRating
  );

export const getPenetrationReduction = (penetration: number) =>
  formulaCalcPenetrationReduction(penetration);

export const getEffectiveArmor = (armor: Decimal, armorPenetration: number) => {
  return armor.times(1 - formulaCalcPenetrationReduction(armorPenetration));
};

export const applyPhysicalMitigation = (rawDamage: Decimal, armor: Decimal, armorPenetration = 0) =>
  formulaApplyPhysicalMitigation(rawDamage, armor, armorPenetration);

export const getEffectiveResistance = (resistance: number, elementalPenetration: number) => {
  return resistance * (1 - formulaCalcPenetrationReduction(elementalPenetration));
};

export const applyElementalMitigation = (rawDamage: Decimal, resistance: number, elementalPenetration = 0) =>
  formulaApplyElementalMitigation(rawDamage, resistance, elementalPenetration);

export const getTenacityReduction = (tenacity: number) =>
  formulaCalcTenacityReduction(tenacity);

export const getEffectiveCritMultiplier = (critDamage: number, targetTenacity: number) =>
  formulaCalcEffectiveCritMultiplier(critDamage, targetTenacity);

const getAtbMultiplier = (entity: Entity) => {
  return Math.max(ATB_CONFIG.SLOW_MIN_MULTIPLIER, 1 - getStatusPotency(entity, "slow"));
};

export const getActionProgressPerTick = (
  entity: Entity,
  prestigeUpgrades?: Pick<PrestigeUpgrades, "gameSpeed">,
  buildState?: HeroBuildState,
) => {
  const combatRatings = getCombatRatings(entity, buildState);
  return formulaCalcActionProgressPerTick(
    combatRatings.haste,
    prestigeUpgrades?.gameSpeed ?? 0,
    0
  ) * getAtbMultiplier(entity);
};
