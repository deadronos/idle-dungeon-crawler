import type Decimal from "decimal.js";
import type { StateCreator } from "zustand";

import type { Entity, MetaUpgrades } from "../entity";

export type AppSection = "dungeon" | "shop";

export interface HotSimulationSlice {
    party: Entity[];
    enemies: Entity[];
    gold: Decimal;
    floor: number;
    autoFight: boolean;
    autoAdvance: boolean;
    combatLog: string[];
}

export interface ProgressionSlice {
    metaUpgrades: MetaUpgrades;
}

export interface UiSlice {
    activeSection: AppSection;
}

export type GameState = HotSimulationSlice & ProgressionSlice & UiSlice;

export interface HotSimulationActions {
    toggleAutoFight: () => void;
    toggleAutoAdvance: () => void;
    nextFloor: () => void;
    previousFloor: () => void;
    appendCombatLog: (message: string) => void;
    addMessage: (message: string) => void;
    initializeParty: (party: Entity[]) => void;
    handlePartyWipe: () => void;
    stepSimulation: (deltaMs?: number) => void;
}

export interface ProgressionActions {
    getTrainingUpgradeCost: () => Decimal;
    buyTrainingUpgrade: () => void;
    getFortificationUpgradeCost: () => Decimal;
    buyFortificationUpgrade: () => void;
}

export interface UiActions {
    setActiveSection: (section: AppSection) => void;
}

export interface StoreLifecycleActions {
    reset: (overrides?: Partial<GameState>) => void;
}

export type GameActions = HotSimulationActions & ProgressionActions & UiActions & StoreLifecycleActions;
export type GameStore = GameState & GameActions;

export type GameStateCreator<TSlice> = StateCreator<GameStore, [], [], TSlice>;