import { describe, expect, it } from "vitest";

import { SECURE_RANDOM_BRAND } from "../utils/random";
import { createStarterParty } from "./entity";
import {
    createLegacyEquipmentProgression,
    grantVictoryLoot,
} from "./equipmentProgression";
import { createEmptyEquipmentProgressionState } from "./store/types";

const createSequenceRandom = (...rolls: number[]) => {
    let index = 0;
    return {
        [SECURE_RANDOM_BRAND]: true,
        next: () => {
            const roll = rolls[Math.min(index, rolls.length - 1)] ?? 0;
            index += 1;
            return roll;
        },
    } as unknown as import("../utils/random").SecureRandomSource;
};

describe("equipment progression", () => {
    it("grants milestone-tier loot on victory and unlocks higher armory tiers", () => {
        const party = createStarterParty("Ayla", "Cleric");
        const result = grantVictoryLoot(
            createEmptyEquipmentProgressionState(),
            party,
            3,
            3,
            createSequenceRandom(0.1, 0, 0),
        );

        expect(result.gainedItems).toHaveLength(1);
        expect(result.gainedItems[0]?.definitionId).toBe("sunlit-censer");
        expect(result.gainedItems[0]?.tier).toBe(2);
        expect(result.equipmentProgression.highestUnlockedEquipmentTier).toBe(2);
    });

    it("allows duplicate named relic drops as separate item instances", () => {
        const party = createStarterParty("Ayla", "Cleric");
        const startingProgression = createLegacyEquipmentProgression(["sunlit-censer"], {});
        const result = grantVictoryLoot(
            startingProgression,
            party,
            1,
            1,
            createSequenceRandom(0.1, 0, 0),
        );

        const matchingItems = result.equipmentProgression.inventoryItems.filter((item) => item.definitionId === "sunlit-censer");

        expect(matchingItems).toHaveLength(2);
        expect(new Set(matchingItems.map((item) => item.instanceId)).size).toBe(2);
    });

    it("auto-sells overflow loot when the stash is full", () => {
        const party = createStarterParty("Ayla", "Cleric");
        const fullProgression = {
            ...createLegacyEquipmentProgression(["sunlit-censer"], {}),
            inventoryCapacity: 1,
        };
        const result = grantVictoryLoot(
            fullProgression,
            party,
            1,
            1,
            createSequenceRandom(0.1, 0, 0),
        );

        expect(result.gainedItems).toEqual([]);
        expect(result.autoSoldItems).toHaveLength(1);
        expect(result.autoSellGold).toBeGreaterThan(0);
        expect(result.equipmentProgression.inventoryItems).toHaveLength(1);
    });
});
