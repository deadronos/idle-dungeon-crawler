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

        vi.spyOn(Math, "random").mockReturnValue(0);

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

    it("awards the updated base gold bonus when an enemy is defeated", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.critChance = 0;

        const enemy = createEnemy(4, "enemy_4");
        enemy.currentHp = new Decimal(1);

        vi.spyOn(Math, "random").mockReturnValue(0);

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