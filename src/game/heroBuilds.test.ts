import { describe, expect, it } from "vitest";

import { createStarterParty, getCombatRatings, recalculateEntity } from "@/game/entity";
import { createEmptyEquipmentProgressionState } from "@/game/store/types";

import {
    createEquipmentItemInstance,
    getEarnedTalentPointTotal,
    getHeroBuildProfile,
    getSpentTalentRanksForHero,
    synchronizeEquipmentProgression,
    synchronizeTalentProgression,
} from "./heroBuilds";

describe("hero build helpers", () => {
    it("extends talent point awards across even levels until total rank capacity is filled", () => {
        expect(getEarnedTalentPointTotal("Cleric", 1)).toBe(0);
        expect(getEarnedTalentPointTotal("Cleric", 2)).toBe(1);
        expect(getEarnedTalentPointTotal("Cleric", 4)).toBe(2);
        expect(getEarnedTalentPointTotal("Cleric", 6)).toBe(3);
        expect(getEarnedTalentPointTotal("Cleric", 12)).toBe(6);
        expect(getEarnedTalentPointTotal("Cleric", 20)).toBe(6);
    });

    it("keeps remaining points in sync with spent talent ranks", () => {
        const party = createStarterParty("Ayla", "Cleric");
        party[0].level = 8;

        const talentProgression = synchronizeTalentProgression(party, {
            talentRanksByHeroId: {
                hero_1: {
                    "cleric-sunfire": 2,
                    "cleric-shepherd": 1,
                },
            },
            talentPointsByHeroId: {
                hero_1: 0,
            },
        });

        expect(getSpentTalentRanksForHero("hero_1", talentProgression)).toBe(3);
        expect(talentProgression.talentPointsByHeroId.hero_1).toBe(1);
    });

    it("applies stronger build bonuses at higher talent ranks", () => {
        const [baselineCleric] = createStarterParty("Ayla", "Cleric");
        const [rankedCleric] = createStarterParty("Ayla", "Cleric");

        const rankOneProgression = synchronizeTalentProgression([rankedCleric], {
            talentRanksByHeroId: {
                hero_1: {
                    "cleric-sunfire": 1,
                },
            },
            talentPointsByHeroId: {
                hero_1: 0,
            },
        });

        const rankThreeProgression = synchronizeTalentProgression([rankedCleric], {
            talentRanksByHeroId: {
                hero_1: {
                    "cleric-sunfire": 3,
                },
            },
            talentPointsByHeroId: {
                hero_1: 0,
            },
        });

        const baselineRatings = getCombatRatings(baselineCleric);

        recalculateEntity(rankedCleric, undefined, undefined, {
            talentProgression: rankOneProgression,
            equipmentProgression: {
                inventoryItems: [],
                equippedItemInstanceIdsByHeroId: { hero_1: [] },
                highestUnlockedEquipmentTier: 1,
                inventoryCapacityLevel: 0,
                inventoryCapacity: 12,
                nextInstanceSequence: 1,
            },
        });

        const rankOneRatings = getCombatRatings(rankedCleric, {
            talentProgression: rankOneProgression,
            equipmentProgression: {
                inventoryItems: [],
                equippedItemInstanceIdsByHeroId: { hero_1: [] },
                highestUnlockedEquipmentTier: 1,
                inventoryCapacityLevel: 0,
                inventoryCapacity: 12,
                nextInstanceSequence: 1,
            },
        });

        recalculateEntity(rankedCleric, undefined, undefined, {
            talentProgression: rankThreeProgression,
            equipmentProgression: {
                inventoryItems: [],
                equippedItemInstanceIdsByHeroId: { hero_1: [] },
                highestUnlockedEquipmentTier: 1,
                inventoryCapacityLevel: 0,
                inventoryCapacity: 12,
                nextInstanceSequence: 1,
            },
        });

        const rankThreeRatings = getCombatRatings(rankedCleric, {
            talentProgression: rankThreeProgression,
            equipmentProgression: {
                inventoryItems: [],
                equippedItemInstanceIdsByHeroId: { hero_1: [] },
                highestUnlockedEquipmentTier: 1,
                inventoryCapacityLevel: 0,
                inventoryCapacity: 12,
                nextInstanceSequence: 1,
            },
        });

        expect(rankOneRatings.spellPower).toBeGreaterThan(baselineRatings.spellPower);
        expect(rankThreeRatings.spellPower).toBeGreaterThan(rankOneRatings.spellPower);
        expect(rankThreeRatings.potency).toBeGreaterThan(rankOneRatings.potency);
    });

    it("aggregates passive, talent, and equipment effects through the compatibility exports", () => {
        const [cleric] = createStarterParty("Ayla", "Cleric");
        cleric.level = 6;

        const item = createEquipmentItemInstance("sunlit-censer", { instanceId: "censer-1" });
        expect(item).not.toBeNull();
        if (!item) {
            return;
        }

        const talentProgression = synchronizeTalentProgression([cleric], {
            talentRanksByHeroId: {
                hero_1: {
                    "cleric-sunfire": 2,
                },
            },
            talentPointsByHeroId: {
                hero_1: 0,
            },
        });
        const equipmentProgression = synchronizeEquipmentProgression([cleric], {
            ...createEmptyEquipmentProgressionState(),
            inventoryItems: [item],
            equippedItemInstanceIdsByHeroId: {
                hero_1: [item.instanceId],
            },
        });

        const profile = getHeroBuildProfile(cleric, {
            talentProgression,
            equipmentProgression,
        });

        expect(profile.passive?.id).toBe("cleric-sanctified-reserves");
        expect(profile.talents.map((talent) => `${talent.id}:${talent.currentRank}`)).toEqual(["cleric-sunfire:2"]);
        expect(profile.equippedItems.map((equippedItem) => equippedItem.definitionId)).toEqual(["sunlit-censer"]);
        expect(profile.effects.ratingBonuses.spellPower ?? 0).toBeGreaterThan(0);
        expect(profile.effects.blessRegenMultiplierBonus).toBeGreaterThan(0);
    });
});
