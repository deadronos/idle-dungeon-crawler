import {
    GAME_TICK_MS,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    prependCombatMessages,
    simulateTick,
} from "../engine/simulation";
import type { GameState, GameStateCreator, HotSimulationActions, HotSimulationSlice } from "./types";

export const selectHotSimulationState = (state: GameState): HotSimulationSlice => ({
    party: state.party,
    enemies: state.enemies,
    gold: state.gold,
    floor: state.floor,
    autoFight: state.autoFight,
    autoAdvance: state.autoAdvance,
    combatLog: state.combatLog,
});

export const createHotSimulationSlice = (
    initialState: HotSimulationSlice,
): GameStateCreator<HotSimulationSlice & HotSimulationActions> => {
    return (set, get) => ({
        ...initialState,
        toggleAutoFight: () => {
            set((state) => ({ autoFight: !state.autoFight }));
        },
        toggleAutoAdvance: () => {
            set((state) => ({ autoAdvance: !state.autoAdvance }));
        },
        nextFloor: () => {
            set((state) => getFloorTransitionState(state, state.floor + 1));
        },
        previousFloor: () => {
            const { floor } = get();
            if (floor <= 1) {
                return;
            }

            set((state) => getFloorTransitionState(state, state.floor - 1));
        },
        appendCombatLog: (message: string) => {
            set((state) => ({ combatLog: prependCombatMessages(state.combatLog, message) }));
        },
        addMessage: (message: string) => {
            get().appendCombatLog(message);
        },
        initializeParty: (party) => {
            set((state) => getInitializedPartyState(state, party));
        },
        handlePartyWipe: () => {
            set((state) => getPartyWipeState(state));
        },
        stepSimulation: (deltaMs = GAME_TICK_MS) => {
            const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));

            let nextState: GameState = {
                ...selectHotSimulationState(get()),
                metaUpgrades: get().metaUpgrades,
                activeSection: get().activeSection,
            };

            for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
                const result = simulateTick(nextState);
                nextState = result.state;

                if (result.outcome === "party-wipe") {
                    nextState = { ...nextState, ...getPartyWipeState(nextState) };
                    break;
                }

                if (result.outcome === "victory") {
                    if (nextState.autoAdvance) {
                        nextState = { ...nextState, ...getFloorTransitionState(nextState, nextState.floor + 1) };
                    }
                    break;
                }
            }

            set(nextState);
        },
    });
};