import Decimal from "decimal.js";

import { BASE_META_UPGRADES, createEnemy, getExpRequirement, recalculateEntity } from "../entity";
import type { Entity, MetaUpgrades, PrestigeUpgrades } from "../entity";
import { MAX_PARTY_SIZE } from "../partyProgression";
import type { CombatEvent, GameState } from "../store/types";

export const GAME_TICK_RATE = 20;
export const GAME_TICK_MS = 1000 / GAME_TICK_RATE;
export const ATB_RATE = 2;

const SKILL_BANNER_TICKS = GAME_TICK_RATE;
const COMBAT_EVENT_TICKS = Math.round(GAME_TICK_RATE * 1.4);
const COMBAT_LOG_LIMIT = 10;
const MIN_PHYSICAL_HIT_CHANCE = 0.72;
const MAX_PHYSICAL_HIT_CHANCE = 0.97;
const MIN_SPELL_HIT_CHANCE = 0.75;
const MAX_SPELL_HIT_CHANCE = 0.98;
const MAX_PARRY_CHANCE = 0.3;
let combatEventSequence = 0;

type DamageElement = "physical" | keyof Entity["resistances"];
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

export type SimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

export interface SimulationResult {
    state: GameState;
    outcome: SimulationOutcome;
}

export const isBossFloor = (floor: number) => floor % 10 === 0;

export const getEncounterSize = (floor: number) => {
    if (isBossFloor(floor)) {
        return 1;
    }

    const floorCap = Math.max(1, Math.min(MAX_PARTY_SIZE, Math.ceil(floor / 5)));
    return floorCap;
};

export const createEncounter = (floor: number) => {
    return Array.from({ length: getEncounterSize(floor) }, (_, index) => createEnemy(floor, `enemy_${floor}_${index}`));
};

export const cloneEntity = (entity: Entity): Entity => ({
    ...entity,
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
    resistances: { ...entity.resistances },
    activeSkill: entity.activeSkill,
    activeSkillTicks: entity.activeSkillTicks,
});

export const recalculateParty = (party: Entity[], upgrades: MetaUpgrades, prestigeUpgrades?: PrestigeUpgrades): Entity[] => {
    return party.map((hero) => recalculateEntity(cloneEntity(hero), upgrades, prestigeUpgrades));
};

export const prependCombatMessages = (combatLog: string[], ...messages: string[]) => {
    return [...messages.filter(Boolean), ...combatLog].slice(0, COMBAT_LOG_LIMIT);
};

const hasValidCombatRatings = (entity: Partial<Entity>) => {
    return [entity.accuracyRating, entity.evasionRating, entity.parryRating].every(
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
    enemies: createEncounter(floor),
    combatLog: prependCombatMessages(state.combatLog, `Moved to floor ${floor}...`),
    combatEvents: [],
});

export const getFloorReplayState = (state: GameState): Partial<GameState> => ({
    enemies: createEncounter(state.floor),
    combatLog: prependCombatMessages(state.combatLog, `Repeating floor ${state.floor}...`),
    combatEvents: [],
});

