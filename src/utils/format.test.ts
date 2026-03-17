import { describe, expect, it } from "vitest";
import { formatNumber } from "./format";
import Decimal from "decimal.js";

describe("formatNumber", () => {
    describe("small numbers (< 1000)", () => {
        it("formats integers without decimals", () => {
            expect(formatNumber(0)).toBe("0");
            expect(formatNumber(5)).toBe("5");
            expect(formatNumber(999)).toBe("999");
        });

        it("formats fractional numbers with up to 1 decimal place", () => {
            expect(formatNumber(0.5)).toBe("0.5");
            expect(formatNumber(123.456)).toBe("123.5");
            expect(formatNumber(999.9)).toBe("999.9");
        });
    });

    describe("numbers with suffixes", () => {
        it("formats thousands with 'k'", () => {
            expect(formatNumber(1000)).toBe("1.00k");
            expect(formatNumber(1234)).toBe("1.23k");
        });

        it("formats millions with 'M'", () => {
            expect(formatNumber(1000000)).toBe("1.00M");
            expect(formatNumber(1234567)).toBe("1.23M");
        });

        it("formats billions with 'B'", () => {
            expect(formatNumber(1e9)).toBe("1.00B");
        });

        it("formats very large numbers with predefined suffixes", () => {
            // Vg is the last suffix, index 21
            const vgValue = Decimal.pow(1000, 21);
            expect(formatNumber(vgValue)).toBe("1.00Vg");
        });

        it("handles rounding when near the next suffix boundary", () => {
            // 999999.99 will be suffixIndex 1 (k), but shortValue 999.9999 which rounds to 1000.00
            expect(formatNumber(999999.99)).toBe("1000.00k");
        });
    });

    describe("extreme values (beyond suffixes)", () => {
        it("uses exponential notation for values beyond the suffix list", () => {
            const tooBig = Decimal.pow(1000, 22);
            // dec.toExponential(2).replace("+", "")
            // 1e66 -> "1.00e66"
            expect(formatNumber(tooBig)).toBe("1.00e66");
        });
    });

    describe("input types", () => {
        it("handles number inputs", () => {
            expect(formatNumber(1000)).toBe("1.00k");
        });

        it("handles string inputs", () => {
            expect(formatNumber("1000")).toBe("1.00k");
        });

        it("handles Decimal inputs", () => {
            expect(formatNumber(new Decimal(1000))).toBe("1.00k");
        });
    });
});
