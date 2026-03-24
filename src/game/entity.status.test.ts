import { describe, expect, it } from "vitest";

import { getStatusEffectBadge, getStatusEffectName } from "./entity.status";
import type { StatusEffectKey } from "./entity.types";

describe("getStatusEffectName", () => {
    it("returns the display name for each known status effect key", () => {
        expect(getStatusEffectName("burn")).toBe("Burn");
        expect(getStatusEffectName("slow")).toBe("Slow");
        expect(getStatusEffectName("weaken")).toBe("Weaken");
        expect(getStatusEffectName("regen")).toBe("Regen");
        expect(getStatusEffectName("hex")).toBe("Hex");
        expect(getStatusEffectName("blind")).toBe("Blind");
    });

    it("capitalizes and returns unknown status keys via the default branch", () => {
        // Cast to StatusEffectKey to test the default branch
        expect(getStatusEffectName("unknown" as StatusEffectKey)).toBe("Unknown");
        expect(getStatusEffectName("poison" as StatusEffectKey)).toBe("Poison");
    });
});

describe("getStatusEffectBadge", () => {
    it("returns BRN for a single burn stack", () => {
        expect(getStatusEffectBadge({ key: "burn", stacks: 1 })).toBe("BRN");
    });

    it("returns BRN xN for multiple burn stacks", () => {
        expect(getStatusEffectBadge({ key: "burn", stacks: 2 })).toBe("BRN x2");
        expect(getStatusEffectBadge({ key: "burn", stacks: 3 })).toBe("BRN x3");
    });

    it("returns the correct badge abbreviation for every named status key", () => {
        expect(getStatusEffectBadge({ key: "slow", stacks: 1 })).toBe("SLW");
        expect(getStatusEffectBadge({ key: "weaken", stacks: 1 })).toBe("WKN");
        expect(getStatusEffectBadge({ key: "regen", stacks: 1 })).toBe("RGN");
        expect(getStatusEffectBadge({ key: "hex", stacks: 1 })).toBe("HEX");
        expect(getStatusEffectBadge({ key: "blind", stacks: 1 })).toBe("BLD");
    });

    it("falls back to a capitalised three-letter abbreviation for unknown keys", () => {
        expect(getStatusEffectBadge({ key: "poison" as StatusEffectKey, stacks: 1 })).toBe("POI");
        expect(getStatusEffectBadge({ key: "stun" as StatusEffectKey, stacks: 1 })).toBe("STU");
    });
});
