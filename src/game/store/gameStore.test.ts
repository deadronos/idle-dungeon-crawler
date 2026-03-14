import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createRecruitHero, createStarterParty } from "@/game/entity";

import { createGameStore } from "./gameStore";

describe("createGameStore", () => {
    it("initializes a starter party and first encounter through store actions", () => {
        const store = createGameStore();

        store.getState().initializeParty(createStarterParty("Ayla", "Cleric"));

        const state = store.getState();

        expect(state.party).toHaveLength(1);
        expect(state.enemies).toHaveLength(1);
        expect(state.partyCapacity).toBe(1);
        expect(state.highestFloorCleared).toBe(0);
        expect(state.combatLog[0]).toMatch(/ayla leads the party into the dungeon/i);
        expect(state.activeSection).toBe("dungeon");
    });

    it("keeps ATB progress frozen when autofight is disabled", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const warrior = party.find((hero) => hero.class === "Warrior");

        if (!warrior) {
            throw new Error("Expected starter party to include a warrior.");
        }

        warrior.actionProgress = 40;

        const store = createGameStore({
            party,
            enemies: [createEnemy(1, "enemy_1")],
            autoFight: false,
        });

        store.getState().stepSimulation();

        const nextWarrior = store.getState().party.find((hero) => hero.class === "Warrior");
        expect(nextWarrior?.actionProgress).toBe(40);
    });

    it("lets clerics heal injured allies through stepSimulation", () => {
        const party = createStarterParty("Ayla", "Cleric");
        party.push(createRecruitHero("Warrior", party));
        const warrior = party.find((hero) => hero.class === "Warrior");
        const cleric = party.find((hero) => hero.class === "Cleric");

        if (!warrior || !cleric) {
            throw new Error("Expected starter party to include a warrior and cleric.");
        }

        const startingHp = warrior.currentHp.div(2);
        warrior.currentHp = startingHp;
        cleric.actionProgress = 99;
        cleric.currentResource = new Decimal(cleric.maxResource);

        const store = createGameStore({
            party,
            enemies: [createEnemy(1, "enemy_1")],
            combatLog: [],
        });

        store.getState().stepSimulation();

        const nextWarrior = store.getState().party.find((hero) => hero.class === "Warrior");

        expect(nextWarrior?.currentHp.gt(startingHp)).toBe(true);
        expect(store.getState().combatLog[0]).toMatch(/casts mend/i);
    });

    it("restarts the current floor when autoadvance is disabled", () => {
        const store = createGameStore({
            party: createStarterParty("Ayla", "Warrior"),
            enemies: [],
            floor: 4,
            autoFight: true,
            autoAdvance: false,
            highestFloorCleared: 2,
            combatLog: [],
        });

        store.getState().stepSimulation();

        const state = store.getState();

        expect(state.floor).toBe(4);
        expect(state.enemies).toHaveLength(1);
        expect(state.highestFloorCleared).toBe(4);
        expect(state.combatLog[0]).toMatch(/repeating floor 4/i);
    });

    it("unlocks party slots and recruits duplicate classes after the retuned milestone clears", () => {
        const store = createGameStore({
            gold: new Decimal(500),
            party: createStarterParty("Ayla", "Warrior"),
            highestFloorCleared: 8,
        });

        store.getState().unlockPartySlot();

        let state = store.getState();
        expect(state.partyCapacity).toBe(2);
        expect(state.gold.toString()).toBe("440");

        store.getState().recruitHero("Warrior");

        state = store.getState();
        expect(state.party).toHaveLength(2);
        expect(state.party.every((hero) => hero.class === "Warrior")).toBe(true);
        expect(state.gold.toString()).toBe("410");

        store.getState().unlockPartySlot();

        state = store.getState();
        expect(state.partyCapacity).toBe(3);
        expect(state.gold.toString()).toBe("230");
    });

    it("preserves recruited heroes and unlocked slots through a party wipe", () => {
        const starterParty = createStarterParty("Ayla", "Warrior");
        const recruit = createRecruitHero("Cleric", starterParty);

        const store = createGameStore({
            gold: new Decimal(123),
            floor: 7,
            party: [...starterParty, recruit],
            partyCapacity: 2,
            highestFloorCleared: 5,
            enemies: [createEnemy(7, "enemy_7")],
        });

        store.getState().handlePartyWipe();

        const state = store.getState();

        expect(state.floor).toBe(1);
        expect(state.gold.toString()).toBe("0");
        expect(state.partyCapacity).toBe(2);
        expect(state.highestFloorCleared).toBe(5);
        expect(state.party).toHaveLength(2);
        expect(state.party.every((hero) => hero.currentHp.eq(hero.maxHp))).toBe(true);
    });

    it("does not scale boss-floor encounter size with additional recruited heroes", () => {
        const party = createStarterParty("Ayla", "Warrior");
        party.push(createRecruitHero("Cleric", party));
        party.push(createRecruitHero("Archer", party));
        party.push(createRecruitHero("Warrior", party));
        party[0].statusEffects = [
            {
                key: "slow",
                polarity: "debuff",
                sourceId: "enemy_water",
                remainingTicks: 30,
                stacks: 1,
                maxStacks: 1,
                potency: 0.2,
            },
        ];

        const store = createGameStore({
            floor: 19,
            party,
            enemies: [createEnemy(19, "enemy_19")],
            combatLog: [],
        });

        store.getState().nextFloor();

        const state = store.getState();

        expect(state.floor).toBe(20);
        expect(state.party).toHaveLength(4);
        expect(state.party[0]?.statusEffects).toEqual([]);
        expect(state.enemies).toHaveLength(1);
        expect(state.enemies[0]?.name.startsWith("Boss:")).toBe(true);
    });

    it("buys training upgrades and recalculates party damage", () => {
        const store = createGameStore({
            gold: new Decimal(100),
            party: createStarterParty("Ayla", "Warrior"),
        });

        const startingDamage = store.getState().party.find((hero) => hero.class === "Warrior")?.physicalDamage;

        store.getState().buyTrainingUpgrade();

        const state = store.getState();
        const upgradedDamage = state.party.find((hero) => hero.class === "Warrior")?.physicalDamage;

        expect(state.metaUpgrades.training).toBe(1);
        expect(state.gold.toString()).toBe("75");
        expect(upgradedDamage?.gt(startingDamage ?? 0)).toBe(true);
    });

    it("stores presentational UI state separately from combat state", () => {
        const store = createGameStore();

        store.getState().setActiveSection("shop");

        expect(store.getState().activeSection).toBe("shop");
        expect(store.getState().floor).toBe(1);
    });
});
