import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createRecruitHero, createStarterParty } from "@/game/entity";
import { createInitialGameState } from "@/game/engine/simulation";
import { createLegacyEquipmentProgression } from "@/game/equipmentProgression";

import {
    getEquipItemState,
    getFortificationUpgradePurchaseState,
    getInventoryCapacityUpgradePurchaseState,
    getPartySlotUnlockState,
    getPrestigeUpgradePurchaseState,
    getRecruitHeroState,
    getRetireHeroState,
    getRetirementHeroSoulReward,
    getSellInventoryItemState,
    getTrainingUpgradePurchaseState,
    getUnequipItemState,
} from "./progressionRules";

describe("progressionRules", () => {
    it("calculates retirement hero souls from hero level milestones", () => {
        expect(getRetirementHeroSoulReward(4)).toBe(0);
        expect(getRetirementHeroSoulReward(5)).toBe(10);
        expect(getRetirementHeroSoulReward(14)).toBe(20);
    });

    it("returns the next party-slot unlock transition when the milestone is met", () => {
        const state = createInitialGameState({
            gold: new Decimal(100),
            highestFloorCleared: 3,
            partyCapacity: 1,
        });

        const nextState = getPartySlotUnlockState(state);

        expect(nextState).not.toBeNull();
        expect(nextState?.partyCapacity).toBe(2);
        expect(nextState?.gold?.toString()).toBe("40");
        expect(nextState?.combatLog?.[0]).toMatch(/party capacity expanded to 2/i);
    });

    it("spends hero souls and recalculates the party for prestige upgrades", () => {
        const state = createInitialGameState({
            heroSouls: new Decimal(20),
            party: createStarterParty("Ayla", "Warrior"),
        });

        const nextState = getPrestigeUpgradePurchaseState(state, "hpMultiplier");

        expect(nextState).not.toBeNull();
        expect(nextState?.heroSouls?.toString()).toBe("5");
        expect(nextState?.prestigeUpgrades).toEqual({
            ...state.prestigeUpgrades,
            hpMultiplier: 1,
        });
        expect(nextState?.party?.[0]?.maxHp.gt(state.party[0]?.maxHp ?? 0)).toBe(true);
        expect(nextState?.combatLog?.[0]).toMatch(/purchased vitality/i);
    });

    it("equips stash gear through a pure transition that recalculates hero stats", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
        });

        const nextState = getEquipItemState(state, "hero_1", "sunlit-censer");

        expect(nextState).not.toBeNull();
        expect(nextState?.equipmentProgression?.equippedItemInstanceIdsByHeroId.hero_1).toHaveLength(1);
        expect(nextState?.party?.[0]?.magicDamage.gt(state.party[0]?.magicDamage ?? 0)).toBe(true);
        expect(nextState?.combatLog?.[0]).toMatch(/equipped/i);
    });
});

describe("getRecruitHeroState", () => {
    it("returns null when the party is already at capacity", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const state = createInitialGameState({
            party,
            partyCapacity: 1,
            gold: new Decimal(1000),
        });

        expect(getRecruitHeroState(state, "Cleric")).toBeNull();
    });

    it("returns null when there is not enough gold", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const state = createInitialGameState({
            party,
            partyCapacity: 2,
            gold: new Decimal(0),
        });

        expect(getRecruitHeroState(state, "Cleric")).toBeNull();
    });

    it("deducts gold and adds the new hero when conditions are met", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const state = createInitialGameState({
            party,
            partyCapacity: 2,
            gold: new Decimal(100),
        });

        const nextState = getRecruitHeroState(state, "Cleric");

        expect(nextState).not.toBeNull();
        expect(nextState?.gold?.lt(new Decimal(100))).toBe(true);
        const newParty = nextState?.party ?? [];
        expect(newParty).toHaveLength(2);
        expect(newParty[1]?.class).toBe("Cleric");
        expect(nextState?.combatLog?.[0]).toMatch(/joined the party/i);
    });
});

describe("getRetireHeroState", () => {
    it("returns null when attempting to retire the protected first hero (hero_1)", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Warrior"),
        });

        expect(getRetireHeroState(state, "hero_1")).toBeNull();
    });

    it("returns null when the hero id does not exist in the party", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Warrior"),
        });

        expect(getRetireHeroState(state, "hero_99")).toBeNull();
    });

    it("removes the hero and awards no hero souls when the hero level is below 5", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const recruit = createRecruitHero("Cleric", party);
        const state = createInitialGameState({ party: [...party, recruit] });

        const nextState = getRetireHeroState(state, recruit.id);

        expect(nextState).not.toBeNull();
        expect(nextState?.party).toHaveLength(1);
        expect(nextState?.heroSouls?.toNumber()).toBe(0);
        expect(nextState?.combatLog?.[0]).toMatch(/dismissed/i);
    });

    it("awards hero souls based on level and logs the reward message when level >= 5", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const recruit = createRecruitHero("Cleric", party);
        recruit.level = 5;
        const state = createInitialGameState({ party: [...party, recruit] });

        const nextState = getRetireHeroState(state, recruit.id);

        expect(nextState).not.toBeNull();
        expect(nextState?.heroSouls?.toNumber()).toBeGreaterThan(0);
        expect(nextState?.combatLog?.[0]).toMatch(/hero souls/i);
    });
});

