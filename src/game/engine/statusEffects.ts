import Decimal from "decimal.js";

import { getStatusEffectName, type DamageElement, type Entity, type StatusEffect, type StatusEffectKey } from "../entity";
import type { CombatEventStatusPhase } from "../store/types";

import { GAME_TICK_RATE } from "./constants";

export const MIN_STATUS_APPLICATION_CHANCE = 0.15;
export const MAX_STATUS_APPLICATION_CHANCE = 0.75;
export const STATUS_APPLICATION_SCALE = 0.003;
export const BURN_BASE_CHANCE = 0.45;
export const BURN_DURATION_TICKS = GAME_TICK_RATE * 4;
export const BURN_TICK_DAMAGE_MULTIPLIER = 0.15;
export const BURN_MAX_STACKS = 2;
export const SLOW_BASE_CHANCE = 0.35;
export const SLOW_DURATION_TICKS = GAME_TICK_RATE * 3;
export const SLOW_ATB_REDUCTION = 0.2;
export const WEAKEN_BASE_CHANCE = 0.35;
export const WEAKEN_DURATION_TICKS = GAME_TICK_RATE * 4;
export const WEAKEN_DAMAGE_REDUCTION = 0.15;
export const REGEN_DURATION_TICKS = GAME_TICK_RATE * 4;
export const REGEN_TICK_HEAL_MULTIPLIER = 0.15;
export const HEX_BASE_CHANCE = 0.35;
export const HEX_DURATION_TICKS = GAME_TICK_RATE * 3;
export const HEX_HEALING_REDUCTION = 0.3;
export const BLIND_BASE_CHANCE = 0.35;
export const BLIND_DURATION_TICKS = GAME_TICK_RATE * 3;
export const BLIND_ACCURACY_REDUCTION = 15;

interface StatusEventContext {
    target: Entity;
    statusKey: StatusEffectKey;
    statusPhase: CombatEventStatusPhase;
    text: string;
    amount?: string;
}

interface RandomSourceLike {
    next: () => number;
}

const clampChance = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

export const getStatusPotency = (entity: Entity, key: StatusEffectKey) => {
    return entity.statusEffects
        .filter((statusEffect) => statusEffect.key === key)
        .reduce((highestPotency, statusEffect) => Math.max(highestPotency, statusEffect.potency), 0);
};

export const getDamageOutputMultiplier = (entity: Entity) => {
    return Math.max(0, 1 - getStatusPotency(entity, "weaken"));
};

export const getHealingMultiplier = (entity: Entity) => {
    return Math.max(0, 1 - getStatusPotency(entity, "hex"));
};

export const getStatusConfig = (key: StatusEffectKey): Omit<StatusEffect, "sourceId"> => {
    switch (key) {
        case "burn":
            return {
                key,
                polarity: "debuff",
                remainingTicks: BURN_DURATION_TICKS,
                stacks: 1,
                maxStacks: BURN_MAX_STACKS,
                potency: BURN_TICK_DAMAGE_MULTIPLIER,
            };
        case "slow":
            return {
                key,
                polarity: "debuff",
                remainingTicks: SLOW_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: SLOW_ATB_REDUCTION,
            };
        case "weaken":
            return {
                key,
                polarity: "debuff",
                remainingTicks: WEAKEN_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: WEAKEN_DAMAGE_REDUCTION,
            };
        case "regen":
            return {
                key,
                polarity: "buff",
                remainingTicks: REGEN_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: REGEN_TICK_HEAL_MULTIPLIER,
            };
        case "hex":
            return {
                key,
                polarity: "debuff",
                remainingTicks: HEX_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: HEX_HEALING_REDUCTION,
            };
        case "blind":
            return {
                key,
                polarity: "debuff",
                remainingTicks: BLIND_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: BLIND_ACCURACY_REDUCTION,
            };
        default:
            return {
                key,
                polarity: "debuff",
                remainingTicks: GAME_TICK_RATE,
                stacks: 1,
                maxStacks: 1,
                potency: 0,
            };
    }
};

export const getStatusKeyForElement = (damageElement: DamageElement): StatusEffectKey | null => {
    switch (damageElement) {
        case "fire":
            return "burn";
        case "water":
            return "slow";
        case "earth":
            return "weaken";
        case "shadow":
            return "hex";
        case "light":
            return "blind";
        default:
            return null;
    }
};

export const getStatusBaseChance = (statusKey: StatusEffectKey) => {
    switch (statusKey) {
        case "burn":
            return BURN_BASE_CHANCE;
        case "slow":
            return SLOW_BASE_CHANCE;
        case "weaken":
            return WEAKEN_BASE_CHANCE;
        case "hex":
            return HEX_BASE_CHANCE;
        case "blind":
            return BLIND_BASE_CHANCE;
        default:
            return SLOW_BASE_CHANCE;
    }
};

export const getStatusApplicationChance = (attacker: Entity, defender: Entity, baseChance: number) =>
    clampChance(
        MIN_STATUS_APPLICATION_CHANCE,
        MAX_STATUS_APPLICATION_CHANCE,
        baseChance + ((attacker.elementalPenetration - defender.tenacity) * STATUS_APPLICATION_SCALE),
    );

export const getCleanseableStatusEffect = (target: Entity) => {
    return target.statusEffects.find((statusEffect) => statusEffect.key === "hex")
        ?? target.statusEffects.find((statusEffect) => statusEffect.polarity === "debuff");
};

