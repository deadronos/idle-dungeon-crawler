import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import {
    getEarnedTalentPointTotal,
    getHeroBuildProfile,
    type HeroBuildState,
} from "../heroBuilds";
import {
    getExpRequirement,
    getStatusEffectName,
    isHeroClass,
    recalculateEntity,
    type Entity,
    type StatusEffect,
    type StatusEffectKey,
} from "../entity";
import { formatEquipmentTierRank, getHighestUnlockedEquipmentTier, grantVictoryLoot } from "../equipmentProgression";
import { getEquipmentDefinition } from "../heroBuilds";
import { getNextPartySlotUnlock } from "../partyProgression";
import { getInsightXpMultiplier } from "../progressionMath";
import type { CombatEvent, GameState } from "../store/types";
import { secureRandom } from "../../utils/random";

import {
    COMBAT_EVENT_TICKS,
    SKILL_BANNER_TICKS,
    createCombatEvent,
    decrementCombatEvents,
    prependCombatMessages,
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
    cloneEntity,
    getPartyWipeState,
    getPostVictoryFloorReplayState,
    getPostVictoryFloorTransitionState,
} from "./encounter";
import { GAME_TICK_MS } from "./constants";
import {
    applyStatusEffect,
    cleanseStatusEffect,
    getCleanseableStatusEffect,
    getDamageOutputMultiplier,
    getHealingMultiplier,
    getStatusConfig,
    getStatusKeyForElement,
    processStatusEffects,
} from "./statusEffects";

export { ATB_RATE, GAME_TICK_MS, GAME_TICK_RATE, HASTE_ATB_RATE } from "./constants";
export { COMBAT_EVENT_TICKS, prependCombatMessages } from "./combatEvents";
export {
    getActionProgressPerTick,
    getEffectiveCritMultiplier,
    getParryChance,
    getPenetrationReduction,
    getPhysicalHitChance,
    getSpellHitChance,
    applyElementalMitigation,
    applyPhysicalMitigation,
} from "./combatMath";
export {
    cloneEntity,
    createEncounter,
    createInitialGameState,
    getEncounterSize,
    getFloorReplayState,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    getPostVictoryFloorReplayState,
    getPostVictoryFloorTransitionState,
    isBossFloor,
    POST_VICTORY_HP_RECOVERY_RATIO,
    recalculateParty,
} from "./encounter";
export {
    getStatusApplicationChance,
    BURN_DURATION_TICKS,
    HEX_DURATION_TICKS,
    REGEN_DURATION_TICKS,
} from "./statusEffects";

export const WARRIOR_RAGE_STRIKE_COST = getHeroClassTemplate("Warrior").actionPackage.specialAttack?.cost ?? 40;
export const WARRIOR_RAGE_PER_ATTACK = getHeroClassTemplate("Warrior").resourceModel.gainOnResolvedAttack;
export const WARRIOR_RAGE_WHEN_HIT = getHeroClassTemplate("Warrior").resourceModel.gainOnTakeDamage;
export const ARCHER_PIERCING_SHOT_COST = getHeroClassTemplate("Archer").actionPackage.specialAttack?.cost ?? 35;
export const ARCHER_PIERCING_SHOT_CRIT_BONUS = getHeroClassTemplate("Archer").actionPackage.specialAttack?.critChanceBonus ?? 0.15;
export const ARCHER_CUNNING_REGEN_PER_TICK = getHeroClassTemplate("Archer").resourceModel.regenFlat;
export const CLERIC_BLESS_COST = getHeroClassTemplate("Cleric").actionPackage.bless?.cost ?? 25;

export type SimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

export interface SimulationResult {
    state: GameState;
    outcome: SimulationOutcome;
}

export interface SimulationRandomSource {
    next: () => number;
}

const defaultRandomSource: SimulationRandomSource = {
    next: () => secureRandom(),
};

export const createSequenceRandomSource = (...rolls: number[]): SimulationRandomSource => {
    let index = 0;

    return {
        next: () => {
            if (rolls.length === 0) {
                return 0;
            }

            const nextRoll = rolls[Math.min(index, rolls.length - 1)];
            index += 1;
            return nextRoll;
        },
    };
};

const getVictoryLootMessages = ({
    previousHighestTier,
    highestFloorCleared,
    lootResult,
}: {
    previousHighestTier: number;
    highestFloorCleared: number;
    lootResult: ReturnType<typeof grantVictoryLoot>;
}) => {
    const unlockedTier = getHighestUnlockedEquipmentTier(highestFloorCleared);
    return [
        unlockedTier > previousHighestTier ? `Armory tier ${unlockedTier} is now available.` : null,
        ...lootResult.gainedItems.map((item) => {
            const definition = getEquipmentDefinition(item.definitionId);
            return definition ? `Found ${definition.name} ${formatEquipmentTierRank(item)}.` : null;
        }),
        ...lootResult.autoSoldItems.map((item) => {
            const definition = getEquipmentDefinition(item.definitionId);
            return definition ? `${definition.name} ${formatEquipmentTierRank(item)} auto-sold for ${item.sellValue} gold.` : null;
        }),
    ].filter((message): message is string => Boolean(message));
};