describe("getTrainingUpgradePurchaseState", () => {
    it("returns null when there is not enough gold", () => {
        const state = createInitialGameState({ gold: new Decimal(0) });
        expect(getTrainingUpgradePurchaseState(state)).toBeNull();
    });

    it("deducts gold and increments the training level when affordable", () => {
        const state = createInitialGameState({ gold: new Decimal(10000) });
        const nextState = getTrainingUpgradePurchaseState(state);

        expect(nextState).not.toBeNull();
        expect(nextState?.gold?.lt(new Decimal(10000))).toBe(true);
        expect(nextState?.metaUpgrades?.training).toBe(state.metaUpgrades.training + 1);
    });
});

describe("getFortificationUpgradePurchaseState", () => {
    it("returns null when there is not enough gold", () => {
        const state = createInitialGameState({ gold: new Decimal(0) });
        expect(getFortificationUpgradePurchaseState(state)).toBeNull();
    });

    it("deducts gold and increments the fortification level when affordable", () => {
        const state = createInitialGameState({ gold: new Decimal(10000) });
        const nextState = getFortificationUpgradePurchaseState(state);

        expect(nextState).not.toBeNull();
        expect(nextState?.gold?.lt(new Decimal(10000))).toBe(true);
        expect(nextState?.metaUpgrades?.fortification).toBe(state.metaUpgrades.fortification + 1);
    });
});

describe("getPartySlotUnlockState null cases", () => {
    it("returns null when the milestone floor has not been reached", () => {
        const state = createInitialGameState({
            gold: new Decimal(1000),
            highestFloorCleared: 0,
            partyCapacity: 1,
        });

        expect(getPartySlotUnlockState(state)).toBeNull();
    });

    it("returns null when there is not enough gold", () => {
        const state = createInitialGameState({
            gold: new Decimal(0),
            highestFloorCleared: 5,
            partyCapacity: 1,
        });

        expect(getPartySlotUnlockState(state)).toBeNull();
    });
});

describe("getUnequipItemState", () => {
    it("returns null when the hero does not exist", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
        });

        expect(getUnequipItemState(state, "hero_99", "weapon")).toBeNull();
    });

    it("returns null when no item is equipped in the target slot", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            equipmentProgression: createLegacyEquipmentProgression([], {}),
        });

        expect(getUnequipItemState(state, "hero_1", "weapon")).toBeNull();
    });

    it("removes the equipped item from the hero slot and recalculates stats", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            equipmentProgression: createLegacyEquipmentProgression(
                ["sunlit-censer"],
                { hero_1: ["sunlit-censer"] },
            ),
        });

        const equippedMagicDamage = state.party[0]?.magicDamage;
        const nextState = getUnequipItemState(state, "hero_1", "weapon");

        expect(nextState).not.toBeNull();
        expect(nextState?.equipmentProgression?.equippedItemInstanceIdsByHeroId.hero_1 ?? []).toHaveLength(0);
        expect(nextState?.party?.[0]?.magicDamage.lt(equippedMagicDamage ?? new Decimal(0))).toBe(true);
        expect(nextState?.combatLog?.[0]).toMatch(/cleared/i);
    });
});

describe("getSellInventoryItemState", () => {
    it("returns null when the item is currently equipped (not sellable)", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            equipmentProgression: createLegacyEquipmentProgression(
                ["sunlit-censer"],
                { hero_1: ["sunlit-censer"] },
            ),
        });

        const equippedItemId = state.equipmentProgression.equippedItemInstanceIdsByHeroId.hero_1?.[0] ?? "";
        expect(getSellInventoryItemState(state, equippedItemId)).toBeNull();
    });

    it("adds sell value to gold and removes the item from inventory", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            gold: new Decimal(0),
            equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
        });

        const itemId = state.equipmentProgression.inventoryItems[0]?.instanceId ?? "";
        const nextState = getSellInventoryItemState(state, itemId);

        expect(nextState).not.toBeNull();
        expect(nextState?.gold?.gt(new Decimal(0))).toBe(true);
        expect(nextState?.equipmentProgression?.inventoryItems).toHaveLength(0);
        expect(nextState?.combatLog?.[0]).toMatch(/sold/i);
    });
});

describe("getInventoryCapacityUpgradePurchaseState", () => {
    it("returns null when the milestone floor has not been reached", () => {
        const state = createInitialGameState({
            gold: new Decimal(10000),
            highestFloorCleared: 0,
        });

        expect(getInventoryCapacityUpgradePurchaseState(state)).toBeNull();
    });
});
