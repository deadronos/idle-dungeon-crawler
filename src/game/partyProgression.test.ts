import { describe, expect, it } from "vitest";

import { PARTY_SLOT_UNLOCKS, canUnlockPartySlot, getNextPartySlotUnlock, getPartySlotUnlockCost, getRecruitCost } from "./partyProgression";

describe("party progression", () => {
    it("keeps the retuned slot ladder ahead of the next major pressure spikes", () => {
        expect(PARTY_SLOT_UNLOCKS).toEqual([
            { capacity: 2, milestoneFloor: 3, cost: 60 },
            { capacity: 3, milestoneFloor: 8, cost: 180 },
            { capacity: 4, milestoneFloor: 18, cost: 500 },
            { capacity: 5, milestoneFloor: 28, cost: 1200 },
        ]);
    });

    it("only unlocks slots after the new milestone floors are cleared", () => {
        expect(canUnlockPartySlot(1, 2)).toBe(false);
        expect(canUnlockPartySlot(1, 3)).toBe(true);
        expect(canUnlockPartySlot(2, 7)).toBe(false);
        expect(canUnlockPartySlot(2, 8)).toBe(true);
        expect(canUnlockPartySlot(3, 17)).toBe(false);
        expect(canUnlockPartySlot(3, 18)).toBe(true);
        expect(canUnlockPartySlot(4, 27)).toBe(false);
        expect(canUnlockPartySlot(4, 28)).toBe(true);
    });

    it("returns the next slot unlock and costs for the current party size", () => {
        expect(getNextPartySlotUnlock(1)).toEqual({ capacity: 2, milestoneFloor: 3, cost: 60 });
        expect(getNextPartySlotUnlock(2)).toEqual({ capacity: 3, milestoneFloor: 8, cost: 180 });
        expect(getNextPartySlotUnlock(4)).toEqual({ capacity: 5, milestoneFloor: 28, cost: 1200 });
        expect(getNextPartySlotUnlock(5)).toBeNull();

        expect(getPartySlotUnlockCost(1)?.toString()).toBe("60");
        expect(getPartySlotUnlockCost(2)?.toString()).toBe("180");
        expect(getPartySlotUnlockCost(4)?.toString()).toBe("1200");
        expect(getPartySlotUnlockCost(5)).toBeNull();
    });

    it("keeps recruit costs tied to current party size", () => {
        expect(getRecruitCost(1).toString()).toBe("30");
        expect(getRecruitCost(2).toString()).toBe("90");
        expect(getRecruitCost(3).toString()).toBe("220");
        expect(getRecruitCost(4).toString()).toBe("550");
    });
});
