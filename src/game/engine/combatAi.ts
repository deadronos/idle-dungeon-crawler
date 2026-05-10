import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import { type SecureRandomSource } from "../../utils/random";
import { inferEnemyArchetype, type DamageElement, type EnemyArchetype, type Entity } from "../entity";
import { getHeroBuildProfile, type HeroBuildState } from "../heroBuilds";

const BRUISER_DAMAGE_MULTIPLIER = 1.35;
const SKIRMISHER_CRIT_BONUS = 0.1;
const CASTER_DAMAGE_MULTIPLIER = 1.15;
const SUPPORT_HEAL_THRESHOLD = 0.6;
const SUPPORT_HEAL_MULTIPLIER = 1.5;
const SUPPORT_GUARD_REDUCTION = 0.35;
const SUPPORT_HEX_DAMAGE_MULTIPLIER = 0.8;
const BOSS_PHASE_SWITCH_THRESHOLD = 0.6;
const BOSS_MELEE_DAMAGE_MULTIPLIER = 1.4;
const BOSS_SPELL_DAMAGE_MULTIPLIER = 1.25;

export type DeliveryType = "melee" | "ranged" | "spell";

export interface DamageAction {
    name: string;
    damage: Decimal;
    damageElement: DamageElement;
    deliveryType: DeliveryType;
    critChance: number;
    canDodge: boolean;
    canParry: boolean;
}

export interface SupportAction {
    type: "heal" | "guard";
    name: string;
    target: Entity;
}

export const getHpRatio = (entity: Entity) => entity.currentHp.div(entity.maxHp).toNumber();

export const getLowestHpRatioTarget = (entities: Entity[]) => {
    return [...entities].sort((left, right) => getHpRatio(left) - getHpRatio(right))[0];
};

const getHighestCurrentHpTarget = (entities: Entity[]) => {
    return [...entities].sort((left, right) => right.currentHp.minus(left.currentHp).toNumber())[0];
};

const getLowestCurrentHpTarget = (entities: Entity[]) => {
    return [...entities].sort((left, right) => left.currentHp.minus(right.currentHp).toNumber())[0];
};

const getThreatRating = (entity: Entity) => entity.physicalDamage.plus(entity.magicDamage).toNumber();

const getHighestThreatTarget = (entities: Entity[]) => {
    return [...entities].sort((left, right) => getThreatRating(right) - getThreatRating(left))[0];
};

const getLowestResistanceTarget = (entities: Entity[], damageElement: DamageElement) => {
    if (damageElement === "physical") {
        return getLowestCurrentHpTarget(entities);
    }

    return [...entities].sort((left, right) => left.resistances[damageElement] - right.resistances[damageElement])[0];
};

const getEnemyDamageAction = (entity: Entity, archetype: EnemyArchetype): DamageAction => {
    switch (archetype) {
        case "Bruiser":
            return {
                name: "Crushing Blow",
                damage: entity.physicalDamage.times(BRUISER_DAMAGE_MULTIPLIER),
                damageElement: "physical",
                deliveryType: "melee",
                critChance: entity.critChance,
                canDodge: true,
                canParry: true,
            };
        case "Skirmisher":
            return {
                name: "Harrying Shot",
                damage: entity.physicalDamage,
                damageElement: "physical",
                deliveryType: "ranged",
                critChance: Math.min(1, entity.critChance + SKIRMISHER_CRIT_BONUS),
                canDodge: true,
                canParry: false,
            };
        case "Caster":
            return {
                name: `${entity.enemyElement ? `${entity.enemyElement[0].toUpperCase()}${entity.enemyElement.slice(1)} ` : ""}Bolt`,
                damage: entity.magicDamage.times(CASTER_DAMAGE_MULTIPLIER),
                damageElement: entity.enemyElement ?? "shadow",
                deliveryType: "spell",
                critChance: entity.critChance,
                canDodge: true,
                canParry: false,
            };
        case "Support":
            return {
                name: "Suppressing Hex",
                damage: entity.magicDamage.times(SUPPORT_HEX_DAMAGE_MULTIPLIER),
                damageElement: "shadow",
                deliveryType: "spell",
                critChance: entity.critChance,
                canDodge: true,
                canParry: false,
            };
        case "Boss":
            if (getHpRatio(entity) <= BOSS_PHASE_SWITCH_THRESHOLD) {
                return {
                    name: "Ruin Bolt",
                    damage: entity.magicDamage.times(BOSS_SPELL_DAMAGE_MULTIPLIER),
                    damageElement: entity.enemyElement ?? "shadow",
                    deliveryType: "spell",
                    critChance: entity.critChance,
                    canDodge: true,
                    canParry: false,
                };
            }

            return {
                name: "Overlord Strike",
                damage: entity.physicalDamage.times(BOSS_MELEE_DAMAGE_MULTIPLIER),
                damageElement: "physical",
                deliveryType: "melee",
                critChance: entity.critChance,
                canDodge: true,
                canParry: true,
            };
        default:
            return {
                name: "Attack",
                damage: entity.physicalDamage,
                damageElement: "physical",
                deliveryType: "melee",
                critChance: entity.critChance,
                canDodge: true,
                canParry: true,
            };
    }
};