const getPostVictorySimulationState = (
    state: GameState,
    randomSource: SimulationRandomSource,
): GameState => {
    const clearedFloor = state.floor;
    const highestFloorCleared = Math.max(state.highestFloorCleared, clearedFloor);
    const previousHighestTier = state.equipmentProgression.highestUnlockedEquipmentTier;
    let nextState = state;

    if (highestFloorCleared !== state.highestFloorCleared) {
        const nextUnlock = getNextPartySlotUnlock(state.partyCapacity);
        const hasUnlockedNextSlot = nextUnlock && highestFloorCleared >= nextUnlock.milestoneFloor;

        nextState = {
            ...nextState,
            highestFloorCleared,
            combatLog: hasUnlockedNextSlot
                ? prependCombatMessages(nextState.combatLog, "A new party slot can now be unlocked in the shop.")
                : nextState.combatLog,
        };
    }

    const lootResult = grantVictoryLoot(
        nextState.equipmentProgression,
        nextState.party,
        clearedFloor,
        highestFloorCleared,
        randomSource,
    );
    const lootMessages = getVictoryLootMessages({
        previousHighestTier,
        highestFloorCleared,
        lootResult,
    });

    nextState = {
        ...nextState,
        gold: nextState.gold.plus(lootResult.autoSellGold),
        equipmentProgression: lootResult.equipmentProgression,
        combatLog: lootMessages.length > 0 ? prependCombatMessages(nextState.combatLog, ...lootMessages) : nextState.combatLog,
    };

    return nextState.autoAdvance
        ? { ...nextState, ...getPostVictoryFloorTransitionState(nextState, nextState.floor + 1) }
        : { ...nextState, ...getPostVictoryFloorReplayState(nextState) };
};

export const stepSimulationState = (
    state: GameState,
    deltaMs = GAME_TICK_MS,
    randomSource: SimulationRandomSource = defaultRandomSource,
): GameState => {
    const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));
    let nextState = state;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        const result = simulateTick(nextState, randomSource);
        nextState = result.state;

        if (result.outcome === "party-wipe") {
            return { ...nextState, ...getPartyWipeState(nextState) };
        }

        if (result.outcome === "victory") {
            return getPostVictorySimulationState(nextState, randomSource);
        }
    }

    return nextState;
};

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

