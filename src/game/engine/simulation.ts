import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import {
    BASE_META_UPGRADES,
    createEnemy,
    getEncounterArchetypes,
    getEnemyElementForEncounter,
    getExpRequirement,
    getStatusEffectName,
    isHeroClass,
    inferEnemyArchetype,
    recalculateEntity,
} from "../entity";
import type { DamageElement, EnemyArchetype, Entity, MetaUpgrades, PrestigeUpgrades, StatusEffect, StatusEffectKey } from "../entity";
import { MAX_PARTY_SIZE } from "../partyProgression";
import type { CombatEvent, GameState } from "../store/types";

export const GAME_TICK_RATE = 20;
export const GAME_TICK_MS = 1000 / GAME_TICK_RATE;
export const ATB_RATE = 2;
export const DEX_ATB_RATE = 0.06;
export const WARRIOR_RAGE_STRIKE_COST = getHeroClassTemplate("Warrior").actionPackage.specialAttack?.cost ?? 40;
export const WARRIOR_RAGE_PER_ATTACK = getHeroClassTemplate("Warrior").resourceModel.gainOnResolvedAttack;
export const WARRIOR_RAGE_WHEN_HIT = getHeroClassTemplate("Warrior").resourceModel.gainOnTakeDamage;
export const ARCHER_PIERCING_SHOT_COST = getHeroClassTemplate("Archer").actionPackage.specialAttack?.cost ?? 35;
export const ARCHER_PIERCING_SHOT_CRIT_BONUS = getHeroClassTemplate("Archer").actionPackage.specialAttack?.critChanceBonus ?? 0.15;
export const ARCHER_CUNNING_REGEN_PER_TICK = getHeroClassTemplate("Archer").resourceModel.regenFlat;
export const ARMOR_MITIGATION_SCALE = 2;
export const MAX_PENETRATION_REDUCTION = 0.6;
export const PENETRATION_SOFTCAP = 60;
export const MAX_TENACITY_REDUCTION = 0.6;
export const TENACITY_SOFTCAP = 80;
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
export const CLERIC_BLESS_COST = getHeroClassTemplate("Cleric").actionPackage.bless?.cost ?? 25;

const SKILL_BANNER_TICKS = GAME_TICK_RATE;
const COMBAT_EVENT_TICKS = Math.round(GAME_TICK_RATE * 1.4);
const COMBAT_LOG_LIMIT = 10;
const MIN_PHYSICAL_HIT_CHANCE = 0.72;
const MAX_PHYSICAL_HIT_CHANCE = 0.97;
const MIN_SPELL_HIT_CHANCE = 0.74;
const MAX_SPELL_HIT_CHANCE = 0.96;
const MAX_PARRY_CHANCE = 0.25;
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
let combatEventSequence = 0;

type DeliveryType = "melee" | "ranged" | "spell";

interface DamageAction {
    name: string;
    damage: Decimal;
    damageElement: DamageElement;
    deliveryType: DeliveryType;
    critChance: number;
    canDodge: boolean;
    canParry: boolean;
}

interface SupportAction {
    type: "heal" | "guard";
    name: string;
    target: Entity;
}

export type SimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

export interface SimulationResult {
    state: GameState;
    outcome: SimulationOutcome;
}

export interface SimulationRandomSource {
    next: () => number;
}

