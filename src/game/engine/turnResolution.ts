import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import { getHeroBuildProfile, type HeroBuildState } from "../heroBuilds";
import {
    getStatusEffectName,
    isHeroClass,
    type Entity,
    type StatusEffect,
    type StatusEffectKey,
} from "../entity";
import type { CombatEvent, PrestigeUpgrades } from "../store/types";

import {
    COMBAT_EVENT_TICKS,
    SKILL_BANNER_TICKS,
} from "./combatEvents";
import {
    getDamageAction,
    getEnemySupportAction,
    getHpRatio,
    getLowestHpRatioTarget,
    selectTarget,
    SUPPORT_GUARD_REDUCTION,
    SUPPORT_HEAL_MULTIPLIER,
} from "./combatAi";
import {
    applyElementalMitigation,
    applyPhysicalMitigation,
    getActionProgressPerTick,
    getEffectiveCritMultiplier,
    getParryChance,
    getPhysicalHitChance,
    getSpellHitChance,
} from "./combatMath";
import {
    applyStatusEffect,
    cleanseStatusEffect,
    getCleanseableStatusEffect,
    getDamageOutputMultiplier,
    getHealingMultiplier,
    getStatusConfig,
    getStatusKeyForElement,
} from "./statusEffects";

interface SimulationRandomSource {
    next: () => number;
}

interface ResolveCombatTurnParams {
    entity: Entity;
    allies: Entity[];
    targets: Entity[];
    prestigeUpgrades: PrestigeUpgrades;
    buildState: HeroBuildState;
    randomSource: SimulationRandomSource;
    setActiveSkill: (entity: Entity, skill: string) => void;
    queueCombatEvent: (event: Omit<CombatEvent, "id">) => void;
    queueStatusEvent: (args: {
        target: Entity;
        statusKey: StatusEffectKey;
        statusPhase: "apply" | "tick" | "expire" | "cleanse";
        text: string;
        amount?: string;
    }) => void;
    addLogMessage: (message: string) => void;
    handleDefeat: (target: Entity) => void;
}

const getHeroTemplateForEntity = (entity: Entity) => {
    if (entity.isEnemy || !isHeroClass(entity.class)) {
        return null;
    }

    return getHeroClassTemplate(entity.class);
};

const grantResolvedAttackResource = (entity: Entity, buildState?: HeroBuildState) => {
    const heroTemplate = getHeroTemplateForEntity(entity);
    if (!heroTemplate || heroTemplate.resourceModel.gainOnResolvedAttack <= 0) {
        return;
    }

    const buildProfile = getHeroBuildProfile(entity, buildState);
    entity.currentResource = Decimal.min(
        entity.maxResource,
        entity.currentResource.plus(heroTemplate.resourceModel.gainOnResolvedAttack + buildProfile.effects.resourceOnResolvedAttackBonus),
    );
};

const grantTakeDamageResource = (entity: Entity, buildState?: HeroBuildState) => {
    const heroTemplate = getHeroTemplateForEntity(entity);
    if (!heroTemplate || heroTemplate.resourceModel.gainOnTakeDamage <= 0) {
        return;
    }

    const buildProfile = getHeroBuildProfile(entity, buildState);
    entity.currentResource = Decimal.min(
        entity.maxResource,
        entity.currentResource.plus(heroTemplate.resourceModel.gainOnTakeDamage + buildProfile.effects.resourceOnTakeDamageBonus),
    );
};

export const updateSkillBanner = (entity: Entity) => {
    if (entity.activeSkillTicks <= 0) {
        return false;
    }

    entity.activeSkillTicks -= 1;

    if (entity.activeSkillTicks === 0) {
        entity.activeSkill = null;
    }

    return true;
};

export const applyActiveSkill = (
    entity: Entity,
    skill: string,
    queueCombatEvent: (event: Omit<CombatEvent, "id">) => void,
) => {
    entity.activeSkill = `Casting ${skill}`;
    entity.activeSkillTicks = SKILL_BANNER_TICKS;
    queueCombatEvent({
        sourceId: entity.id,
        kind: "skill",
        text: skill,
        ttlTicks: COMBAT_EVENT_TICKS,
    });
};