export const getEnemySupportAction = (entity: Entity, allies: Entity[]): SupportAction | null => {
    const healTarget = getLowestHpRatioTarget(allies.filter((ally) => ally.currentHp.lt(ally.maxHp)));
    if (healTarget && getHpRatio(healTarget) < SUPPORT_HEAL_THRESHOLD) {
        return {
            type: "heal",
            name: "Mend Ally",
            target: healTarget,
        };
    }

    const protectTarget = getHighestThreatTarget(allies.filter((ally) => ally.id !== entity.id && ally.guardStacks <= 0));
    if (protectTarget) {
        return {
            type: "guard",
            name: "Ward Ally",
            target: protectTarget,
        };
    }

    return null;
};

export const selectTarget = (entity: Entity, targets: Entity[], action: DamageAction, randomSource: SecureRandomSource) => {
    if (!entity.isEnemy) {
        return targets[Math.floor(randomSource.next() * targets.length)];
    }

    switch (inferEnemyArchetype(entity)) {
        case "Bruiser":
            return getHighestCurrentHpTarget(targets) ?? targets[0];
        case "Skirmisher":
            return getLowestCurrentHpTarget(targets) ?? targets[0];
        case "Caster":
            return getLowestResistanceTarget(targets, action.damageElement) ?? targets[0];
        case "Support":
            return getHighestThreatTarget(targets) ?? targets[0];
        case "Boss":
            if (action.deliveryType === "spell") {
                return getLowestResistanceTarget(targets, action.damageElement) ?? targets[0];
            }

            return getHighestCurrentHpTarget(targets) ?? targets[0];
        default:
            return targets[Math.floor(randomSource.next() * targets.length)];
    }
};

export const getDamageAction = (entity: Entity, buildState?: HeroBuildState): DamageAction => {
    if (entity.isEnemy) {
        return getEnemyDamageAction(entity, inferEnemyArchetype(entity) ?? "Bruiser");
    }

    const heroTemplate = getHeroClassTemplate(entity.class);
    const buildProfile = getHeroBuildProfile(entity, buildState);
    const basicAction = heroTemplate.combatProfile.basicAction;
    let action: DamageAction = {
        name: basicAction.name,
        damage: basicAction.damageStat === "magicDamage" ? entity.magicDamage : entity.physicalDamage,
        damageElement: basicAction.damageElement,
        deliveryType: basicAction.deliveryType,
        critChance: entity.critChance,
        canDodge: true,
        canParry: basicAction.canParry,
    };

    switch (heroTemplate.actionPackage.id) {
        case "warrior": {
            const specialAttack = heroTemplate.actionPackage.specialAttack;
            const specialAttackCost = Math.max(0, (specialAttack?.cost ?? 0) + buildProfile.effects.specialAttackCostDelta);
            if (specialAttack && entity.currentResource.gte(specialAttackCost)) {
                entity.currentResource = entity.currentResource.minus(specialAttackCost);
                action = {
                    ...action,
                    name: specialAttack.name,
                    damage: entity.physicalDamage.times(specialAttack.damageMultiplier + buildProfile.effects.specialAttackDamageMultiplierBonus),
                    canParry: specialAttack.canParry,
                };
            }
            break;
        }
        case "archer": {
            const specialAttack = heroTemplate.actionPackage.specialAttack;
            const specialAttackCost = Math.max(0, (specialAttack?.cost ?? 0) + buildProfile.effects.specialAttackCostDelta);
            if (specialAttack && entity.currentResource.gte(specialAttackCost)) {
                entity.currentResource = entity.currentResource.minus(specialAttackCost);
                action = {
                    ...action,
                    name: specialAttack.name,
                    damage: entity.physicalDamage.times(specialAttack.damageMultiplier + buildProfile.effects.specialAttackDamageMultiplierBonus),
                    critChance: Math.min(
                        1,
                        entity.critChance
                            + (specialAttack.critChanceBonus ?? 0)
                            + buildProfile.effects.specialAttackCritChanceBonus,
                    ),
                    canParry: specialAttack.canParry,
                };
            }
            break;
        }
        default:
            break;
    }

    if (action.deliveryType === "ranged" && action.damageElement === "physical") {
        action.canParry = false;
    }

    return action;
};

export { SUPPORT_GUARD_REDUCTION, SUPPORT_HEAL_MULTIPLIER };
