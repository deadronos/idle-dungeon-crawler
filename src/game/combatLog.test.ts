import { describe, expect, it } from "vitest";

import { prependCombatMessages } from "./combatLog";

describe("combatLog", () => {
    it("prepends new messages ahead of the existing log", () => {
        const result = prependCombatMessages(["older-1", "older-2"], "new-1", "new-2");

        expect(result).toEqual(["new-1", "new-2", "older-1", "older-2"]);
    });

    it("keeps the newest retained entries when prepending over the log limit", () => {
        const existingLog = Array.from({ length: 49 }, (_, index) => `older ${index}`);

        const result = prependCombatMessages(existingLog, "new-1", "new-2", "new-3");

        expect(result).toHaveLength(50);
        expect(result.slice(0, 5)).toEqual(["new-1", "new-2", "new-3", "older 0", "older 1"]);
        expect(result.at(-1)).toBe("older 46");
        expect(result).not.toContain("older 47");
        expect(result).not.toContain("older 48");
    });
});
