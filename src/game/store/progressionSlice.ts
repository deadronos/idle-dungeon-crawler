import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "../upgrades";
import { getNextInventoryCapacityUpgrade } from "../equipmentProgression";
import {
    getEquipItemState,
    getFortificationUpgradePurchaseState,
    getInventoryCapacityUpgradePurchaseState,
    getPartySlotUnlockState,
    getPrestigeUpgradeCost,
    getPrestigeUpgradePurchaseState,
    getRecruitHeroState,
    getRetireHeroState,
    getSellInventoryItemState,
    getTalentUnlockState,
    getTrainingUpgradePurchaseState,
    getUnequipItemState,
} from "../progressionRules";
import { getNextPartySlotUnlock as getNextSlotUnlock, getRecruitCost as calculateRecruitCost } from "../partyProgression";
import type { GameState, GameStateCreator, PrestigeUpgrades, ProgressionActions, ProgressionSlice } from "./types";

export const selectProgressionState = (state: GameState): ProgressionSlice => ({
    metaUpgrades: state.metaUpgrades,
    partyCapacity: state.partyCapacity,
    maxPartySize: state.maxPartySize,
    highestFloorCleared: state.highestFloorCleared,
    heroSouls: state.heroSouls,
    prestigeUpgrades: state.prestigeUpgrades,
    talentProgression: state.talentProgression,
    equipmentProgression: state.equipmentProgression,
});

export const createProgressionSlice = (
    initialState: ProgressionSlice,
): GameStateCreator<ProgressionSlice & ProgressionActions> => {
    return (set, get) => ({
        ...initialState,
        getTrainingUpgradeCost: () => {
            const state = get();
            return calculateTrainingUpgradeCost(state.metaUpgrades.training, state.prestigeUpgrades.costReducer);
        },
        buyTrainingUpgrade: () => {
            set((state) => getTrainingUpgradePurchaseState(state) ?? {});
        },
        getFortificationUpgradeCost: () => {
            const state = get();
            return calculateFortificationUpgradeCost(state.metaUpgrades.fortification, state.prestigeUpgrades.costReducer);
        },
        buyFortificationUpgrade: () => {
            set((state) => getFortificationUpgradePurchaseState(state) ?? {});
        },
        getNextPartySlotUnlock: () => {
            return getNextSlotUnlock(get().partyCapacity);
        },
        unlockPartySlot: () => {
            set((state) => getPartySlotUnlockState(state) ?? {});
        },
        getRecruitCost: () => {
            return calculateRecruitCost(get().party.length);
        },
        getInventoryCapacityUpgradeCost: () => {
            return getNextInventoryCapacityUpgrade(get().equipmentProgression.inventoryCapacityLevel)?.cost ?? null;
        },
        recruitHero: (heroClass) => {
            set((state) => getRecruitHeroState(state, heroClass) ?? {});
        },
        retireHero: (heroId: string) => {
            set((state) => getRetireHeroState(state, heroId) ?? {});
        },
        unlockTalent: (heroId: string, talentId: string) => {
            set((state) => getTalentUnlockState(state, heroId, talentId) ?? {});
        },
        equipItem: (heroId: string, itemId: string) => {
            set((state) => getEquipItemState(state, heroId, itemId) ?? {});
        },
        unequipItem: (heroId, slot) => {
            set((state) => getUnequipItemState(state, heroId, slot) ?? {});
        },
        buyInventoryCapacityUpgrade: () => {
            set((state) => getInventoryCapacityUpgradePurchaseState(state) ?? {});
        },
        sellInventoryItem: (itemInstanceId: string) => {
            set((state) => getSellInventoryItemState(state, itemInstanceId) ?? {});
        },
        getPrestigeUpgradeCost: (upgradeId: keyof PrestigeUpgrades) => {
            return getPrestigeUpgradeCost(upgradeId, get().prestigeUpgrades[upgradeId]);
        },
        buyPrestigeUpgrade: (upgradeId: keyof PrestigeUpgrades) => {
            set((state) => getPrestigeUpgradePurchaseState(state, upgradeId) ?? {});
        },
    });
};
