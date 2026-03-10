import { describe, expect, it } from "vitest";

import { getFortificationUpgradeCost, getTrainingUpgradeCost } from "./upgrades";

describe("upgrade costs", () => {
    it("starts upgrades at the documented base costs", () => {
        expect(getTrainingUpgradeCost(0).toNumber()).toBe(25);
        expect(getFortificationUpgradeCost(0).toNumber()).toBe(35);
    });

    it("scales upgrade costs upward each level", () => {
        expect(getTrainingUpgradeCost(2).gt(getTrainingUpgradeCost(1))).toBe(true);
        expect(getFortificationUpgradeCost(2).gt(getFortificationUpgradeCost(1))).toBe(true);
    });
});