export const simulateTick = (state: GameState, randomSource: SimulationRandomSource = defaultRandomSource): SimulationResult => {
    const draft: GameState = {
        ...state,
        party: state.party.map(cloneEntity),
        enemies: state.enemies.map(cloneEntity),
        gold: new Decimal(state.gold),
        combatLog: [...state.combatLog],
        combatEvents: state.combatEvents.map((event) => ({ ...event })),
        metaUpgrades: { ...state.metaUpgrades },
        talentProgression: {
            talentRanksByHeroId: Object.fromEntries(
                Object.entries(state.talentProgression.talentRanksByHeroId).map(([heroId, talentRanks]) => [heroId, { ...talentRanks }]),
            ),
            talentPointsByHeroId: { ...state.talentProgression.talentPointsByHeroId },
        },
        equipmentProgression: {
            inventoryItems: state.equipmentProgression.inventoryItems.map((item) => ({ ...item, affinityTags: [...item.affinityTags] })),
            equippedItemInstanceIdsByHeroId: Object.fromEntries(
                Object.entries(state.equipmentProgression.equippedItemInstanceIdsByHeroId).map(([heroId, itemIds]) => [heroId, [...itemIds]]),
            ),
            highestUnlockedEquipmentTier: state.equipmentProgression.highestUnlockedEquipmentTier,
            inventoryCapacityLevel: state.equipmentProgression.inventoryCapacityLevel,
            inventoryCapacity: state.equipmentProgression.inventoryCapacity,
            nextInstanceSequence: state.equipmentProgression.nextInstanceSequence,
        },
    };
    const buildState: HeroBuildState = {
        talentProgression: draft.talentProgression,
        equipmentProgression: draft.equipmentProgression,
    };

    let anyActionTaken = false;
    let anyVisualUpdate = false;
    const logMessages: string[] = [];
    const addLogMessage = (message: string) => {
        logMessages.push(message);
    };
    const combatEvents: CombatEvent[] = decrementCombatEvents(draft.combatEvents);
    if (draft.combatEvents.length > 0) {
        anyVisualUpdate = true;
    }
    draft.combatEvents = combatEvents;

    const queueCombatEvent = (event: Omit<CombatEvent, "id">) => {
        draft.combatEvents.push(createCombatEvent(event));
        anyVisualUpdate = true;
    };

    const queueStatusEvent = ({
        target,
        statusKey,
        statusPhase,
        text,
        amount,
    }: {
        target: Entity;
        statusKey: StatusEffectKey;
        statusPhase: "apply" | "tick" | "expire" | "cleanse";
        text: string;
        amount?: string;
    }) => {
        queueCombatEvent({
            targetId: target.id,
            kind: "status",
            text,
            amount,
            statusKey,
            statusPhase,
            ttlTicks: COMBAT_EVENT_TICKS,
        });
    };

    const handleDefeat = (target: Entity) => {
        queueCombatEvent({
            targetId: target.id,
            kind: "defeat",
            text: "Defeated",
            ttlTicks: COMBAT_EVENT_TICKS,
        });
        logMessages.push(`${target.name} was defeated!`);

        if (!target.isEnemy) {
            return;
        }

        const baseExp = new Decimal(draft.floor).times(10).plus(target.attributes.vit);
        const xpBonus = getInsightXpMultiplier(draft.prestigeUpgrades.xpMultiplier);
        const experienceReward = baseExp.times(xpBonus).floor();
        const goldReward = new Decimal(draft.floor).times(2).plus(5);
        draft.gold = draft.gold.plus(goldReward);

        draft.party.forEach((hero, index) => {
            if (hero.currentHp.lte(0)) {
                return;
            }

            draft.party[index] = { ...hero, exp: hero.exp.plus(experienceReward) };

            let nextHero = draft.party[index];
            while (nextHero.exp.gte(nextHero.expToNext)) {
                const earnedPointsBefore = isHeroClass(nextHero.class)
                    ? getEarnedTalentPointTotal(nextHero.class, nextHero.level)
                    : 0;
                nextHero.exp = nextHero.exp.minus(nextHero.expToNext);
                nextHero.level += 1;
                nextHero.expToNext = getExpRequirement(nextHero.level);
                const heroTemplate = getHeroClassTemplate(nextHero.class);
                nextHero.attributes.str += heroTemplate.growth.str;
                nextHero.attributes.vit += heroTemplate.growth.vit;
                nextHero.attributes.dex += heroTemplate.growth.dex;
                nextHero.attributes.int += heroTemplate.growth.int;
                nextHero.attributes.wis += heroTemplate.growth.wis;
                const earnedPointsAfter = isHeroClass(nextHero.class)
                    ? getEarnedTalentPointTotal(nextHero.class, nextHero.level)
                    : 0;
                const gainedTalentPoints = Math.max(0, earnedPointsAfter - earnedPointsBefore);

                if (gainedTalentPoints > 0) {
                    draft.talentProgression.talentPointsByHeroId[nextHero.id] =
                        (draft.talentProgression.talentPointsByHeroId[nextHero.id] ?? 0) + gainedTalentPoints;
                    logMessages.push(`${nextHero.name} gained ${gainedTalentPoints} talent point${gainedTalentPoints === 1 ? "" : "s"}!`);
                }

                nextHero = recalculateEntity(nextHero, draft.metaUpgrades, draft.prestigeUpgrades, buildState);
                logMessages.push(`${nextHero.name} reached level ${nextHero.level}!`);
            }

            draft.party[index] = nextHero;
        });
    };

    const updateSkillBanner = (entity: Entity) => {
        if (entity.activeSkillTicks <= 0) {
            return;
        }

        entity.activeSkillTicks -= 1;
        anyVisualUpdate = true;

        if (entity.activeSkillTicks === 0) {
            entity.activeSkill = null;
        }
    };

    const setActiveSkill = (entity: Entity, skill: string) => {
        entity.activeSkill = `Casting ${skill}`;
        entity.activeSkillTicks = SKILL_BANNER_TICKS;
        anyVisualUpdate = true;
        queueCombatEvent({
            sourceId: entity.id,
            kind: "skill",
            text: skill,
            ttlTicks: COMBAT_EVENT_TICKS,
        });
    };

    draft.party.forEach(updateSkillBanner);
    draft.enemies.forEach(updateSkillBanner);

    let livingHeroes = draft.party.filter((hero) => hero.currentHp.gt(0));
    let livingEnemies = draft.enemies.filter((enemy) => enemy.currentHp.gt(0));

    if (livingHeroes.length === 0) {
        return { state, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        return { state: anyVisualUpdate ? draft : state, outcome: "victory" };
    }

    if (!draft.autoFight) {
        return { state: anyVisualUpdate ? draft : state, outcome: "paused" };
    }

    draft.party.forEach((hero) => processStatusEffects(hero, queueStatusEvent, addLogMessage, handleDefeat));
    draft.enemies.forEach((enemy) => processStatusEffects(enemy, queueStatusEvent, addLogMessage, handleDefeat));

    livingHeroes = draft.party.filter((hero) => hero.currentHp.gt(0));
    livingEnemies = draft.enemies.filter((enemy) => enemy.currentHp.gt(0));

    if (livingHeroes.length === 0) {
        if (logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        if (logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "victory" };
    }

    const tickEntity = (entity: Entity, allies: Entity[], targets: Entity[]) => {
        if (entity.currentHp.lte(0)) {
            return;
        }

        entity.actionProgress += getActionProgressPerTick(entity, draft.prestigeUpgrades, buildState);
        const heroTemplate = getHeroTemplateForEntity(entity);
        const heroBuildProfile = getHeroBuildProfile(entity, buildState);

        if (heroTemplate) {
            let regen = 0;
            if (heroTemplate.resourceModel.regenKind === "flat") {
                regen = heroTemplate.resourceModel.regenFlat;
            } else if (heroTemplate.resourceModel.regenKind === "attribute" && heroTemplate.resourceModel.regenAttribute) {
                regen = entity.attributes[heroTemplate.resourceModel.regenAttribute] * (heroTemplate.resourceModel.regenAttributeMultiplier ?? 0);
            }

            if (regen > 0) {
                entity.currentResource = entity.currentResource.plus(regen);
                if (entity.currentResource.gt(entity.maxResource)) {
                    entity.currentResource = entity.maxResource;
                }
            }
        }

        if (entity.actionProgress < 100) {
            return;
        }

        entity.actionProgress = 0;
        anyActionTaken = true;

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
                logMessages.push(`${entity.name} casts Mend on ${healTarget.name} for ${healAmount.floor().toString()}!`);
                return;
            }

            const blessDefinition = heroTemplate.actionPackage.bless;
            const blessTarget = livingAllies.find((ally) => ally.id !== entity.id && getCleanseableStatusEffect(ally))
                ?? livingAllies.find((ally) => ally.id !== entity.id && !ally.statusEffects.some((statusEffect) => statusEffect.key === "regen"));
            if (blessDefinition && blessTarget && entity.currentResource.gte(blessDefinition.cost)) {
                const regenPotency = entity.magicDamage
                    .times(blessDefinition.regenMultiplier + heroBuildProfile.effects.blessRegenMultiplierBonus)
                    .toNumber();
                const regenEffect: StatusEffect = {
                    ...getStatusConfig("regen"),
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
                logMessages.push(`${entity.name} casts Bless on ${blessTarget.name}!`);
                const cleansedStatus = getCleanseableStatusEffect(blessTarget);
                if (cleansedStatus) {
                    cleanseStatusEffect(blessTarget, cleansedStatus, queueStatusEvent, addLogMessage);
                }
                return;
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
                logMessages.push(`${entity.name} casts ${supportAction.name} on ${supportAction.target.name} for ${healAmount.floor().toString()}!`);
                return;
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
                logMessages.push(`${entity.name} casts ${supportAction.name} on ${supportAction.target.name}!`);
                return;
            }
        }

        const aliveTargets = targets.filter((target) => target.currentHp.gt(0));
        if (aliveTargets.length === 0) {
            return;
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
            logMessages.push(`${target.name} dodges ${entity.name}'s ${action.name}!`);
            return;
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
            logMessages.push(`${target.name} parries ${entity.name}'s ${action.name}!`);
            return;
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
        logMessages.push(`${entity.name} uses ${action.name} on ${target.name} for ${finalDamage.floor().toString()}!${critSuffix}${damageSuffix}`);

        const statusKey = getStatusKeyForElement(action.damageElement);
        if (statusKey && target.currentHp.gt(0)) {
            applyStatusEffect(entity, target, statusKey, randomSource, queueStatusEvent, addLogMessage);
        }

        if (target.currentHp.lte(0)) {
            handleDefeat(target);
        }
    };

    draft.party.forEach((hero) => {
        tickEntity(hero, draft.party, draft.enemies);
    });

    draft.enemies.forEach((enemy) => {
        tickEntity(enemy, draft.enemies, draft.party);
    });

    if (logMessages.length > 0) {
        draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
    }

    if (anyActionTaken || anyVisualUpdate) {
        return { state: draft, outcome: "running" };
    }

    return { state: draft, outcome: "running" };
};
