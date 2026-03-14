import Decimal from "decimal.js";
import { describe, expect, it, vi } from "vitest";

import { createEnemy, createHero } from "../entity";

import { createEncounter, createInitialGameState, getEncounterSize, isBossFloor, simulateTick } from "./simulation";

describe("simulation engine", () => {
    it("scales standard encounters by floor instead of player party size", () => {
        expect(getEncounterSize(1)).toBe(1);
        expect(getEncounterSize(6)).toBe(2);
        expect(getEncounterSize(14)).toBe(3);
        expect(getEncounterSize(24)).toBe(5);
    });

    it("keeps boss floors to a single boss encounter", () => {
        expect(isBossFloor(20)).toBe(true);
        expect(getEncounterSize(20)).toBe(1);

        const encounter = createEncounter(20);

        expect(encounter).toHaveLength(1);
        expect(encounter[0]?.name.startsWith("Boss:")).toBe(true);
    });

    it("applies light resistance to cleric smite damage", () => {
        const cleric = createHero("hero_1", "Ayla", "Cleric");
        cleric.actionProgress = 99;
        cleric.critChance = 0;

        const enemy = createEnemy(1, "enemy_1");
        enemy.resistances.light = 0.5;

        const startingHp = enemy.currentHp;
        const expectedDamage = cleric.magicDamage.times(1 - enemy.resistances.light);

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.9);

        const result = simulateTick(
            createInitialGameState({
                party: [cleric],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.enemies[0].currentHp.eq(startingHp.minus(expectedDamage))).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/uses smite/i);
    });

    it("allows defenders to dodge attacks that fail the hit roll", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.critChance = 0;

        const enemy = createEnemy(1, "enemy_1");
        enemy.evasionRating = 500;
        const startingHp = enemy.currentHp;

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.95);

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.enemies[0].currentHp.eq(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/dodges/i);
        expect(result.state.combatEvents.some((event) => event.kind === "dodge")).toBe(true);
    });

    it("lets melee physical attacks be parried", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.critChance = 0;
        warrior.currentResource = new Decimal(0);

        const enemy = createEnemy(1, "enemy_1");
        enemy.parryRating = 200;
        const startingHp = enemy.currentHp;

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.2);

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.enemies[0].currentHp.eq(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/parries/i);
        expect(result.state.combatEvents.some((event) => event.kind === "parry")).toBe(true);
    });

    it("does not let ranged physical attacks be parried", () => {
        const archer = createHero("hero_1", "Vera", "Archer");
        archer.actionProgress = 99;
        archer.critChance = 0;
        archer.currentResource = new Decimal(50);

        const enemy = createEnemy(1, "enemy_1");
        enemy.parryRating = 999;
        const startingHp = enemy.currentHp;

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.9);

        const result = simulateTick(
            createInitialGameState({
                party: [archer],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.enemies[0].currentHp.lt(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/piercing shot/i);
        expect(result.state.combatLog[0]).not.toMatch(/parries/i);
    });

    it("only grants warrior resource on landed hits", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.currentResource = new Decimal(0);

        const enemy = createEnemy(1, "enemy_1");
        enemy.evasionRating = 500;

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.95);

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.party[0].currentResource.eq(0)).toBe(true);
    });

    it("expires transient combat events as ticks advance", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const enemy = createEnemy(1, "enemy_1");

        const result = simulateTick(
            createInitialGameState({
                autoFight: false,
                party: [warrior],
                enemies: [enemy],
                combatEvents: [
                    {
                        id: "combat-event-1",
                        targetId: enemy.id,
                        kind: "damage",
                        text: "-5",
                        ttlTicks: 1,
                    },
                ],
            }),
        );

        expect(result.state.combatEvents).toHaveLength(0);
        expect(result.outcome).toBe("paused");
    });

    it("awards the updated base gold bonus when an enemy is defeated", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.critChance = 0;

        const enemy = createEnemy(4, "enemy_4");
        enemy.currentHp = new Decimal(1);

        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.9);

        const result = simulateTick(
            createInitialGameState({
                floor: 4,
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
        );

        expect(result.state.enemies[0].currentHp.eq(0)).toBe(true);
        expect(result.state.gold.eq(new Decimal(13))).toBe(true);
        expect(result.state.combatLog).toContain("Sewer Rat Lv4 was defeated!");
    });
});
