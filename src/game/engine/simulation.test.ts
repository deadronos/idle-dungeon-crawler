import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createHero } from "../entity";

import {
    applyPhysicalMitigation,
    createEncounter,
    createInitialGameState,
    createSequenceRandomSource,
    getEncounterSize,
    getPhysicalHitChance,
    getSpellHitChance,
    isBossFloor,
    simulateTick,
} from "./simulation";

const advanceUntilLogs = (state = createInitialGameState(), randomSource = createSequenceRandomSource(0), logCount = 1) => {
    let nextState = state;
    let result = simulateTick(nextState, randomSource);
    nextState = result.state;
    let safetyCounter = 0;

    while (nextState.combatLog.length < logCount && safetyCounter < 500) {
        result = simulateTick(nextState, randomSource);
        nextState = result.state;
        safetyCounter += 1;
    }

    if (safetyCounter >= 500) {
        throw new Error("Expected combat log updates before safety limit.");
    }

    return result;
};

const advanceTicks = (state = createInitialGameState(), randomSource = createSequenceRandomSource(0), tickCount = 1) => {
    let nextState = state;
    let result = simulateTick(nextState, randomSource);
    nextState = result.state;

    for (let tick = 1; tick < tickCount; tick += 1) {
        result = simulateTick(nextState, randomSource);
        nextState = result.state;
    }

    return result;
};

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

        const result = simulateTick(
            createInitialGameState({
                party: [cleric],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
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

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.95),
        );

        expect(result.state.enemies[0].currentHp.eq(startingHp)).toBe(true);
        expect(result.state.party[0].currentResource.toNumber()).toBe(8);
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

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.2),
        );

        expect(result.state.enemies[0].currentHp.eq(startingHp)).toBe(true);
        expect(result.state.party[0].currentResource.toNumber()).toBe(8);
        expect(result.state.combatLog[0]).toMatch(/parries/i);
        expect(result.state.combatEvents.some((event) => event.kind === "parry")).toBe(true);
    });

    it("lets heroes parry melee enemy attacks", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.parryRating = 200;
        warrior.currentHp = warrior.maxHp;

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = 99;
        enemy.critChance = 0;
        const startingHp = warrior.currentHp;

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.2),
        );

        expect(result.state.party[0].currentHp.eq(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/Brom parries Sewer Rat Lv1's Attack!/);
        expect(result.state.combatEvents.some((event) => event.kind === "parry" && event.targetId === warrior.id)).toBe(true);
    });

    it("does not let ranged physical attacks be parried", () => {
        const archer = createHero("hero_1", "Vera", "Archer");
        archer.actionProgress = 99;
        archer.critChance = 0;
        archer.currentResource = new Decimal(50);

        const enemy = createEnemy(1, "enemy_1");
        enemy.parryRating = 999;
        const startingHp = enemy.currentHp;

        const result = simulateTick(
            createInitialGameState({
                party: [archer],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        expect(result.state.enemies[0].currentHp.lt(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/piercing shot/i);
        expect(result.state.combatLog[0]).not.toMatch(/parries/i);
    });

    it("does not let Rage Strike be parried", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = 99;
        warrior.critChance = 0;
        warrior.currentResource = new Decimal(40);

        const enemy = createEnemy(1, "enemy_1");
        enemy.parryRating = 999;
        const startingHp = enemy.currentHp;

        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        expect(result.state.enemies[0].currentHp.lt(startingHp)).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/rage strike/i);
        expect(result.state.combatLog[0]).not.toMatch(/parries/i);
    });

    it("uses a diminishing-return armor curve for physical mitigation", () => {
        expect(applyPhysicalMitigation(new Decimal(40), new Decimal(20)).toDecimalPlaces(2).toNumber()).toBeCloseTo(28.57, 2);
        expect(applyPhysicalMitigation(new Decimal(40), new Decimal(80)).toDecimalPlaces(2).toNumber()).toBeCloseTo(15.38, 2);
    });

    it("keeps spell hit only modestly above physical hit for the same matchup", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        const enemy = createEnemy(5, "enemy_5");

        const physicalHit = getPhysicalHitChance(warrior, enemy);
        const spellHit = getSpellHitChance(cleric, enemy);

        expect(spellHit).toBeGreaterThan(physicalHit);
        expect(spellHit - physicalHit).toBeLessThan(0.08);
    });

    it("lets warriors reach Rage Strike within a few exchanged actions", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.critChance = 0;
        warrior.parryRating = 0;

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = 99;
        enemy.critChance = 0;
        enemy.currentHp = new Decimal(10_000);

        const rolls: number[] = [];
        for (let index = 0; index < 400; index += 1) {
            rolls.push(0, 0, 0.9, 0.9);
        }

        const result = advanceTicks(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(...rolls),
            180,
        );

        expect(result.state.combatLog.some((entry) => /rage strike/i.test(entry))).toBe(true);
    });

    it("stops archers from sustaining Piercing Shot every action after the opening pool", () => {
        const archer = createHero("hero_1", "Vera", "Archer");
        const enemy = createEnemy(1, "enemy_1");
        enemy.currentHp = new Decimal(10_000);
        enemy.actionProgress = -999;

        const rolls: number[] = [];
        for (let index = 0; index < 60; index += 1) {
            rolls.push(0, 0, 0.9);
        }

        let result = createInitialGameState({
            party: [archer],
            enemies: [enemy],
            combatLog: [],
        });

        for (let actionCount = 0; actionCount < 6; actionCount += 1) {
            result = advanceUntilLogs(result, createSequenceRandomSource(...rolls), actionCount + 1).state;
        }

        const recentLogs = result.combatLog.slice(0, 6).join("\n");

        expect(recentLogs).toMatch(/piercing shot/i);
        expect(recentLogs).toMatch(/uses Attack/i);
    });

    it("levels archers with fixed dex growth only", () => {
        const archer = createHero("hero_1", "Vera", "Archer");
        archer.exp = new Decimal(99);
        archer.actionProgress = 99;
        archer.critChance = 0;

        const enemy = createEnemy(10, "enemy_10");
        enemy.currentHp = new Decimal(1);

        const result = simulateTick(
            createInitialGameState({
                floor: 10,
                party: [archer],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        expect(result.state.party[0].level).toBe(2);
        expect(result.state.party[0].attributes.dex).toBe(14);
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

        const result = simulateTick(
            createInitialGameState({
                floor: 4,
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        expect(result.state.enemies[0].currentHp.eq(0)).toBe(true);
        expect(result.state.gold.eq(new Decimal(13))).toBe(true);
        expect(result.state.combatLog).toContain("Sewer Rat Lv4 was defeated!");
    });
});