export const cleanseStatusEffect = (
    target: Entity,
    statusEffect: StatusEffect,
    queueStatusEvent: (event: StatusEventContext) => void,
    addLogMessage: (message: string) => void,
) => {
    target.statusEffects = target.statusEffects.filter((activeStatus) => activeStatus !== statusEffect);
    queueStatusEvent({
        target,
        statusKey: statusEffect.key,
        statusPhase: "cleanse",
        text: `${getStatusEffectName(statusEffect.key)} cleansed`,
    });
    addLogMessage(`${target.name}'s ${getStatusEffectName(statusEffect.key)} is cleansed.`);
};

export const applyStatusEffect = (
    source: Entity,
    target: Entity,
    statusKey: StatusEffectKey,
    randomSource: RandomSourceLike,
    queueStatusEvent: (event: StatusEventContext) => void,
    addLogMessage: (message: string) => void,
) => {
    const applyChance = getStatusApplicationChance(source, target, getStatusBaseChance(statusKey));
    if (randomSource.next() >= applyChance) {
        return;
    }

    const existingEffect = target.statusEffects.find((statusEffect) => statusEffect.key === statusKey);
    const nextStatusEffect: StatusEffect = {
        ...getStatusConfig(statusKey),
        sourceId: source.id,
        potency: statusKey === "burn"
            ? source.magicDamage.times(BURN_TICK_DAMAGE_MULTIPLIER).toNumber()
            : getStatusConfig(statusKey).potency,
    };

    if (existingEffect) {
        existingEffect.remainingTicks = nextStatusEffect.remainingTicks;
        if (statusKey === "burn") {
            const shouldAdoptSource = nextStatusEffect.potency >= existingEffect.potency;
            existingEffect.stacks = Math.min(existingEffect.maxStacks, existingEffect.stacks + 1);
            existingEffect.potency = Math.max(existingEffect.potency, nextStatusEffect.potency);
            if (shouldAdoptSource) {
                existingEffect.sourceId = source.id;
            }
        } else {
            if (nextStatusEffect.potency >= existingEffect.potency) {
                existingEffect.sourceId = source.id;
            }
            existingEffect.potency = Math.max(existingEffect.potency, nextStatusEffect.potency);
        }

        const statusLabel = existingEffect.key === "burn" && existingEffect.stacks > 1
            ? `${getStatusEffectName(existingEffect.key)} x${existingEffect.stacks}`
            : getStatusEffectName(existingEffect.key);
        queueStatusEvent({
            target,
            statusKey,
            statusPhase: "apply",
            text: statusLabel,
        });
        addLogMessage(`${target.name} is afflicted with ${statusLabel}.`);
        return;
    }

    target.statusEffects.push(nextStatusEffect);
    queueStatusEvent({
        target,
        statusKey,
        statusPhase: "apply",
        text: getStatusEffectName(statusKey),
    });
    addLogMessage(`${target.name} is afflicted with ${getStatusEffectName(statusKey)}.`);
};

export const processStatusEffects = (
    entity: Entity,
    queueStatusEvent: (event: StatusEventContext) => void,
    addLogMessage: (message: string) => void,
    handleDefeat: (target: Entity) => void,
) => {
    if (entity.currentHp.lte(0) || entity.statusEffects.length === 0) {
        return;
    }

    entity.statusEffects = entity.statusEffects.flatMap((statusEffect) => {
        const nextRemainingTicks = Math.max(0, statusEffect.remainingTicks - 1);
        const nextStatusEffect = { ...statusEffect, remainingTicks: nextRemainingTicks };

        if (statusEffect.key === "burn" && nextRemainingTicks % GAME_TICK_RATE === 0) {
            const burnDamage = Decimal.max(1, new Decimal(nextStatusEffect.potency).times(nextStatusEffect.stacks)).floor();
            entity.currentHp = Decimal.max(0, entity.currentHp.minus(burnDamage));
            queueStatusEvent({
                target: entity,
                statusKey: "burn",
                statusPhase: "tick",
                text: `${getStatusEffectName("burn")} -${burnDamage.toString()}`,
                amount: burnDamage.toString(),
            });
            addLogMessage(`${entity.name} suffers ${burnDamage.toString()} burn damage.`);
        }

        if (statusEffect.key === "regen" && nextRemainingTicks % GAME_TICK_RATE === 0) {
            const healAmount = Decimal.max(1, nextStatusEffect.potency).floor();
            entity.currentHp = Decimal.min(entity.maxHp, entity.currentHp.plus(healAmount));
            queueStatusEvent({
                target: entity,
                statusKey: "regen",
                statusPhase: "tick",
                text: `${getStatusEffectName("regen")} +${healAmount.toString()}`,
                amount: healAmount.toString(),
            });
            addLogMessage(`${entity.name} regenerates ${healAmount.toString()} HP.`);
        }

        if (nextRemainingTicks <= 0 || entity.currentHp.lte(0)) {
            queueStatusEvent({
                target: entity,
                statusKey: statusEffect.key,
                statusPhase: "expire",
                text: `${getStatusEffectName(statusEffect.key)} fades`,
            });
            addLogMessage(`${entity.name}'s ${getStatusEffectName(statusEffect.key)} fades.`);
            return [];
        }

        return [nextStatusEffect];
    });

    if (entity.currentHp.lte(0)) {
        handleDefeat(entity);
    }
};
