import Decimal from "decimal.js";

export const getUpgradeCost = (level: number, baseCost: number, growthRate: number, costReducerLevel: number = 0): Decimal => {
    // Each level of costReducer lowers the exponent base by 0.01, down to a minimum of 1.05
    const actualGrowthRate = Math.max(1.05, growthRate - (costReducerLevel * 0.01));
    return new Decimal(baseCost).times(Decimal.pow(actualGrowthRate, level)).floor();
};

export const getTrainingUpgradeCost = (level: number, costReducerLevel: number = 0): Decimal => {
    return getUpgradeCost(level, 25, 1.6, costReducerLevel);
};

export const getFortificationUpgradeCost = (level: number, costReducerLevel: number = 0): Decimal => {
    return getUpgradeCost(level, 35, 1.75, costReducerLevel);
};