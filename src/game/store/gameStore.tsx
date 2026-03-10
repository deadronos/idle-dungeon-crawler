import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { GAME_TICK_MS, createInitialGameState } from "../engine/simulation";
import { createHotSimulationSlice, selectHotSimulationState } from "./hotSimulationSlice";
import { GAME_STATE_AUTOSAVE_MS, getGameStateSnapshot, loadGameStateFromStorage, saveGameStateToStorage } from "./persistence";
import { createProgressionSlice, selectProgressionState } from "./progressionSlice";
import type { GameActions, GameState, GameStore } from "./types";
import { createUiSlice, selectUiState } from "./uiSlice";

const GameStoreContext = createContext<ReturnType<typeof createGameStore> | null>(null);

export const createGameStore = (initialState?: Partial<GameState>) => {
    const resolvedInitialState = createInitialGameState(initialState);

    return createStore<GameStore>()((set, get, api) => ({
        ...createHotSimulationSlice(selectHotSimulationState(resolvedInitialState))(set, get, api),
        ...createProgressionSlice(selectProgressionState(resolvedInitialState))(set, get, api),
        ...createUiSlice(selectUiState(resolvedInitialState))(set, get, api),
        reset: (overrides) => {
            set(createInitialGameState(overrides));
        },
    }));
};

export const GameProvider: React.FC<{ children: ReactNode; initialState?: Partial<GameState> }> = ({ children, initialState }) => {
    const [store] = useState(() => {
        if (initialState) {
            return createGameStore(initialState);
        }

        if (typeof window === "undefined") {
            return createGameStore();
        }

        return createGameStore(loadGameStateFromStorage(window.localStorage) ?? undefined);
    });
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

    useEffect(() => {
        if (initialState || typeof window === "undefined") {
            return;
        }

        const intervalId = setInterval(() => {
            saveGameStateToStorage(window.localStorage, getGameStateSnapshot(store.getState()));
        }, GAME_STATE_AUTOSAVE_MS);

        return () => clearInterval(intervalId);
    }, [initialState, store]);

    return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
};

export const useGameStoreApi = () => {
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
        partyCapacity: useGameStore((store) => store.partyCapacity),
        maxPartySize: useGameStore((store) => store.maxPartySize),
        highestFloorCleared: useGameStore((store) => store.highestFloorCleared),
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
        getNextPartySlotUnlock: useGameStore((store) => store.getNextPartySlotUnlock),
        unlockPartySlot: useGameStore((store) => store.unlockPartySlot),
        getRecruitCost: useGameStore((store) => store.getRecruitCost),
        recruitHero: useGameStore((store) => store.recruitHero),
        reset: useGameStore((store) => store.reset),
    };

    return { state, actions };
};