export const resolveCombatTurn = ({
    entity,
    allies,
    targets,
    prestigeUpgrades,
    buildState,
    randomSource,
    setActiveSkill,
    queueCombatEvent,
    queueStatusEvent,
    addLogMessage,
    handleDefeat,
}: ResolveCombatTurnParams) => {
    if (entity.currentHp.lte(0)) {
        return false;
    }

    entity.actionProgress += getActionProgressPerTick(entity, prestigeUpgrades, buildState);
    const heroTemplate = getHeroTemplateForEntity(entity);
    const heroBuildProfile = getHeroBuildProfile(entity, buildState);

    if (heroTemplate) {
        let regen = 0;
        if (heroTemplate.resourceModel.regenKind === "flat") {
            regen = heroTemplate.resourceModel.regenFlat;
        } else if (heroTemplate.resourceModel.regenKind === "attribute" && heroTemplate.resourceModel.regenAttribute) {
            const regenAttribute = heroTemplate.resourceModel.regenAttribute as keyof Entity["attributes"];
            regen = entity.attributes[regenAttribute] * (heroTemplate.resourceModel.regenAttributeMultiplier ?? 0);
        }

        if (regen > 0) {
            entity.currentResource = entity.currentResource.plus(regen);
            if (entity.currentResource.gt(entity.maxResource)) {
                entity.currentResource = entity.maxResource;
            }
        }
    }

    if (entity.actionProgress < 100) {
        return false;
    }

    entity.actionProgress = 0;

    const livingAllies = allies.filter((ally) => ally.currentHp.gt(0));

    if (!entity.isEnemy && heroTemplate?.actionPackage.id === "cleric") {
        const healDefinition = heroTemplate.actionPackage.heal;
        const healTarget = getLowestHpRatioTarget(livingAllies.filter((ally) => ally.currentHp.lt(ally.maxHp)));

        if (healDefinition && healTarget && entity.currentResource.gte(healDefinition.cost) && getHpRatio(healTarget) < healDefinition.hpThreshold) {
            const rawHealAmount = entity.magicDamage.times(healDefinition.healMultiplier + heroBuildProfile.effects.healMultiplierBonus);
            const healAmount = rawHealAmount.times(getHealingMultiplier(healTarget));
            setActiveSkill(entity, healDefinition.name);
            entity.currentResource = entity.currentResource.minus(healDefinition.cost);
            healTarget.currentHp = Decimal.min(healTarget.maxHp, healTarget.currentHp.plus(healAmount));
            queueCombatEvent({
                sourceId: entity.id,
                targetId: healTarget.id,
                kind: "heal",
                text: `+${healAmount.floor().toString()}`,
                amount: healAmount.floor().toString(),
                ttlTicks: COMBAT_EVENT_TICKS,
            });
            addLogMessage(`${entity.name} casts Mend on ${healTarget.name} for ${healAmount.floor().toString()}!`);
            return true;
        }

        const blessDefinition = heroTemplate.actionPackage.bless;
        const blessTarget = livingAllies.find((ally) => ally.id !== entity.id && getCleanseableStatusEffect(ally))
            ?? livingAllies.find((ally) => ally.id !== entity.id && !ally.statusEffects.some((statusEffect) => statusEffect.key === "regen"));
        if (blessDefinition && blessTarget && entity.currentResource.gte(blessDefinition.cost)) {
            const regenPotency = entity.magicDamage
                .times(blessDefinition.regenMultiplier + heroBuildProfile.effects.blessRegenMultiplierBonus)
                .toNumber();
            const regenConfig = getStatusConfig("regen");
            const regenEffect: StatusEffect = {
                key: regenConfig.key,
                polarity: regenConfig.polarity,
                remainingTicks: regenConfig.remainingTicks,
                stacks: regenConfig.stacks,
                maxStacks: regenConfig.maxStacks,
                sourceId: entity.id,
                potency: regenPotency,
            };
            const existingRegen = blessTarget.statusEffects.find((statusEffect) => statusEffect.key === "regen");
            if (existingRegen) {
                existingRegen.remainingTicks = regenEffect.remainingTicks;
                existingRegen.potency = Math.max(existingRegen.potency, regenEffect.potency);
                existingRegen.sourceId = entity.id;
            } else {
                blessTarget.statusEffects.push(regenEffect);
            }
            setActiveSkill(entity, blessDefinition.name);
            entity.currentResource = entity.currentResource.minus(blessDefinition.cost);
            queueStatusEvent({
                target: blessTarget,
                statusKey: "regen",
                statusPhase: "apply",
                text: getStatusEffectName("regen"),
            });
            addLogMessage(`${entity.name} casts Bless on ${blessTarget.name}!`);
            const cleansedStatus = getCleanseableStatusEffect(blessTarget);
            if (cleansedStatus) {
                cleanseStatusEffect(blessTarget, cleansedStatus, queueStatusEvent, addLogMessage);
            }
            return true;
        }
    }

    if (entity.isEnemy && entity.enemyArchetype === "Support") {
        const supportAction = getEnemySupportAction(entity, livingAllies);

        if (supportAction?.type === "heal") {
            const rawHealAmount = entity.magicDamage.times(SUPPORT_HEAL_MULTIPLIER);
            const healAmount = rawHealAmount.times(getHealingMultiplier(supportAction.target));
            setActiveSkill(entity, supportAction.name);
            supportAction.target.currentHp = Decimal.min(
                supportAction.target.maxHp,
                supportAction.target.currentHp.plus(healAmount),
            );
            queueCombatEvent({
                sourceId: entity.id,
                targetId: supportAction.target.id,
                kind: "heal",
                text: `+${healAmount.floor().toString()}`,
                amount: healAmount.floor().toString(),
                ttlTicks: COMBAT_EVENT_TICKS,
            });
            addLogMessage(`${entity.name} casts ${supportAction.name} on ${supportAction.target.name} for ${healAmount.floor().toString()}!`);
            return true;
        }

        if (supportAction?.type === "guard") {
            setActiveSkill(entity, supportAction.name);
            supportAction.target.guardStacks = 1;
            queueCombatEvent({
                sourceId: entity.id,
                targetId: supportAction.target.id,
                kind: "skill",
                text: "Ward",
                ttlTicks: COMBAT_EVENT_TICKS,
            });
            addLogMessage(`${entity.name} casts ${supportAction.name} on ${supportAction.target.name}!`);
            return true;
        }
    }

    const aliveTargets = targets.filter((target) => target.currentHp.gt(0));
    if (aliveTargets.length === 0) {
        return false;
    }

    let action = getDamageAction(entity, buildState);
    action = {
        ...action,
        damage: action.damage.times(getDamageOutputMultiplier(entity)),
    };
    const target = selectTarget(entity, aliveTargets, action, randomSource);

    setActiveSkill(entity, action.name);

    const hitChance = action.deliveryType === "spell"
        ? getSpellHitChance(entity, target)
        : getPhysicalHitChance(entity, target);

    if (action.canDodge && randomSource.next() >= hitChance) {
        grantResolvedAttackResource(entity, buildState);
        queueCombatEvent({
            sourceId: entity.id,
            targetId: target.id,
            kind: "dodge",
            text: "Dodge",
            ttlTicks: COMBAT_EVENT_TICKS,
        });
        addLogMessage(`${target.name} dodges ${entity.name}'s ${action.name}!`);
        return true;
    }

    if (action.canParry && action.deliveryType === "melee" && action.damageElement === "physical" && randomSource.next() < getParryChance(entity, target)) {
        grantResolvedAttackResource(entity, buildState);
        queueCombatEvent({
            sourceId: entity.id,
            targetId: target.id,
            kind: "parry",
            text: "Parry",
            ttlTicks: COMBAT_EVENT_TICKS,
        });
        addLogMessage(`${target.name} parries ${entity.name}'s ${action.name}!`);
        return true;
    }

    let damage = action.damage;
    const isCrit = randomSource.next() < action.critChance;
    if (isCrit) {
        damage = damage.times(getEffectiveCritMultiplier(entity.critDamage, target.tenacity));
        queueCombatEvent({
            sourceId: entity.id,
            targetId: target.id,
            kind: "crit",
            text: "CRIT",
            isCrit: true,
            ttlTicks: COMBAT_EVENT_TICKS,
        });
    }

    let finalDamage = action.damageElement === "physical"
        ? applyPhysicalMitigation(damage, target.armor, entity.armorPenetration)
        : applyElementalMitigation(damage, target.resistances[action.damageElement], entity.elementalPenetration);

    let damageSuffix = "";
    if (target.guardStacks > 0) {
        finalDamage = finalDamage.times(1 - SUPPORT_GUARD_REDUCTION);
        target.guardStacks -= 1;
        damageSuffix = ` ${target.name}'s Ward softens the blow.`;
    }

    finalDamage = Decimal.max(1, finalDamage);
    target.currentHp = Decimal.max(0, target.currentHp.minus(finalDamage));

    queueCombatEvent({
        sourceId: entity.id,
        targetId: target.id,
        kind: "damage",
        text: `-${finalDamage.floor().toString()}`,
        amount: finalDamage.floor().toString(),
        isCrit,
        ttlTicks: COMBAT_EVENT_TICKS,
    });

    grantResolvedAttackResource(entity, buildState);
    grantTakeDamageResource(target, buildState);

    const critSuffix = isCrit ? " (CRIT)" : "";
    addLogMessage(`${entity.name} uses ${action.name} on ${target.name} for ${finalDamage.floor().toString()}!${critSuffix}${damageSuffix}`);

    const statusKey = getStatusKeyForElement(action.damageElement);
    if (statusKey && target.currentHp.gt(0)) {
        applyStatusEffect(entity, target, statusKey, randomSource, queueStatusEvent, addLogMessage);
    }

    if (target.currentHp.lte(0)) {
        handleDefeat(target);
    }

    return true;
};