const defaultRandomSource: SimulationRandomSource = {
    next: () => Math.random(),
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

export const isBossFloor = (floor: number) => floor % 10 === 0;

export const getEncounterSize = (floor: number) => {
    if (isBossFloor(floor)) {
        return 1;
    }

    const floorCap = Math.max(1, Math.min(MAX_PARTY_SIZE, Math.ceil(floor / 5)));
    return floorCap;
};

export const createEncounter = (floor: number) => {
    const encounterSize = getEncounterSize(floor);
    const archetypes = getEncounterArchetypes(floor, encounterSize);

    return archetypes.map((archetype, index) => createEnemy(floor, `enemy_${floor}_${index}`, {
        archetype,
        boss: archetype === "Boss",
        element: archetype === "Caster" || archetype === "Boss"
            ? getEnemyElementForEncounter(floor, index)
            : undefined,
    }));
};

export const cloneEntity = (entity: Entity): Entity => ({
    ...entity,
    enemyArchetype: inferEnemyArchetype(entity),
    enemyElement: (() => {
        const archetype = inferEnemyArchetype(entity);
        if (archetype === "Caster" || archetype === "Boss") {
            return entity.enemyElement ?? getEnemyElementForEncounter(entity.level);
        }

        return null;
    })(),
    exp: new Decimal(entity.exp),
    expToNext: new Decimal(entity.expToNext),
    attributes: { ...entity.attributes },
    maxHp: new Decimal(entity.maxHp),
    currentHp: new Decimal(entity.currentHp),
    maxResource: new Decimal(entity.maxResource),
    currentResource: new Decimal(entity.currentResource),
    armor: new Decimal(entity.armor),
    physicalDamage: new Decimal(entity.physicalDamage),
    magicDamage: new Decimal(entity.magicDamage),
    accuracyRating: entity.accuracyRating ?? 0,
    evasionRating: entity.evasionRating ?? 0,
    parryRating: entity.parryRating ?? 0,
    armorPenetration: entity.armorPenetration ?? 0,
    elementalPenetration: entity.elementalPenetration ?? 0,
    tenacity: entity.tenacity ?? 0,
    resistances: { ...entity.resistances },
    activeSkill: entity.activeSkill,
    activeSkillTicks: entity.activeSkillTicks,
    guardStacks: entity.guardStacks ?? 0,
    statusEffects: (entity.statusEffects ?? []).map((statusEffect) => ({ ...statusEffect })),
});

const clearEncounterState = (entity: Entity): Entity => ({
    ...cloneEntity(entity),
    activeSkill: null,
    activeSkillTicks: 0,
    guardStacks: 0,
    actionProgress: 0,
    statusEffects: [],
});

export const recalculateParty = (party: Entity[], upgrades: MetaUpgrades, prestigeUpgrades?: PrestigeUpgrades): Entity[] => {
    return party.map((hero) => recalculateEntity(cloneEntity(hero), upgrades, prestigeUpgrades));
};

export const prependCombatMessages = (combatLog: string[], ...messages: string[]) => {
    return [...messages.filter(Boolean), ...combatLog].slice(0, COMBAT_LOG_LIMIT);
};

const hasValidCombatRatings = (entity: Partial<Entity>) => {
    return [
        entity.accuracyRating,
        entity.evasionRating,
        entity.parryRating,
        entity.armorPenetration,
        entity.elementalPenetration,
        entity.tenacity,
    ].every(
        (rating) => typeof rating === "number" && Number.isFinite(rating),
    );
};

const hydrateEntity = (entity: Entity, upgrades: MetaUpgrades, prestigeUpgrades?: PrestigeUpgrades) => {
    const cloned = cloneEntity(entity);

    if (hasValidCombatRatings(entity)) {
        return cloned;
    }

    return recalculateEntity(cloned, upgrades, prestigeUpgrades);
};

export const createInitialGameState = (overrides?: Partial<GameState>): GameState => {
    const metaUpgrades = { ...BASE_META_UPGRADES, ...overrides?.metaUpgrades };
    const prestigeUpgrades = {
        costReducer: overrides?.prestigeUpgrades?.costReducer ?? 0,
        hpMultiplier: overrides?.prestigeUpgrades?.hpMultiplier ?? 0,
        gameSpeed: overrides?.prestigeUpgrades?.gameSpeed ?? 0,
        xpMultiplier: overrides?.prestigeUpgrades?.xpMultiplier ?? 0,
    };

    return {
        party: overrides?.party?.map((entity) => hydrateEntity(entity, metaUpgrades, prestigeUpgrades)) ?? [],
        enemies: overrides?.enemies?.map((entity) => hydrateEntity(entity, BASE_META_UPGRADES)) ?? [],
        gold: new Decimal(overrides?.gold ?? 0),
        floor: overrides?.floor ?? 1,
        autoFight: overrides?.autoFight ?? true,
        autoAdvance: overrides?.autoAdvance ?? true,
        combatLog: overrides?.combatLog ? [...overrides.combatLog] : [],
        combatEvents: overrides?.combatEvents ? overrides.combatEvents.map((event) => ({ ...event })) : [],
        metaUpgrades,
        partyCapacity: overrides?.partyCapacity ?? 1,
        maxPartySize: overrides?.maxPartySize ?? MAX_PARTY_SIZE,
        highestFloorCleared: overrides?.highestFloorCleared ?? 0,
        activeSection: overrides?.activeSection ?? "dungeon",
        heroSouls: new Decimal(overrides?.heroSouls ?? 0),
        prestigeUpgrades,
    };
};

export const getInitializedPartyState = (state: GameState, party: Entity[]): Partial<GameState> => ({
    party: recalculateParty(party, state.metaUpgrades, state.prestigeUpgrades),
    enemies: createEncounter(1),
    combatLog: [`${party[0]?.name ?? "The party"} leads the party into the dungeon...`],
    combatEvents: [],
    activeSection: "dungeon",
});

export const getFloorTransitionState = (state: GameState, floor: number): Partial<GameState> => ({
    floor,
    party: state.party.map(clearEncounterState),
    enemies: createEncounter(floor),
    combatLog: prependCombatMessages(state.combatLog, `Moved to floor ${floor}...`),
    combatEvents: [],
});

export const getFloorReplayState = (state: GameState): Partial<GameState> => ({
    party: state.party.map(clearEncounterState),
    enemies: createEncounter(state.floor),
    combatLog: prependCombatMessages(state.combatLog, `Repeating floor ${state.floor}...`),
    combatEvents: [],
});

export const getPartyWipeState = (state: GameState): Partial<GameState> => {
    const healedParty = state.party.map((hero) => {
        const refreshed = recalculateEntity(cloneEntity(hero), state.metaUpgrades, state.prestigeUpgrades);
        const heroTemplate = getHeroClassTemplate(hero.class);
        refreshed.currentHp = refreshed.maxHp;
        refreshed.currentResource = heroTemplate.resourceModel.startsFull ? refreshed.maxResource : new Decimal(0);
        refreshed.guardStacks = 0;
        refreshed.statusEffects = [];
        refreshed.activeSkill = null;
        refreshed.activeSkillTicks = 0;
        refreshed.actionProgress = 0;
        return refreshed;
    });

    return {
        floor: 1,
        gold: new Decimal(0),
        party: healedParty,
        enemies: createEncounter(1),
        combatLog: prependCombatMessages(state.combatLog, "The party was wiped out! Resetting to Floor 1..."),
        combatEvents: [],
    };
};

const getHeroTemplateForEntity = (entity: Entity) => {
    if (entity.isEnemy || !isHeroClass(entity.class)) {
        return null;
    }

    return getHeroClassTemplate(entity.class);
};

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

export const getStatusApplicationChance = (attacker: Entity, defender: Entity, baseChance: number) =>
    clampChance(
        MIN_STATUS_APPLICATION_CHANCE,
        MAX_STATUS_APPLICATION_CHANCE,
        baseChance + ((attacker.elementalPenetration - defender.tenacity) * STATUS_APPLICATION_SCALE),
    );

const getStatusPotency = (entity: Entity, key: StatusEffectKey) => {
    return entity.statusEffects
        .filter((statusEffect) => statusEffect.key === key)
        .reduce((highestPotency, statusEffect) => Math.max(highestPotency, statusEffect.potency), 0);
};

const getDamageOutputMultiplier = (entity: Entity) => {
    return Math.max(0, 1 - getStatusPotency(entity, "weaken"));
};

const getAtbMultiplier = (entity: Entity) => {
    return Math.max(0.1, 1 - getStatusPotency(entity, "slow"));
};

/** Returns a multiplier (0–1) reducing incoming healing by the target's hex potency. */
const getHealingMultiplier = (entity: Entity) => {
    return Math.max(0, 1 - getStatusPotency(entity, "hex"));
};

const getStatusConfig = (key: StatusEffectKey): Omit<StatusEffect, "sourceId"> => {
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

const getStatusKeyForElement = (damageElement: DamageElement): StatusEffectKey | null => {
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

const getStatusBaseChance = (statusKey: StatusEffectKey) => {
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

const createCombatEvent = (event: Omit<CombatEvent, "id">): CombatEvent => {
    combatEventSequence += 1;

    return {
        ...event,
        id: `combat-event-${combatEventSequence}`,
    };
};

const decrementCombatEvents = (events: CombatEvent[]) => {
    return events
        .map((event) => ({ ...event, ttlTicks: event.ttlTicks - 1 }))
        .filter((event) => event.ttlTicks > 0);
};

const getHpRatio = (entity: Entity) => entity.currentHp.div(entity.maxHp).toNumber();

const getLowestHpRatioTarget = (entities: Entity[]) => {
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

const getEnemySupportAction = (entity: Entity, allies: Entity[]): SupportAction | null => {
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

const selectTarget = (entity: Entity, targets: Entity[], action: DamageAction, randomSource: SimulationRandomSource) => {
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

const getDamageAction = (entity: Entity): DamageAction => {
    if (entity.isEnemy) {
        return getEnemyDamageAction(entity, inferEnemyArchetype(entity) ?? "Bruiser");
    }

    const heroTemplate = getHeroClassTemplate(entity.class);
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
            if (specialAttack && entity.currentResource.gte(specialAttack.cost)) {
                entity.currentResource = entity.currentResource.minus(specialAttack.cost);
                action = {
                    ...action,
                    name: specialAttack.name,
                    damage: entity.physicalDamage.times(specialAttack.damageMultiplier),
                    canParry: specialAttack.canParry,
                };
            }
            break;
        }
        case "archer": {
            const specialAttack = heroTemplate.actionPackage.specialAttack;
            if (specialAttack && entity.currentResource.gte(specialAttack.cost)) {
                entity.currentResource = entity.currentResource.minus(specialAttack.cost);
                action = {
                    ...action,
                    name: specialAttack.name,
                    damage: entity.physicalDamage.times(specialAttack.damageMultiplier),
                    critChance: Math.min(1, entity.critChance + (specialAttack.critChanceBonus ?? 0)),
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

const grantResolvedAttackResource = (entity: Entity) => {
    const heroTemplate = getHeroTemplateForEntity(entity);
    if (!heroTemplate || heroTemplate.resourceModel.gainOnResolvedAttack <= 0) {
        return;
    }

    entity.currentResource = Decimal.min(entity.maxResource, entity.currentResource.plus(heroTemplate.resourceModel.gainOnResolvedAttack));
};

const grantTakeDamageResource = (entity: Entity) => {
    const heroTemplate = getHeroTemplateForEntity(entity);
    if (!heroTemplate || heroTemplate.resourceModel.gainOnTakeDamage <= 0) {
        return;
    }

    entity.currentResource = Decimal.min(entity.maxResource, entity.currentResource.plus(heroTemplate.resourceModel.gainOnTakeDamage));
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
    };

    let anyActionTaken = false;
    let anyVisualUpdate = false;
    const logMessages: string[] = [];
    const combatEvents: CombatEvent[] = decrementCombatEvents(draft.combatEvents);
    if (draft.combatEvents.length > 0) {
        anyVisualUpdate = true;
    }
    draft.combatEvents = combatEvents;

    const queueCombatEvent = (event: Omit<CombatEvent, "id">) => {
        draft.combatEvents.push(createCombatEvent(event));
        anyVisualUpdate = true;
    };

    const queueStatusEvent = (
        target: Entity,
        statusKey: StatusEffectKey,
        statusPhase: "apply" | "tick" | "expire" | "cleanse",
        text: string,
        amount?: string,
    ) => {
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

    const getCleanseableStatusEffect = (target: Entity) => {
        return target.statusEffects.find((statusEffect) => statusEffect.key === "hex")
            ?? target.statusEffects.find((statusEffect) => statusEffect.polarity === "debuff");
    };

    const cleanseStatusEffect = (target: Entity, statusEffect: StatusEffect) => {
        target.statusEffects = target.statusEffects.filter((activeStatus) => activeStatus !== statusEffect);
        queueStatusEvent(target, statusEffect.key, "cleanse", `${getStatusEffectName(statusEffect.key)} cleansed`);
        logMessages.push(`${target.name}'s ${getStatusEffectName(statusEffect.key)} is cleansed.`);
    };

    const applyStatusEffect = (source: Entity, target: Entity, statusKey: StatusEffectKey) => {
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
            queueStatusEvent(target, statusKey, "apply", statusLabel);
            logMessages.push(`${target.name} is afflicted with ${statusLabel}.`);
            return;
        }

        target.statusEffects.push(nextStatusEffect);
        queueStatusEvent(target, statusKey, "apply", getStatusEffectName(statusKey));
        logMessages.push(`${target.name} is afflicted with ${getStatusEffectName(statusKey)}.`);
    };

    const processStatusEffects = (entity: Entity) => {
        if (entity.currentHp.lte(0) || entity.statusEffects.length === 0) {
            return;
        }

        entity.statusEffects = entity.statusEffects.flatMap((statusEffect) => {
            const nextRemainingTicks = Math.max(0, statusEffect.remainingTicks - 1);
            const nextStatusEffect = { ...statusEffect, remainingTicks: nextRemainingTicks };

            if (statusEffect.key === "burn" && nextRemainingTicks % GAME_TICK_RATE === 0) {
                const burnDamage = Decimal.max(1, new Decimal(nextStatusEffect.potency).times(nextStatusEffect.stacks)).floor();
                entity.currentHp = Decimal.max(0, entity.currentHp.minus(burnDamage));
                queueStatusEvent(entity, "burn", "tick", `${getStatusEffectName("burn")} -${burnDamage.toString()}`, burnDamage.toString());
                logMessages.push(`${entity.name} suffers ${burnDamage.toString()} burn damage.`);
            }

            if (statusEffect.key === "regen" && nextRemainingTicks % GAME_TICK_RATE === 0) {
                const healAmount = Decimal.max(1, nextStatusEffect.potency).floor();
                entity.currentHp = Decimal.min(entity.maxHp, entity.currentHp.plus(healAmount));
                queueStatusEvent(entity, "regen", "tick", `${getStatusEffectName("regen")} +${healAmount.toString()}`, healAmount.toString());
                logMessages.push(`${entity.name} regenerates ${healAmount.toString()} HP.`);
            }

            if (nextRemainingTicks <= 0 || entity.currentHp.lte(0)) {
                queueStatusEvent(entity, statusEffect.key, "expire", `${getStatusEffectName(statusEffect.key)} fades`);
                logMessages.push(`${entity.name}'s ${getStatusEffectName(statusEffect.key)} fades.`);
                return [];
            }

            return [nextStatusEffect];
        });

        if (entity.currentHp.lte(0)) {
            handleDefeat(entity);
        }
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
        const xpBonus = 1 + (draft.prestigeUpgrades.xpMultiplier * 0.2); // +20% base EXP per level
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
                nextHero.exp = nextHero.exp.minus(nextHero.expToNext);
                nextHero.level += 1;
                nextHero.expToNext = getExpRequirement(nextHero.level);
                const heroTemplate = getHeroClassTemplate(nextHero.class);
                nextHero.attributes.str += heroTemplate.growth.str;
                nextHero.attributes.vit += heroTemplate.growth.vit;
                nextHero.attributes.dex += heroTemplate.growth.dex;
                nextHero.attributes.int += heroTemplate.growth.int;
                nextHero.attributes.wis += heroTemplate.growth.wis;

                nextHero = recalculateEntity(nextHero, draft.metaUpgrades, draft.prestigeUpgrades);
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

    draft.party.forEach(processStatusEffects);
    draft.enemies.forEach(processStatusEffects);

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

        const hasteBonus = draft.prestigeUpgrades.gameSpeed * 0.1; // +10% speed up per level
        entity.actionProgress += (ATB_RATE + (entity.attributes.dex * DEX_ATB_RATE)) * (1 + hasteBonus) * getAtbMultiplier(entity);
        const heroTemplate = getHeroTemplateForEntity(entity);

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
                const rawHealAmount = entity.magicDamage.times(healDefinition.healMultiplier);
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
            // Bless targets other party members only; solo Clerics fall through to Smite
            const blessTarget = livingAllies.find((ally) => ally.id !== entity.id && getCleanseableStatusEffect(ally))
                ?? livingAllies.find((ally) => ally.id !== entity.id && !ally.statusEffects.some((se) => se.key === "regen"));
            if (blessDefinition && blessTarget && entity.currentResource.gte(blessDefinition.cost)) {
                const regenPotency = entity.magicDamage.times(blessDefinition.regenMultiplier).toNumber();
                const regenEffect: StatusEffect = {
                    ...getStatusConfig("regen"),
                    sourceId: entity.id,
                    potency: regenPotency,
                };
                const existingRegen = blessTarget.statusEffects.find((se) => se.key === "regen");
                if (existingRegen) {
                    existingRegen.remainingTicks = regenEffect.remainingTicks;
                    existingRegen.potency = Math.max(existingRegen.potency, regenEffect.potency);
                    existingRegen.sourceId = entity.id;
                } else {
                    blessTarget.statusEffects.push(regenEffect);
                }
                setActiveSkill(entity, blessDefinition.name);
                entity.currentResource = entity.currentResource.minus(blessDefinition.cost);
                queueStatusEvent(blessTarget, "regen", "apply", getStatusEffectName("regen"));
                logMessages.push(`${entity.name} casts Bless on ${blessTarget.name}!`);
                const cleansedStatus = getCleanseableStatusEffect(blessTarget);
                if (cleansedStatus) {
                    cleanseStatusEffect(blessTarget, cleansedStatus);
                }
                return;
            }
        }

        if (entity.isEnemy && inferEnemyArchetype(entity) === "Support") {
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

        let action = getDamageAction(entity);
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
            grantResolvedAttackResource(entity);
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
            grantResolvedAttackResource(entity);
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

        let finalDamage = damage;
        if (action.damageElement === "physical") {
            finalDamage = applyPhysicalMitigation(damage, target.armor, entity.armorPenetration);
        } else {
            finalDamage = applyElementalMitigation(
                damage,
                target.resistances[action.damageElement],
                entity.elementalPenetration,
            );
        }

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

        grantResolvedAttackResource(entity);
        grantTakeDamageResource(target);

        const critSuffix = isCrit ? " (CRIT)" : "";
        logMessages.push(`${entity.name} uses ${action.name} on ${target.name} for ${finalDamage.floor().toString()}!${critSuffix}${damageSuffix}`);

        const statusKey = getStatusKeyForElement(action.damageElement);
        if (statusKey && target.currentHp.gt(0)) {
            applyStatusEffect(entity, target, statusKey);
        }

        if (target.currentHp.gt(0)) {
            return;
        }
        handleDefeat(target);
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
