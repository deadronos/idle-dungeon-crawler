import Decimal from "decimal.js";

import { BASE_META_UPGRADES, createEnemy, getExpRequirement, recalculateEntity } from "../entity";
import type { Entity, MetaUpgrades } from "../entity";
import { MAX_PARTY_SIZE } from "../partyProgression";
import type { GameState } from "../store/types";

export const GAME_TICK_RATE = 20;
export const GAME_TICK_MS = 1000 / GAME_TICK_RATE;
export const ATB_RATE = 2;

const SKILL_BANNER_TICKS = GAME_TICK_RATE;
const COMBAT_LOG_LIMIT = 10;

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
    resistances: { ...entity.resistances },
    activeSkill: entity.activeSkill,
    activeSkillTicks: entity.activeSkillTicks,
});

export const recalculateParty = (party: Entity[], upgrades: MetaUpgrades): Entity[] => {
    return party.map((hero) => recalculateEntity(cloneEntity(hero), upgrades));
};

export const prependCombatMessages = (combatLog: string[], ...messages: string[]) => {
    return [...messages.filter(Boolean), ...combatLog].slice(0, COMBAT_LOG_LIMIT);
};

export const createInitialGameState = (overrides?: Partial<GameState>): GameState => ({
    party: overrides?.party?.map(cloneEntity) ?? [],
    enemies: overrides?.enemies?.map(cloneEntity) ?? [],
    gold: new Decimal(overrides?.gold ?? 0),
    floor: overrides?.floor ?? 1,
    autoFight: overrides?.autoFight ?? true,
    autoAdvance: overrides?.autoAdvance ?? true,
    combatLog: overrides?.combatLog ? [...overrides.combatLog] : [],
    metaUpgrades: { ...BASE_META_UPGRADES, ...overrides?.metaUpgrades },
    partyCapacity: overrides?.partyCapacity ?? 1,
    maxPartySize: overrides?.maxPartySize ?? MAX_PARTY_SIZE,
    highestFloorCleared: overrides?.highestFloorCleared ?? 0,
    activeSection: overrides?.activeSection ?? "dungeon",
});

export const getInitializedPartyState = (state: GameState, party: Entity[]): Partial<GameState> => ({
    party: recalculateParty(party, state.metaUpgrades),
    enemies: createEncounter(1),
    combatLog: [`${party[0]?.name ?? "The party"} leads the party into the dungeon...`],
    activeSection: "dungeon",
});

export const getFloorTransitionState = (state: GameState, floor: number): Partial<GameState> => ({
    floor,
    enemies: createEncounter(floor),
    combatLog: prependCombatMessages(state.combatLog, `Moved to floor ${floor}...`),
});

export const getFloorReplayState = (state: GameState): Partial<GameState> => ({
    enemies: createEncounter(state.floor),
    combatLog: prependCombatMessages(state.combatLog, `Repeating floor ${state.floor}...`),
});

export const getPartyWipeState = (state: GameState): Partial<GameState> => {
    const healedParty = state.party.map((hero) => {
        const refreshed = recalculateEntity(cloneEntity(hero), state.metaUpgrades);
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
    };
};

export const simulateTick = (state: GameState): SimulationResult => {
    const draft: GameState = {
        ...state,
        party: state.party.map(cloneEntity),
        enemies: state.enemies.map(cloneEntity),
        gold: new Decimal(state.gold),
        combatLog: [...state.combatLog],
        metaUpgrades: { ...state.metaUpgrades },
    };

    let anyActionTaken = false;
    let anyVisualUpdate = false;
    const logMessages: string[] = [];

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

        entity.actionProgress += ATB_RATE + (entity.attributes.dex * 0.1);

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
                logMessages.push(`${entity.name} casts Mend on ${healTarget.name} for ${healAmount.floor().toString()}!`);
                return;
            }
        }

        const aliveTargets = targets.filter((target) => target.currentHp.gt(0));
        if (aliveTargets.length === 0) {
            return;
        }

        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];

        type DamageElement = "physical" | keyof Entity["resistances"];

        let actionName = "Attack";
        let critChance = entity.critChance;
        let damage = entity.physicalDamage;
        let damageElement: DamageElement = "physical";

        if (entity.class === "Cleric") {
            actionName = "Smite";
            damage = entity.magicDamage;
            damageElement = "light";
        }

        if (!entity.isEnemy && entity.class === "Warrior" && entity.currentResource.gte(50)) {
            entity.currentResource = entity.currentResource.minus(50);
            damage = entity.physicalDamage.times(2);
            actionName = "Rage Strike";
            damageElement = "physical";
        } else if (!entity.isEnemy && entity.class === "Archer" && entity.currentResource.gte(25)) {
            entity.currentResource = entity.currentResource.minus(25);
            damage = entity.physicalDamage.times(1.6);
            critChance = Math.min(1, entity.critChance + 0.25);
            actionName = "Piercing Shot";
            damageElement = "physical";
        }

        setActiveSkill(entity, actionName);

        const isCrit = Math.random() < critChance;
        if (isCrit) {
            damage = damage.times(entity.critDamage);
        }

        let finalDamage = damage;
        if (damageElement === "physical") {
            finalDamage = damage.minus(target.armor);
        } else {
            finalDamage = damage.times(1 - target.resistances[damageElement]);
        }
        finalDamage = Decimal.max(1, finalDamage);
        target.currentHp = Decimal.max(0, target.currentHp.minus(finalDamage));

        if (entity.class === "Warrior") {
            entity.currentResource = Decimal.min(entity.maxResource, entity.currentResource.plus(10));
        }

        if (target.class === "Warrior" && target.currentHp.gt(0)) {
            target.currentResource = Decimal.min(target.maxResource, target.currentResource.plus(5));
        }

        logMessages.push(`${entity.name} uses ${actionName} on ${target.name} for ${finalDamage.floor().toString()}! ${isCrit ? "(CRIT)" : ""}`.trim());

        if (target.currentHp.gt(0) || !target.isEnemy) {
            return;
        }

        logMessages.push(`${target.name} was defeated!`);

        const experienceReward = new Decimal(draft.floor).times(10).plus(target.attributes.vit);
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

                nextHero = recalculateEntity(nextHero, draft.metaUpgrades);
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