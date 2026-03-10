import Decimal from "decimal.js";

export const getUpgradeCost = (level: number, baseCost: number, growthRate: number): Decimal => {
    return new Decimal(baseCost).times(Decimal.pow(growthRate, level)).floor();
};

export const getTrainingUpgradeCost = (level: number): Decimal => {
    return getUpgradeCost(level, 25, 1.6);
};

export const getFortificationUpgradeCost = (level: number): Decimal => {
    return getUpgradeCost(level, 35, 1.75);
};