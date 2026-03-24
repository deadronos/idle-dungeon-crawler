import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createRecruitHero, createStarterParty } from "@/game/entity";
import { createInitialGameState } from "@/game/engine/simulation";
import { createLegacyEquipmentProgression } from "@/game/equipmentProgression";

import { createGameStore } from "./gameStore";

describe("progressionSlice", () => {
    describe("getTrainingUpgradeCost", () => {
        it("returns the cost of the next training upgrade at current level", () => {
            const store = createGameStore();

            const cost = store.getState().getTrainingUpgradeCost();

            expect(cost.toNumber()).toBeGreaterThan(0);
        });
    });

    describe("buyTrainingUpgrade", () => {
        it("deducts gold and increments the training level", () => {
            const store = createGameStore({ gold: new Decimal(10000) });

            const costBefore = store.getState().getTrainingUpgradeCost();
            store.getState().buyTrainingUpgrade();

            const state = store.getState();
            expect(state.metaUpgrades.training).toBe(1);
            expect(state.gold.lt(new Decimal(10000))).toBe(true);
            expect(state.gold.toString()).toBe(new Decimal(10000).minus(costBefore).toString());
        });

        it("does nothing when gold is insufficient", () => {
            const store = createGameStore({ gold: new Decimal(0) });

            store.getState().buyTrainingUpgrade();

            expect(store.getState().metaUpgrades.training).toBe(0);
        });
    });

    describe("getFortificationUpgradeCost", () => {
        it("returns the cost of the next fortification upgrade at current level", () => {
            const store = createGameStore();

            const cost = store.getState().getFortificationUpgradeCost();

            expect(cost.toNumber()).toBeGreaterThan(0);
        });
    });

    describe("buyFortificationUpgrade", () => {
        it("deducts gold and increments the fortification level", () => {
            const store = createGameStore({ gold: new Decimal(10000) });

            const costBefore = store.getState().getFortificationUpgradeCost();
            store.getState().buyFortificationUpgrade();

            const state = store.getState();
            expect(state.metaUpgrades.fortification).toBe(1);
            expect(state.gold.toString()).toBe(new Decimal(10000).minus(costBefore).toString());
        });

        it("does nothing when gold is insufficient", () => {
            const store = createGameStore({ gold: new Decimal(0) });

            store.getState().buyFortificationUpgrade();

            expect(store.getState().metaUpgrades.fortification).toBe(0);
        });
    });

    describe("getNextPartySlotUnlock", () => {
        it("returns the next unlock milestone when there is a capacity upgrade available", () => {
            const store = createGameStore({ partyCapacity: 1 });

            const unlock = store.getState().getNextPartySlotUnlock();

            expect(unlock).not.toBeNull();
            expect(unlock?.capacity).toBeGreaterThan(1);
        });

        it("returns null when the party is already at maximum capacity", () => {
            const store = createGameStore({ partyCapacity: 5 });

            const unlock = store.getState().getNextPartySlotUnlock();

            expect(unlock).toBeNull();
        });
    });

    describe("unlockPartySlot", () => {
        it("expands party capacity when the milestone is met and gold is available", () => {
            const store = createGameStore({
                gold: new Decimal(1000),
                highestFloorCleared: 5,
                partyCapacity: 1,
            });

            store.getState().unlockPartySlot();

            expect(store.getState().partyCapacity).toBe(2);
        });

        it("does nothing when the milestone floor has not been reached", () => {
            const store = createGameStore({
                gold: new Decimal(1000),
                highestFloorCleared: 0,
                partyCapacity: 1,
            });

            store.getState().unlockPartySlot();

            expect(store.getState().partyCapacity).toBe(1);
        });
    });

    describe("getRecruitCost", () => {
        it("returns the cost to recruit the next hero based on party size", () => {
            const store = createGameStore({
                party: createStarterParty("Ayla", "Warrior"),
            });

            const cost = store.getState().getRecruitCost();

            expect(cost.toNumber()).toBeGreaterThan(0);
        });
    });

    describe("getInventoryCapacityUpgradeCost", () => {
        it("returns a positive cost when an upgrade is available", () => {
            const store = createGameStore();

            const cost = store.getState().getInventoryCapacityUpgradeCost();

            expect(cost).not.toBeNull();
            expect(cost).toBeGreaterThan(0);
        });
    });

    describe("recruitHero", () => {
        it("adds a hero to the party and deducts gold when conditions are met", () => {
            const store = createGameStore({
                party: createStarterParty("Ayla", "Warrior"),
                partyCapacity: 2,
                gold: new Decimal(100),
            });

            store.getState().recruitHero("Cleric");

            const state = store.getState();
            expect(state.party).toHaveLength(2);
            expect(state.party[1]?.class).toBe("Cleric");
            expect(state.gold.lt(new Decimal(100))).toBe(true);
        });

        it("does nothing when the party is at capacity", () => {
            const store = createGameStore({
                party: createStarterParty("Ayla", "Warrior"),
                partyCapacity: 1,
                gold: new Decimal(1000),
            });

            store.getState().recruitHero("Cleric");

            expect(store.getState().party).toHaveLength(1);
        });
    });

    describe("retireHero", () => {
        it("removes a non-protected hero from the party", () => {
            const party = createStarterParty("Ayla", "Warrior");
            const recruit = createRecruitHero("Cleric", party);
            const store = createGameStore({ party: [...party, recruit] });

            store.getState().retireHero(recruit.id);

            expect(store.getState().party).toHaveLength(1);
            expect(store.getState().party[0]?.class).toBe("Warrior");
        });

        it("does not remove hero_1 (the protected first hero)", () => {
            const store = createGameStore({
                party: createStarterParty("Ayla", "Warrior"),
            });

            store.getState().retireHero("hero_1");

            expect(store.getState().party).toHaveLength(1);
        });
    });

    describe("unlockTalent", () => {
        it("spends talent points and unlocks the first rank of a talent", () => {
            const party = createStarterParty("Ayla", "Cleric");
            const state = createInitialGameState({
                party,
                talentProgression: {
                    talentRanksByHeroId: {},
                    talentPointsByHeroId: { hero_1: 3 },
                },
            });

            const store = createGameStore(state);
            store.getState().unlockTalent("hero_1", "cleric-sunfire");

            const talentState = store.getState().talentProgression;
            expect(talentState.talentRanksByHeroId.hero_1?.["cleric-sunfire"]).toBe(1);
            expect(talentState.talentPointsByHeroId.hero_1).toBeLessThan(3);
        });
    });

    describe("equipItem", () => {
        it("equips an inventory item and updates hero stats", () => {
            const state = createInitialGameState({
                party: createStarterParty("Ayla", "Cleric"),
                equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
            });

            const store = createGameStore(state);
            store.getState().equipItem("hero_1", "sunlit-censer");

            const equipped = store.getState().equipmentProgression.equippedItemInstanceIdsByHeroId.hero_1 ?? [];
            expect(equipped).toHaveLength(1);
        });
    });

    describe("unequipItem", () => {
        it("clears the equipped item from the specified slot", () => {
            const state = createInitialGameState({
                party: createStarterParty("Ayla", "Cleric"),
                equipmentProgression: createLegacyEquipmentProgression(
                    ["sunlit-censer"],
                    { hero_1: ["sunlit-censer"] },
                ),
            });

            const store = createGameStore(state);
            store.getState().unequipItem("hero_1", "weapon");

            const equipped = store.getState().equipmentProgression.equippedItemInstanceIdsByHeroId.hero_1 ?? [];
            expect(equipped).toHaveLength(0);
        });
    });

    describe("sellInventoryItem", () => {
        it("removes an unequipped item from inventory and adds gold", () => {
            const state = createInitialGameState({
                party: createStarterParty("Ayla", "Cleric"),
                gold: new Decimal(0),
                equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
            });

            const store = createGameStore(state);
            const itemId = store.getState().equipmentProgression.inventoryItems[0]?.instanceId ?? "";
            store.getState().sellInventoryItem(itemId);

            expect(store.getState().gold.gt(new Decimal(0))).toBe(true);
            expect(store.getState().equipmentProgression.inventoryItems).toHaveLength(0);
        });
    });

    describe("getPrestigeUpgradeCost", () => {
        it("returns the cost for a prestige upgrade at the current level", () => {
            const store = createGameStore();

            const cost = store.getState().getPrestigeUpgradeCost("hpMultiplier");

            expect(cost).toBeGreaterThan(0);
        });
    });

    describe("buyPrestigeUpgrade", () => {
        it("spends hero souls and increments the prestige upgrade level", () => {
            const store = createGameStore({ heroSouls: new Decimal(20) });

            store.getState().buyPrestigeUpgrade("hpMultiplier");

            const state = store.getState();
            expect(state.prestigeUpgrades.hpMultiplier).toBe(1);
            expect(state.heroSouls.lt(new Decimal(20))).toBe(true);
        });

        it("does nothing when there are not enough hero souls", () => {
            const store = createGameStore({ heroSouls: new Decimal(0) });

            store.getState().buyPrestigeUpgrade("hpMultiplier");

            expect(store.getState().prestigeUpgrades.hpMultiplier).toBe(0);
        });
    });

    describe("selectProgressionState", () => {
        it("projects only the progression slice fields from the store", async () => {
            const { selectProgressionState } = await import("./progressionSlice");

            const store = createGameStore({
                heroSouls: new Decimal(5),
                partyCapacity: 2,
            });

            const slice = selectProgressionState(store.getState());

            expect(slice.partyCapacity).toBe(2);
            expect(slice.heroSouls.toString()).toBe("5");
            expect(slice.metaUpgrades).toBeDefined();
            expect(slice.prestigeUpgrades).toBeDefined();
            expect(slice.talentProgression).toBeDefined();
            expect(slice.equipmentProgression).toBeDefined();
        });
    });
});
