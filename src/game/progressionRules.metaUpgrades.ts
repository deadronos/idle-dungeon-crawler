import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "./upgrades";
import { buildRecalculatedProgressionState } from "./progressionRules.shared";
import type { GameState } from "./store/types";

export const getTrainingUpgradePurchaseState = (state: GameState): Partial<GameState> | null => {
    const cost = calculateTrainingUpgradeCost(state.metaUpgrades.training, state.prestigeUpgrades.costReducer);
    if (state.gold.lt(cost)) {
        return null;
    }

    const metaUpgrades = {
        ...state.metaUpgrades,
        training: state.metaUpgrades.training + 1,
    };

    return {
        gold: state.gold.minus(cost),
        metaUpgrades,
        ...buildRecalculatedProgressionState({ state, party: state.party, metaUpgrades }),
    };
};

export const getFortificationUpgradePurchaseState = (state: GameState): Partial<GameState> | null => {
    const cost = calculateFortificationUpgradeCost(state.metaUpgrades.fortification, state.prestigeUpgrades.costReducer);
    if (state.gold.lt(cost)) {
        return null;
    }

    const metaUpgrades = {
        ...state.metaUpgrades,
        fortification: state.metaUpgrades.fortification + 1,
    };

    return {
        gold: state.gold.minus(cost),
        metaUpgrades,
        ...buildRecalculatedProgressionState({ state, party: state.party, metaUpgrades }),
    };
};
