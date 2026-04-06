import { prependCombatMessages } from "../combatLog";
import {
    type Entity,
    type StatusEffectKey,
} from "../entity";
import type { CombatEvent, GameState } from "../store/types";
import { secureRandom, type SecureRandomSource, SECURE_RANDOM_BRAND } from "../../utils/random";

import {
    COMBAT_EVENT_TICKS,
    createCombatEvent,
    decrementCombatEvents,
} from "./combatEvents";
import {
    getPartyWipeState,
} from "./encounter";
import { GAME_TICK_MS } from "./constants";
import {
    processStatusEffects,
} from "./statusEffects";
import {
    createSimulationBuildState,
    createSimulationDraft,
    getImmediateSimulationOutcome,
    hasPendingSimulationVisuals,
} from "./simulationDraft";
import { applyEnemyDefeatRewards, getPostVictorySimulationState } from "./simulationProgression";
import { applyActiveSkill, resolveCombatTurn, updateSkillBanner } from "./turnResolution";

export { ATB_RATE, GAME_TICK_MS, GAME_TICK_RATE, HASTE_ATB_RATE } from "./constants";
export { COMBAT_EVENT_TICKS } from "./combatEvents";
export { prependCombatMessages } from "../combatLog";
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

export type SimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

export interface SimulationResult {
    state: GameState;
    outcome: SimulationOutcome;
}

export interface SimulationRandomSource extends SecureRandomSource {}

const defaultRandomSource: SimulationRandomSource = {
    [SECURE_RANDOM_BRAND]: true,
    next: () => secureRandom(),
};

export const createSequenceRandomSource = (...rolls: number[]): SimulationRandomSource => {
    let index = 0;

    return {
        [SECURE_RANDOM_BRAND]: true,
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

export const stepSimulationState = (
    state: GameState,
    deltaMs = GAME_TICK_MS,
    randomSource: SimulationRandomSource = defaultRandomSource,
    silent = false,
): GameState => {
    const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));
    let nextState = state;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        const result = simulateTick(nextState, randomSource, silent);
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

export const simulateTick = (state: GameState, randomSource: SimulationRandomSource = defaultRandomSource, silent = false): SimulationResult => {
    const immediateOutcome = getImmediateSimulationOutcome(state);
    if (immediateOutcome !== "running" && (silent || !hasPendingSimulationVisuals(state))) {
        return { state, outcome: immediateOutcome };
    }

    const draft = createSimulationDraft(state);
    const buildState = createSimulationBuildState(draft);

    let anyVisualUpdate = false;
    const logMessages: string[] = [];
    const addLogMessage = (message: string) => {
        if (!silent) {
            logMessages.push(message);
        }
    };
    const combatEvents: CombatEvent[] = silent ? [] : decrementCombatEvents(draft.combatEvents);
    if (!silent && draft.combatEvents.length > 0) {
        anyVisualUpdate = true;
    }
    draft.combatEvents = combatEvents;

    const queueCombatEvent = (event: Omit<CombatEvent, "id">) => {
        if (!silent) {
            draft.combatEvents.push(createCombatEvent(event));
            anyVisualUpdate = true;
        }
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

        applyEnemyDefeatRewards({ state: draft, target, buildState, addLogMessage });
    };

    const setActiveSkill = (entity: Entity, skill: string) => {
        if (!silent) {
            anyVisualUpdate = true;
            applyActiveSkill(entity, skill, queueCombatEvent);
        }
    };

    if (!silent) {
        draft.party.forEach((hero) => {
            anyVisualUpdate = updateSkillBanner(hero) || anyVisualUpdate;
        });
        draft.enemies.forEach((enemy) => {
            anyVisualUpdate = updateSkillBanner(enemy) || anyVisualUpdate;
        });
    }

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
        if (!silent && logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "party-wipe" };
    }

    if (livingEnemies.length === 0) {
        if (!silent && logMessages.length > 0) {
            draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
        }
        return { state: draft, outcome: "victory" };
    }

    draft.party.forEach((hero) => {
        resolveCombatTurn({
            entity: hero,
            allies: draft.party,
            targets: draft.enemies,
            prestigeUpgrades: draft.prestigeUpgrades,
            buildState,
            randomSource,
            setActiveSkill,
            queueCombatEvent,
            queueStatusEvent,
            addLogMessage,
            handleDefeat,
        });
    });

    draft.enemies.forEach((enemy) => {
        resolveCombatTurn({
            entity: enemy,
            allies: draft.enemies,
            targets: draft.party,
            prestigeUpgrades: draft.prestigeUpgrades,
            buildState,
            randomSource,
            setActiveSkill,
            queueCombatEvent,
            queueStatusEvent,
            addLogMessage,
            handleDefeat,
        });
    });

    if (!silent && logMessages.length > 0) {
        draft.combatLog = prependCombatMessages(draft.combatLog, ...logMessages);
    }

    return { state: draft, outcome: "running" };
};
