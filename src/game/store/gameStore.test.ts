import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createStarterParty, createEnemy } from "@/game/entity";

import { createGameStore } from "./gameStore";

describe("createGameStore", () => {
    it("initializes a starter party and first encounter through store actions", () => {
        const store = createGameStore();

        store.getState().initializeParty(createStarterParty("Ayla", "Cleric"));

        const state = store.getState();

        expect(state.party).toHaveLength(3);
        expect(state.enemies).toHaveLength(1);
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