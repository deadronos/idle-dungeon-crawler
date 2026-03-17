import { prependCombatMessages } from "./engine/simulation";
import { getRecalculatedParty } from "./progressionRules.shared";
import type { GameState, PrestigeUpgrades } from "./store/types";

export const PRESTIGE_BASE_COSTS: Record<keyof PrestigeUpgrades, number> = {
    costReducer: 10,
    hpMultiplier: 15,
    gameSpeed: 25,
    xpMultiplier: 10,
};

export const PRESTIGE_UPGRADE_NAMES: Record<keyof PrestigeUpgrades, string> = {
    costReducer: "Greed (Gold Cost Reducer)",
    hpMultiplier: "Vitality (HP Multiplier)",
    gameSpeed: "Haste (Game Speed Booster)",
    xpMultiplier: "Insight (XP Multiplier)",
};

export const getPrestigeUpgradeCost = (upgradeId: keyof PrestigeUpgrades, currentLevel: number) =>
    Math.floor(PRESTIGE_BASE_COSTS[upgradeId] * Math.pow(1.5, currentLevel));

export const getPrestigeUpgradePurchaseState = (
    state: GameState,
    upgradeId: keyof PrestigeUpgrades,
): Partial<GameState> | null => {
    const currentLevel = state.prestigeUpgrades[upgradeId];
    const cost = getPrestigeUpgradeCost(upgradeId, currentLevel);
    if (state.heroSouls.lt(cost)) {
        return null;
    }

    const prestigeUpgrades = {
        ...state.prestigeUpgrades,
        [upgradeId]: currentLevel + 1,
    };

    return {
        heroSouls: state.heroSouls.minus(cost),
        prestigeUpgrades,
        party: getRecalculatedParty({ state, party: state.party, prestigeUpgrades }),
        combatLog: prependCombatMessages(
            state.combatLog,
            `Altar of Souls: Purchased ${PRESTIGE_UPGRADE_NAMES[upgradeId]} Lv ${currentLevel + 1}.`,
        ),
    };
};
