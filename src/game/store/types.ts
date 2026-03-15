import type Decimal from "decimal.js";
import type { StateCreator } from "zustand";

import type { Entity, HeroClass, MetaUpgrades, StatusEffectKey } from "../entity";
import type { EquipmentSlot } from "../heroBuilds";
import type { PartySlotUnlock } from "../partyProgression";

export type AppSection = "dungeon" | "shop" | "party";
export type CombatEventKind = "damage" | "heal" | "dodge" | "parry" | "crit" | "defeat" | "skill" | "status";
export type CombatEventStatusPhase = "apply" | "tick" | "expire" | "cleanse";

export interface CombatEvent {
    id: string;
    sourceId?: string;
    targetId?: string;
    kind: CombatEventKind;
    text: string;
    amount?: string;
    isCrit?: boolean;
    statusKey?: StatusEffectKey;
    statusPhase?: CombatEventStatusPhase;
    ttlTicks: number;
}

export interface HotSimulationSlice {
    party: Entity[];
    enemies: Entity[];
    gold: Decimal;
    floor: number;
    autoFight: boolean;
    autoAdvance: boolean;
    combatLog: string[];
    combatEvents: CombatEvent[];
}

export interface PrestigeUpgrades {
    costReducer: number;
    hpMultiplier: number;
    gameSpeed: number;
    xpMultiplier: number;
}

export interface TalentProgressionState {
    unlockedTalentIdsByHeroId: Record<string, string[]>;
    talentPointsByHeroId: Record<string, number>;
}

export interface EquipmentItemInstance {
    instanceId: string;
    definitionId: string;
    slot: EquipmentSlot;
    tier: number;
    rank: number;
    sellValue: number;
    affinityTags: string[];
}

export interface EquipmentProgressionState {
    inventoryItems: EquipmentItemInstance[];
    equippedItemInstanceIdsByHeroId: Record<string, string[]>;
    highestUnlockedEquipmentTier: number;
    inventoryCapacityLevel: number;
    inventoryCapacity: number;
    nextInstanceSequence: number;
}

export const createEmptyTalentProgressionState = (): TalentProgressionState => ({
    unlockedTalentIdsByHeroId: {},
    talentPointsByHeroId: {},
});

export const createEmptyEquipmentProgressionState = (): EquipmentProgressionState => ({
    inventoryItems: [],
    equippedItemInstanceIdsByHeroId: {},
    highestUnlockedEquipmentTier: 1,
    inventoryCapacityLevel: 0,
    inventoryCapacity: 12,
    nextInstanceSequence: 1,
});

export interface ProgressionSlice {
    metaUpgrades: MetaUpgrades;
    partyCapacity: number;
    maxPartySize: number;
    highestFloorCleared: number;
    heroSouls: Decimal;
    prestigeUpgrades: PrestigeUpgrades;
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
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
    getNextPartySlotUnlock: () => PartySlotUnlock | null;
    unlockPartySlot: () => void;
    getRecruitCost: () => Decimal;
    recruitHero: (heroClass: HeroClass) => void;
    retireHero: (heroId: string) => void;
    unlockTalent: (heroId: string, talentId: string) => void;
    equipItem: (heroId: string, itemId: string) => void;
    unequipItem: (heroId: string, slot: EquipmentSlot) => void;
    getInventoryCapacityUpgradeCost: () => number | null;
    buyInventoryCapacityUpgrade: () => void;
    sellInventoryItem: (itemInstanceId: string) => void;
    getPrestigeUpgradeCost: (upgradeId: keyof PrestigeUpgrades) => number;
    buyPrestigeUpgrade: (upgradeId: keyof PrestigeUpgrades) => void;
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
