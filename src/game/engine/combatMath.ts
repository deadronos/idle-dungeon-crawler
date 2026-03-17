import Decimal from "decimal.js";

import { getCombatRatings, type Entity } from "../entity";
import type { HeroBuildState } from "../heroBuilds";
import type { PrestigeUpgrades } from "../store/types";

import { ATB_RATE, HASTE_ATB_RATE } from "./constants";
import { getStatusPotency } from "./statusEffects";

export const ARMOR_MITIGATION_SCALE = 2;
export const MAX_PENETRATION_REDUCTION = 0.6;
export const PENETRATION_SOFTCAP = 60;
export const MAX_TENACITY_REDUCTION = 0.6;
export const TENACITY_SOFTCAP = 80;

const MIN_PHYSICAL_HIT_CHANCE = 0.72;
const MAX_PHYSICAL_HIT_CHANCE = 0.97;
const MIN_SPELL_HIT_CHANCE = 0.74;
const MAX_SPELL_HIT_CHANCE = 0.96;
const MAX_PARRY_CHANCE = 0.25;

const clampChance = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const getEffectiveAccuracyRating = (entity: Entity) => {
    return Math.max(0, entity.accuracyRating - getStatusPotency(entity, "blind"));
};

export const getPhysicalHitChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        MIN_PHYSICAL_HIT_CHANCE,
        MAX_PHYSICAL_HIT_CHANCE,
        0.82 + ((getEffectiveAccuracyRating(attacker) - defender.evasionRating) * 0.002),
    );

export const getSpellHitChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        MIN_SPELL_HIT_CHANCE,
        MAX_SPELL_HIT_CHANCE,
        0.82
            + ((getEffectiveAccuracyRating(attacker) - defender.evasionRating) * 0.0016)
            + ((attacker.attributes.int - defender.attributes.wis) * 0.0008),
    );

export const getParryChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        0,
        MAX_PARRY_CHANCE,
        0.04 + ((defender.parryRating - (attacker.accuracyRating * 0.3)) * 0.0025),
    );

export const getPenetrationReduction = (penetration: number) => {
    if (penetration <= 0) {
        return 0;
    }

    return Math.min(MAX_PENETRATION_REDUCTION, penetration / (penetration + PENETRATION_SOFTCAP));
};

export const getEffectiveArmor = (armor: Decimal, armorPenetration: number) => {
    return armor.times(1 - getPenetrationReduction(armorPenetration));
};

export const applyPhysicalMitigation = (rawDamage: Decimal, armor: Decimal, armorPenetration = 0) => {
    const mitigatedArmor = getEffectiveArmor(armor, armorPenetration);
    const mitigatedDamage = rawDamage.times(100).div(new Decimal(100).plus(mitigatedArmor.times(ARMOR_MITIGATION_SCALE)));
    return Decimal.max(1, mitigatedDamage);
};

export const getEffectiveResistance = (resistance: number, elementalPenetration: number) => {
    return resistance * (1 - getPenetrationReduction(elementalPenetration));
};

export const applyElementalMitigation = (rawDamage: Decimal, resistance: number, elementalPenetration = 0) => {
    return Decimal.max(1, rawDamage.times(1 - getEffectiveResistance(resistance, elementalPenetration)));
};

export const getTenacityReduction = (tenacity: number) => {
    if (tenacity <= 0) {
        return 0;
    }

    return Math.min(MAX_TENACITY_REDUCTION, tenacity / (tenacity + TENACITY_SOFTCAP));
};

export const getEffectiveCritMultiplier = (critDamage: number, targetTenacity: number) => {
    const critBonus = Math.max(0, critDamage - 1);
    return 1 + (critBonus * (1 - getTenacityReduction(targetTenacity)));
};

const getAtbMultiplier = (entity: Entity) => {
    return Math.max(0.1, 1 - getStatusPotency(entity, "slow"));
};

export const getActionProgressPerTick = (
    entity: Entity,
    prestigeUpgrades?: Pick<PrestigeUpgrades, "gameSpeed">,
    buildState?: HeroBuildState,
) => {
    const hasteBonus = (prestigeUpgrades?.gameSpeed ?? 0) * 0.1;
    const combatRatings = getCombatRatings(entity, buildState);
    return (ATB_RATE + (combatRatings.haste * HASTE_ATB_RATE)) * (1 + hasteBonus) * getAtbMultiplier(entity);
};
