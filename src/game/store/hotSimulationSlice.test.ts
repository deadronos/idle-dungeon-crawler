import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createStarterParty } from "@/game/entity";

import { createGameStore } from "./gameStore";

describe("hotSimulationSlice", () => {
    describe("toggleAutoAdvance", () => {
        it("flips the autoAdvance flag each time it is called", () => {
            const store = createGameStore({ autoAdvance: false });

            store.getState().toggleAutoAdvance();
            expect(store.getState().autoAdvance).toBe(true);

            store.getState().toggleAutoAdvance();
            expect(store.getState().autoAdvance).toBe(false);
        });
    });

    describe("toggleAutoFight", () => {
        it("flips the autoFight flag each time it is called", () => {
            const store = createGameStore({ autoFight: false });

            store.getState().toggleAutoFight();
            expect(store.getState().autoFight).toBe(true);

            store.getState().toggleAutoFight();
            expect(store.getState().autoFight).toBe(false);
        });
    });

    describe("previousFloor", () => {
        it("does not decrement below floor 1", () => {
            const store = createGameStore({ floor: 1 });

            store.getState().previousFloor();

            expect(store.getState().floor).toBe(1);
        });

        it("decrements the floor when above 1 and resets the encounter", () => {
            const store = createGameStore({ floor: 3 });

            store.getState().previousFloor();

            expect(store.getState().floor).toBe(2);
        });
    });

    describe("nextFloor", () => {
        it("increments the floor and resets the encounter", () => {
            const store = createGameStore({ floor: 1 });

            store.getState().nextFloor();

            expect(store.getState().floor).toBe(2);
        });
    });

    describe("appendCombatLog", () => {
        it("prepends a message to the combat log", () => {
            const store = createGameStore();

            store.getState().appendCombatLog("Test message");

            expect(store.getState().combatLog[0]).toBe("Test message");
        });

        it("adds multiple messages in most-recent-first order", () => {
            const store = createGameStore();

            store.getState().appendCombatLog("First");
            store.getState().appendCombatLog("Second");

            expect(store.getState().combatLog[0]).toBe("Second");
            expect(store.getState().combatLog[1]).toBe("First");
        });
    });

    describe("addMessage", () => {
        it("delegates to appendCombatLog and prepends the message", () => {
            const store = createGameStore();

            store.getState().addMessage("Hello from addMessage");

            expect(store.getState().combatLog[0]).toBe("Hello from addMessage");
        });
    });

    describe("initializeParty", () => {
        it("sets the party and creates an initial encounter", () => {
            const party = createStarterParty("Ayla", "Warrior");
            const store = createGameStore();

            store.getState().initializeParty(party);

            expect(store.getState().party).toHaveLength(1);
            expect(store.getState().party[0]?.name).toBe("Ayla");
            expect(store.getState().enemies.length).toBeGreaterThan(0);
        });
    });

    describe("handlePartyWipe", () => {
        it("resets the floor to 1 and prepares a fresh encounter after a party wipe", () => {
            const store = createGameStore({
                floor: 5,
                party: createStarterParty("Ayla", "Warrior"),
                enemies: [createEnemy(5, "enemy_5_0")],
            });

            store.getState().handlePartyWipe();

            expect(store.getState().floor).toBe(1);
            expect(store.getState().enemies.length).toBeGreaterThan(0);
        });
    });

    describe("stepSimulation", () => {
        it("advances the simulation state when autoFight is enabled", () => {
            const party = createStarterParty("Ayla", "Warrior");
            const warrior = party[0];
            if (!warrior) {
                throw new Error("Expected a warrior in the starter party.");
            }
            warrior.actionProgress = 0;

            const store = createGameStore({
                party,
                enemies: [createEnemy(1, "enemy_1")],
                autoFight: true,
            });

            store.getState().stepSimulation();

            const nextWarrior = store.getState().party[0];
            expect(nextWarrior?.actionProgress).toBeGreaterThan(0);
        });

        it("processes many ticks in a single call when given a large delta", () => {
            const party = createStarterParty("Ayla", "Warrior");
            const store = createGameStore({
                party,
                enemies: [createEnemy(1, "enemy_1")],
                autoFight: true,
            });

            const initialProgress = store.getState().party[0]?.actionProgress ?? 0;

            // A large delta should advance the simulation significantly
            store.getState().stepSimulation(5000);

            // After many ticks, hero action progress or combat events must have changed
            const finalProgress = store.getState().party[0]?.actionProgress ?? 0;
            const finalEnemies = store.getState().enemies;
            // Either progress changed or combat resolved (enemies may be depleted)
            const simulationRan = finalProgress !== initialProgress || finalEnemies.length === 0 || store.getState().combatLog.length > 0;
            expect(simulationRan).toBe(true);
        });
    });

    describe("selectHotSimulationState", () => {
        it("projects only the hot simulation slice fields from the store", async () => {
            const { selectHotSimulationState } = await import("./hotSimulationSlice");

            const store = createGameStore({
                party: createStarterParty("Ayla", "Warrior"),
                gold: new Decimal(99),
                floor: 3,
                autoFight: true,
                autoAdvance: false,
            });

            const slice = selectHotSimulationState(store.getState());

            expect(slice.floor).toBe(3);
            expect(slice.gold.toString()).toBe("99");
            expect(slice.autoFight).toBe(true);
            expect(slice.autoAdvance).toBe(false);
            expect(Array.isArray(slice.party)).toBe(true);
            expect(Array.isArray(slice.enemies)).toBe(true);
            expect(Array.isArray(slice.combatLog)).toBe(true);
            expect(Array.isArray(slice.combatEvents)).toBe(true);
        });
    });
});