export const getPartyWipeState = (state: GameState): Partial<GameState> => {
    const healedParty = state.party.map((hero) => {
        const refreshed = recalculateEntity(cloneEntity(hero), state.metaUpgrades, state.prestigeUpgrades);
        refreshed.currentHp = refreshed.maxHp;
        refreshed.currentResource = hero.class === "Warrior" ? new Decimal(0) : refreshed.maxResource;
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

const clampChance = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

export const getPhysicalHitChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        MIN_PHYSICAL_HIT_CHANCE,
        MAX_PHYSICAL_HIT_CHANCE,
        0.84 + ((attacker.accuracyRating - defender.evasionRating) * 0.002),
    );

export const getSpellHitChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        MIN_SPELL_HIT_CHANCE,
        MAX_SPELL_HIT_CHANCE,
        0.86 + (((attacker.accuracyRating + attacker.attributes.int) - (defender.evasionRating + defender.attributes.wis)) * 0.0018),
    );

export const getParryChance = (attacker: Entity, defender: Entity) =>
    clampChance(
        0,
        MAX_PARRY_CHANCE,
        0.06 + ((defender.parryRating - (attacker.accuracyRating * 0.25)) * 0.003),
    );

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

const getDamageAction = (entity: Entity): DamageAction => {
    let action: DamageAction = {
        name: "Attack",
        damage: entity.physicalDamage,
        damageElement: "physical",
        deliveryType: entity.class === "Archer" ? "ranged" : "melee",
        critChance: entity.critChance,
        canDodge: true,
        canParry: entity.class !== "Archer",
    };

    if (entity.class === "Cleric") {
        action = {
            name: "Smite",
            damage: entity.magicDamage,
            damageElement: "light",
            deliveryType: "spell",
            critChance: entity.critChance,
            canDodge: true,
            canParry: false,
        };
    }

    if (!entity.isEnemy && entity.class === "Warrior" && entity.currentResource.gte(50)) {
        entity.currentResource = entity.currentResource.minus(50);
        action = {
            ...action,
            name: "Rage Strike",
            damage: entity.physicalDamage.times(2),
            damageElement: "physical",
            deliveryType: "melee",
            canParry: true,
        };
    } else if (!entity.isEnemy && entity.class === "Archer" && entity.currentResource.gte(25)) {
        entity.currentResource = entity.currentResource.minus(25);
        action = {
            ...action,
            name: "Piercing Shot",
            damage: entity.physicalDamage.times(1.6),
            damageElement: "physical",
            deliveryType: "ranged",
            critChance: Math.min(1, entity.critChance + 0.25),
            canParry: false,
        };
    }

    if (action.deliveryType === "ranged" && action.damageElement === "physical") {
        action.canParry = false;
    }

    return action;
};

export const simulateTick = (state: GameState): SimulationResult => {
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

    const livingHeroes = draft.party.filter((hero) => hero.currentHp.gt(0));
    const livingEnemies = draft.enemies.filter((enemy) => enemy.currentHp.gt(0));

    if (livingHeroes.length === 0) {
        return { state, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        return { state: anyVisualUpdate ? draft : state, outcome: "victory" };
    }

    if (!draft.autoFight) {
        return { state: anyVisualUpdate ? draft : state, outcome: "paused" };
    }

    const tickEntity = (entity: Entity, allies: Entity[], targets: Entity[]) => {
        if (entity.currentHp.lte(0)) {
            return;
        }

        const hasteBonus = draft.prestigeUpgrades.gameSpeed * 0.1; // +10% speed up per level
        entity.actionProgress += (ATB_RATE + (entity.attributes.dex * 0.1)) * (1 + hasteBonus);

        if (entity.class === "Cleric" || entity.class === "Archer") {
            const regen = entity.class === "Cleric" ? entity.attributes.wis * 0.5 : 2;
            entity.currentResource = entity.currentResource.plus(regen);
            if (entity.currentResource.gt(entity.maxResource)) {
                entity.currentResource = entity.maxResource;
            }
        }

        if (entity.actionProgress < 100) {
            return;
        }

        entity.actionProgress = 0;
        anyActionTaken = true;

        const livingAllies = allies.filter((ally) => ally.currentHp.gt(0));

        if (!entity.isEnemy && entity.class === "Cleric") {
            const healCost = new Decimal(35);
            const healTarget = livingAllies
                .filter((ally) => ally.currentHp.lt(ally.maxHp))
                .sort((left, right) => left.currentHp.div(left.maxHp).minus(right.currentHp.div(right.maxHp)).toNumber())[0];

            if (healTarget && entity.currentResource.gte(healCost) && healTarget.currentHp.div(healTarget.maxHp).lt(0.65)) {
                const healAmount = entity.magicDamage.times(1.75);
                setActiveSkill(entity, "Mend");
                entity.currentResource = entity.currentResource.minus(healCost);
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
        }

        const aliveTargets = targets.filter((target) => target.currentHp.gt(0));
        if (aliveTargets.length === 0) {
            return;
        }

        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        const action = getDamageAction(entity);

        setActiveSkill(entity, action.name);

        const hitChance = action.deliveryType === "spell"
            ? getSpellHitChance(entity, target)
            : getPhysicalHitChance(entity, target);

        if (action.canDodge && Math.random() >= hitChance) {
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

        if (action.canParry && action.deliveryType === "melee" && action.damageElement === "physical" && Math.random() < getParryChance(entity, target)) {
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
        const isCrit = Math.random() < action.critChance;
        if (isCrit) {
            damage = damage.times(entity.critDamage);
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
            finalDamage = damage.minus(target.armor);
        } else {
            finalDamage = damage.times(1 - target.resistances[action.damageElement]);
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

        if (entity.class === "Warrior") {
            entity.currentResource = Decimal.min(entity.maxResource, entity.currentResource.plus(10));
        }

        if (target.class === "Warrior" && target.currentHp.gt(0)) {
            target.currentResource = Decimal.min(target.maxResource, target.currentResource.plus(5));
        }

        logMessages.push(`${entity.name} uses ${action.name} on ${target.name} for ${finalDamage.floor().toString()}! ${isCrit ? "(CRIT)" : ""}`.trim());

        if (target.currentHp.gt(0) || !target.isEnemy) {
            return;
        }

        queueCombatEvent({
            sourceId: entity.id,
            targetId: target.id,
            kind: "defeat",
            text: "Defeated",
            ttlTicks: COMBAT_EVENT_TICKS,
        });
        logMessages.push(`${target.name} was defeated!`);

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

                if (nextHero.class === "Warrior") {
                    nextHero.attributes.str += 2;
                    nextHero.attributes.vit += 2;
                    nextHero.attributes.dex += 1;
                    nextHero.attributes.int += 1;
                    nextHero.attributes.wis += 1;
                } else if (nextHero.class === "Cleric") {
                    nextHero.attributes.int += 2;
                    nextHero.attributes.wis += 2;
                    nextHero.attributes.str += 1;
                    nextHero.attributes.vit += 1;
                    nextHero.attributes.dex += 1;
                } else if (nextHero.class === "Archer") {
                    nextHero.attributes.dex += 2;
                    nextHero.attributes.str += 1;
                    nextHero.attributes.vit += 1;
                    nextHero.attributes.int += 1;
                    nextHero.attributes.wis += 1;
                    nextHero.attributes.dex += Math.random() > 0.5 ? 1 : 0;
                }

                nextHero = recalculateEntity(nextHero, draft.metaUpgrades, draft.prestigeUpgrades);
                logMessages.push(`${nextHero.name} reached level ${nextHero.level}!`);
            }

            draft.party[index] = nextHero;
        });
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
