import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "../upgrades";
import { prependCombatMessages, recalculateParty } from "../engine/simulation";
import type { GameState, GameStateCreator, ProgressionActions, ProgressionSlice } from "./types";

export const selectProgressionState = (state: GameState): ProgressionSlice => ({
    metaUpgrades: state.metaUpgrades,
});

export const createProgressionSlice = (
    initialState: ProgressionSlice,
): GameStateCreator<ProgressionSlice & ProgressionActions> => {
    return (set, get) => ({
        ...initialState,
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
    });
};