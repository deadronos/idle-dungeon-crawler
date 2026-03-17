import {
    GAME_TICK_MS,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    prependCombatMessages,
    stepSimulationState,
} from "../engine/simulation";
import { selectProgressionState } from "./progressionSlice";
import type { GameState, GameStateCreator, HotSimulationActions, HotSimulationSlice } from "./types";

export const selectHotSimulationState = (state: GameState): HotSimulationSlice => ({
    party: state.party,
    enemies: state.enemies,
    gold: state.gold,
    floor: state.floor,
    autoFight: state.autoFight,
    autoAdvance: state.autoAdvance,
    combatLog: state.combatLog,
    combatEvents: state.combatEvents,
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
            const state: GameState = {
                ...selectHotSimulationState(get()),
                ...selectProgressionState(get()),
                activeSection: get().activeSection,
            };
            set(stepSimulationState(state, deltaMs));
        },
    });
};
