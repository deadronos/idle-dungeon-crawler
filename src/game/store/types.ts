import type Decimal from "decimal.js";

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

export interface GameActions {
    toggleAutoFight: () => void;
    toggleAutoAdvance: () => void;
    nextFloor: () => void;
    previousFloor: () => void;
    appendCombatLog: (message: string) => void;
    addMessage: (message: string) => void;
    initializeParty: (party: Entity[]) => void;
    setActiveSection: (section: AppSection) => void;
    handlePartyWipe: () => void;
    stepSimulation: (deltaMs?: number) => void;
    getTrainingUpgradeCost: () => Decimal;
    buyTrainingUpgrade: () => void;
    getFortificationUpgradeCost: () => Decimal;
    buyFortificationUpgrade: () => void;
    reset: (overrides?: Partial<GameState>) => void;
}

export type GameStore = GameState & GameActions;