import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import {
    formatPercent,
    formatRatioPercent,
    formatUiStat,
    getEntityHealthBarColorClass,
    getHealthBarColorClass,
    getStatusChipToneClass,
    ratioToClampedPercent,
} from "./helpers";

describe("game UI helpers", () => {
    it("formats UI stat values without trailing zeros", () => {
        expect(formatUiStat()).toBe("0");
        expect(formatUiStat(Number.NaN)).toBe("0");
        expect(formatUiStat(9)).toBe("9");
        expect(formatUiStat(15.3)).toBe("15.3");
        expect(formatUiStat(10.0)).toBe("10");
    });

    it("formats percentages for numeric values and ratios", () => {
        expect(formatPercent(150)).toBe("150%");
        expect(formatPercent(7.25, 1)).toBe("7.3%");
        expect(formatRatioPercent(0.125, 1)).toBe("12.5%");
    });

    it("clamps ratio percentages used for bar widths", () => {
        expect(ratioToClampedPercent(-0.2)).toBe(0);
        expect(ratioToClampedPercent(0.35)).toBe(35);
        expect(ratioToClampedPercent(1.8)).toBe(100);
    });

    it("shares the same health color thresholds for direct ratios and entities", () => {
        expect(getHealthBarColorClass(0.1)).toBe("bg-red-500");
        expect(getHealthBarColorClass(0.4)).toBe("bg-amber-500");
        expect(getHealthBarColorClass(0.9)).toBe("bg-emerald-500");

        expect(
            getEntityHealthBarColorClass({
                currentHp: new Decimal(20),
                maxHp: new Decimal(100),
            }),
        ).toBe("bg-red-500");
    });

    it("returns correct tailwind classes for status chip tones", () => {
        expect(getStatusChipToneClass("buff")).toBe(
            "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
        );
        expect(getStatusChipToneClass("debuff")).toBe(
            "border-red-400/30 bg-red-500/10 text-red-100",
        );
    });
});
