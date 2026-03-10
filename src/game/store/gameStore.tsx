import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import {
    GAME_TICK_MS,
    createInitialGameState,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    prependCombatMessages,
    recalculateParty,
    simulateTick,
} from "../engine/simulation";
import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "../upgrades";
import type { AppSection, GameActions, GameState, GameStore } from "./types";

const GameStoreContext = createContext<ReturnType<typeof createGameStore> | null>(null);

const selectGameState = (store: GameStore): GameState => ({
    party: store.party,
    enemies: store.enemies,
    gold: store.gold,
    floor: store.floor,
    autoFight: store.autoFight,
    autoAdvance: store.autoAdvance,
    combatLog: store.combatLog,
    metaUpgrades: store.metaUpgrades,
    activeSection: store.activeSection,
});

export const createGameStore = (initialState?: Partial<GameState>) => {
    return createStore<GameStore>()((set, get) => ({
        ...createInitialGameState(initialState),
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
        setActiveSection: (section: AppSection) => {
            set({ activeSection: section });
        },
        handlePartyWipe: () => {
            set((state) => getPartyWipeState(state));
        },
        stepSimulation: (deltaMs = GAME_TICK_MS) => {
            const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));

            let nextState = selectGameState(get());
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
        getTrainingUpgradeCost: () => {
            return calculateTrainingUpgradeCost(get().metaUpgrades.training);
        },
        buyTrainingUpgrade: () => {
            set((state) => {
                const cost = calculateTrainingUpgradeCost(state.metaUpgrades.training);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const nextUpgrades = { ...state.metaUpgrades, training: state.metaUpgrades.training + 1 };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: nextUpgrades,
                    party: recalculateParty(state.party, nextUpgrades),
                    combatLog: prependCombatMessages(state.combatLog, `Battle Drills improved to Lv ${nextUpgrades.training}.`),
                };
            });
        },
        getFortificationUpgradeCost: () => {
            return calculateFortificationUpgradeCost(get().metaUpgrades.fortification);
        },
        buyFortificationUpgrade: () => {
            set((state) => {
                const cost = calculateFortificationUpgradeCost(state.metaUpgrades.fortification);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const nextUpgrades = { ...state.metaUpgrades, fortification: state.metaUpgrades.fortification + 1 };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: nextUpgrades,
                    party: recalculateParty(state.party, nextUpgrades),
                    combatLog: prependCombatMessages(state.combatLog, `Fortification improved to Lv ${nextUpgrades.fortification}.`),
                };
            });
        },
        reset: (overrides) => {
            set(createInitialGameState(overrides));
        },
    }));
};

export const GameProvider: React.FC<{ children: ReactNode; initialState?: Partial<GameState> }> = ({ children, initialState }) => {
    const [store] = useState(() => createGameStore(initialState));
    const previousInitialStateRef = useRef(initialState);

    useEffect(() => {
        if (previousInitialStateRef.current !== initialState) {
            store.getState().reset(initialState);
            previousInitialStateRef.current = initialState;
        }
    }, [initialState, store]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            store.getState().stepSimulation(GAME_TICK_MS);
        }, GAME_TICK_MS);

        return () => clearInterval(intervalId);
    }, [store]);

    return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
};

const useGameStoreApi = () => {
    const store = useContext(GameStoreContext);
    if (!store) {
        throw new Error("useGame must be used within a GameProvider");
    }

    return store;
};

export const useGameStore = <T,>(selector: (state: GameStore) => T) => {
    const store = useGameStoreApi();
    return useStore(store, selector);
};

export const useGame = () => {
    const state: GameState = {
        party: useGameStore((store) => store.party),
        enemies: useGameStore((store) => store.enemies),
        gold: useGameStore((store) => store.gold),
        floor: useGameStore((store) => store.floor),
        autoFight: useGameStore((store) => store.autoFight),
        autoAdvance: useGameStore((store) => store.autoAdvance),
        combatLog: useGameStore((store) => store.combatLog),
        metaUpgrades: useGameStore((store) => store.metaUpgrades),
        activeSection: useGameStore((store) => store.activeSection),
    };

    const actions: GameActions = {
        toggleAutoFight: useGameStore((store) => store.toggleAutoFight),
        toggleAutoAdvance: useGameStore((store) => store.toggleAutoAdvance),
        nextFloor: useGameStore((store) => store.nextFloor),
        previousFloor: useGameStore((store) => store.previousFloor),
        appendCombatLog: useGameStore((store) => store.appendCombatLog),
        addMessage: useGameStore((store) => store.addMessage),
        initializeParty: useGameStore((store) => store.initializeParty),
        setActiveSection: useGameStore((store) => store.setActiveSection),
        handlePartyWipe: useGameStore((store) => store.handlePartyWipe),
        stepSimulation: useGameStore((store) => store.stepSimulation),
        getTrainingUpgradeCost: useGameStore((store) => store.getTrainingUpgradeCost),
        buyTrainingUpgrade: useGameStore((store) => store.buyTrainingUpgrade),
        getFortificationUpgradeCost: useGameStore((store) => store.getFortificationUpgradeCost),
        buyFortificationUpgrade: useGameStore((store) => store.buyFortificationUpgrade),
        reset: useGameStore((store) => store.reset),
    };

    return { state, actions };
};