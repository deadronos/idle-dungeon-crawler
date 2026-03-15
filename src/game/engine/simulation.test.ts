import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createHero } from "../entity";

import {
    applyElementalMitigation,
    applyPhysicalMitigation,
    createEncounter,
    createInitialGameState,
    createSequenceRandomSource,
    getEffectiveCritMultiplier,
    getEncounterSize,
    getPhysicalHitChance,
    getPenetrationReduction,
    getSpellHitChance,
    getStatusApplicationChance,
    HEX_DURATION_TICKS,
    isBossFloor,
    REGEN_DURATION_TICKS,
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

    it("introduces deterministic archetype composition as floors deepen", () => {
        const earlyEncounter = createEncounter(3);
        const midEncounter = createEncounter(7);
        const lateEncounter = createEncounter(11);

        expect(earlyEncounter.map((enemy) => enemy.enemyArchetype)).toEqual(["Skirmisher"]);
        expect(midEncounter.map((enemy) => enemy.enemyArchetype)).toEqual(["Skirmisher", "Caster"]);
        expect(lateEncounter.map((enemy) => enemy.enemyArchetype)).toEqual(["Caster", "Bruiser", "Support"]);
    });

    it("applies light resistance to cleric smite damage", () => {
        const cleric = createHero("hero_1", "Ayla", "Cleric");
        cleric.actionProgress = 99;
        cleric.critChance = 0;

        const enemy = createEnemy(1, "enemy_1");
        enemy.resistances.light = 0.5;

        const startingHp = enemy.currentHp;
        const expectedDamage = applyElementalMitigation(
            cleric.magicDamage,
            enemy.resistances.light,
            cleric.elementalPenetration,
        );

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

        const enemy = createEnemy(1, "enemy_1", { archetype: "Bruiser" });
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
        expect(result.state.combatLog[0]).toMatch(/Brom parries Sewer Rat Lv1's Crushing Blow!/);
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

    it("has bruisers target the hero with the highest current HP", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        warrior.currentHp = new Decimal(40);
        cleric.currentHp = new Decimal(70);

        const bruiser = createEnemy(6, "enemy_bruiser", { archetype: "Bruiser" });
        bruiser.actionProgress = 99;
        bruiser.critChance = 0;

        const result = simulateTick(
            createInitialGameState({
                party: [warrior, cleric],
                enemies: [bruiser],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9),
        );

        expect(result.state.combatLog[0]).toMatch(/Crushing Blow on Ayla/i);
    });

    it("has skirmishers target low-HP heroes with ranged pressure that cannot be parried", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        warrior.currentHp = new Decimal(25);
        warrior.parryRating = 999;
        cleric.currentHp = new Decimal(80);

        const skirmisher = createEnemy(6, "enemy_skirmisher", { archetype: "Skirmisher" });
        skirmisher.actionProgress = 99;
        skirmisher.critChance = 0;

        const result = simulateTick(
            createInitialGameState({
                party: [warrior, cleric],
                enemies: [skirmisher],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9),
        );

        expect(result.state.combatLog[0]).toMatch(/Harrying Shot on Brom/i);
        expect(result.state.combatLog[0]).not.toMatch(/parries/i);
    });

    it("has casters target the hero with the weakest elemental resistance", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        warrior.resistances.fire = 0.6;
        cleric.resistances.fire = 0.05;

        const caster = createEnemy(6, "enemy_caster", { archetype: "Caster", element: "fire" });
        caster.actionProgress = 99;
        caster.critChance = 0;

        const result = simulateTick(
            createInitialGameState({
                party: [warrior, cleric],
                enemies: [caster],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9),
        );

        expect(result.state.combatLog[0]).toMatch(/Fire Bolt on Ayla/i);
    });

    it("lets support enemies heal injured allies before attacking", () => {
        const support = createEnemy(11, "enemy_support", { archetype: "Support" });
        support.actionProgress = 99;

        const bruiser = createEnemy(11, "enemy_bruiser", { archetype: "Bruiser" });
        bruiser.currentHp = bruiser.maxHp.div(2);

        const result = simulateTick(
            createInitialGameState({
                party: [createHero("hero_1", "Brom", "Warrior")],
                enemies: [support, bruiser],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        expect(result.state.enemies[1].currentHp.gt(bruiser.maxHp.div(2))).toBe(true);
        expect(result.state.combatLog[0]).toMatch(/Mend Ally/i);
    });

    it("lets support enemies ward allies and consume the ward on the next hit", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.critChance = 0;

        const support = createEnemy(11, "enemy_support", { archetype: "Support" });
        support.actionProgress = 99;

        const bruiser = createEnemy(11, "enemy_bruiser", { archetype: "Bruiser" });
        bruiser.currentHp = bruiser.maxHp;
        bruiser.actionProgress = -999;

        const initialState = createInitialGameState({
            party: [warrior],
            enemies: [support, bruiser],
            combatLog: [],
        });

        const wardResult = simulateTick(initialState, createSequenceRandomSource(0));

        expect(wardResult.state.enemies[1].guardStacks).toBe(1);
        expect(wardResult.state.combatLog[0]).toMatch(/Ward Ally/i);

        const unguardedBruiser = createEnemy(11, "enemy_compare", { archetype: "Bruiser" });
        unguardedBruiser.actionProgress = -999;
        const unguardedResult = simulateTick(
            createInitialGameState({
                party: [{ ...warrior, actionProgress: 99 }],
                enemies: [unguardedBruiser],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        const guardedBruiser = wardResult.state.enemies[1];
        guardedBruiser.actionProgress = -999;
        const guardedState = createInitialGameState({
            party: [{ ...warrior, actionProgress: 99 }],
            enemies: [guardedBruiser],
            combatLog: [],
        });

        const guardedFollowUp = simulateTick(guardedState, createSequenceRandomSource(0, 0, 0.9));

        const guardedDamage = guardedBruiser.currentHp.minus(guardedFollowUp.state.enemies[0].currentHp);
        const unguardedDamage = unguardedBruiser.currentHp.minus(unguardedResult.state.enemies[0].currentHp);

        expect(guardedDamage.lt(unguardedDamage)).toBe(true);
        expect(guardedFollowUp.state.enemies[0].guardStacks).toBe(0);
    });

    it("has bosses switch from melee pressure to ruin bolt below the phase threshold", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        cleric.resistances.air = 0;
        warrior.resistances.air = 0.6;

        const boss = createEnemy(20, "enemy_boss", { archetype: "Boss", boss: true, element: "air" });
        boss.actionProgress = 99;
        boss.critChance = 0;

        const opening = simulateTick(
            createInitialGameState({
                floor: 20,
                party: [warrior, cleric],
                enemies: [boss],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9),
        );

        expect(opening.state.combatLog[0]).toMatch(/Overlord Strike on Brom/i);

        boss.currentHp = boss.maxHp.times(0.5);
        const phaseTwo = simulateTick(
            createInitialGameState({
                floor: 20,
                party: [warrior, cleric],
                enemies: [boss],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9),
        );

        expect(phaseTwo.state.combatLog[0]).toMatch(/Ruin Bolt on Ayla/i);
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

    it("lets armor penetration increase physical damage without bypassing mitigation entirely", () => {
        const rawDamage = new Decimal(40);
        const armor = new Decimal(80);

        const baseline = applyPhysicalMitigation(rawDamage, armor);
        const penetrated = applyPhysicalMitigation(rawDamage, armor, 80);
        const capped = applyPhysicalMitigation(rawDamage, armor, 10_000);

        expect(penetrated.gt(baseline)).toBe(true);
        expect(capped.gt(penetrated)).toBe(true);
        expect(capped.lt(rawDamage)).toBe(true);
    });

    it("lets elemental penetration increase spell damage without nullifying resistance entirely", () => {
        const rawDamage = new Decimal(50);
        const resistance = 0.75;

        const baseline = applyElementalMitigation(rawDamage, resistance);
        const penetrated = applyElementalMitigation(rawDamage, resistance, 80);
        const capped = applyElementalMitigation(rawDamage, resistance, 10_000);

        expect(penetrated.gt(baseline)).toBe(true);
        expect(capped.gt(penetrated)).toBe(true);
        expect(capped.lt(rawDamage)).toBe(true);
    });

    it("caps penetration reduction under extreme stat inflation", () => {
        expect(getPenetrationReduction(10_000)).toBe(0.6);
        expect(getPenetrationReduction(0)).toBe(0);
    });

    it("lets tenacity reduce crit bonus damage without preventing crits", () => {
        const archer = createHero("hero_1", "Vera", "Archer");
        archer.actionProgress = 99;
        archer.critChance = 1;
        archer.critDamage = 2;
        archer.currentResource = new Decimal(35);

        const lowTenacityEnemy = createEnemy(1, "enemy_low_tenacity");
        lowTenacityEnemy.armor = new Decimal(0);
        lowTenacityEnemy.tenacity = 0;

        const highTenacityEnemy = createEnemy(1, "enemy_high_tenacity");
        highTenacityEnemy.armor = new Decimal(0);
        highTenacityEnemy.tenacity = 200;

        const lowTenacityResult = simulateTick(
            createInitialGameState({
                party: [archer],
                enemies: [lowTenacityEnemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0),
        );

        const highTenacityResult = simulateTick(
            createInitialGameState({
                party: [{ ...archer, currentResource: new Decimal(35) }],
                enemies: [highTenacityEnemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0),
        );

        const lowTenacityDamage = lowTenacityEnemy.currentHp.minus(lowTenacityResult.state.enemies[0].currentHp);
        const highTenacityDamage = highTenacityEnemy.currentHp.minus(highTenacityResult.state.enemies[0].currentHp);

        expect(lowTenacityResult.state.combatEvents.some((event) => event.kind === "crit")).toBe(true);
        expect(highTenacityResult.state.combatEvents.some((event) => event.kind === "crit")).toBe(true);
        expect(lowTenacityDamage.gt(highTenacityDamage)).toBe(true);
    });

    it("keeps crit multipliers above normal hits even against high tenacity", () => {
        expect(getEffectiveCritMultiplier(2, 0)).toBeCloseTo(2);
        expect(getEffectiveCritMultiplier(2, 10_000)).toBeCloseTo(1.4);
        expect(getEffectiveCritMultiplier(1.5, 10_000)).toBeGreaterThan(1);
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

    it("lets tenacity reduce elemental status application pressure", () => {
        const caster = createEnemy(10, "enemy_caster", { archetype: "Caster", element: "fire" });
        const lowTenacityHero = createHero("hero_1", "Brom", "Warrior");
        const highTenacityHero = createHero("hero_2", "Ayla", "Cleric");
        highTenacityHero.tenacity = 250;

        const lowTenacityChance = getStatusApplicationChance(caster, lowTenacityHero, 0.45);
        const highTenacityChance = getStatusApplicationChance(caster, highTenacityHero, 0.45);

        expect(lowTenacityChance).toBeGreaterThan(highTenacityChance);
        expect(highTenacityChance).toBeGreaterThanOrEqual(0.15);
    });

    it("applies burn from fire hits and refreshes stacks up to the cap", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.currentHp = new Decimal(10_000);

        const caster = createEnemy(8, "enemy_caster", { archetype: "Caster", element: "fire" });
        caster.actionProgress = 99;
        caster.critChance = 0;

        const initialState = createInitialGameState({
            party: [warrior],
            enemies: [caster],
            combatLog: [],
        });

        const firstResult = simulateTick(initialState, createSequenceRandomSource(0, 0.9, 0));
        expect(firstResult.state.party[0].statusEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "burn",
                    stacks: 1,
                }),
            ]),
        );

        const nextCaster = firstResult.state.enemies[0];
        nextCaster.actionProgress = 99;
        nextCaster.critChance = 0;

        const secondResult = simulateTick(
            createInitialGameState({
                party: firstResult.state.party,
                enemies: [nextCaster],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0.9, 0),
        );

        const burnStatus = secondResult.state.party[0].statusEffects.find((statusEffect) => statusEffect.key === "burn");
        expect(burnStatus?.stacks).toBe(2);
        expect(secondResult.state.combatLog.some((entry) => /burn/i.test(entry))).toBe(true);
        expect(secondResult.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "apply")).toBe(true);
    });

    it("ticks burn once per second, expires it, and awards kill rewards from burn defeats", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.currentHp = new Decimal(6);
        warrior.actionProgress = -999;
        warrior.statusEffects = [
            {
                key: "burn",
                polarity: "debuff",
                sourceId: "enemy_fire",
                remainingTicks: 20,
                stacks: 1,
                maxStacks: 2,
                potency: 6,
            },
        ];

        const enemy = createEnemy(4, "enemy_4");
        enemy.actionProgress = -999;

        const result = advanceTicks(
            createInitialGameState({
                floor: 4,
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            20,
        );

        expect(result.state.party[0].currentHp.eq(0)).toBe(true);
        expect(result.state.party[0].statusEffects).toEqual([]);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "tick")).toBe(true);
        expect(result.state.combatLog.some((entry) => /burn damage/i.test(entry))).toBe(true);
        expect(result.outcome).toBe("party-wipe");

        const enemyWithBurn = createEnemy(4, "enemy_burning");
        enemyWithBurn.currentHp = new Decimal(6);
        enemyWithBurn.actionProgress = -999;
        enemyWithBurn.statusEffects = [
            {
                key: "burn",
                polarity: "debuff",
                sourceId: "hero_fire",
                remainingTicks: 20,
                stacks: 1,
                maxStacks: 2,
                potency: 6,
            },
        ];

        const burnKillResult = advanceTicks(
            createInitialGameState({
                floor: 4,
                party: [createHero("hero_9", "Ione", "Cleric")],
                enemies: [enemyWithBurn],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            20,
        );

        expect(burnKillResult.state.enemies[0].currentHp.eq(0)).toBe(true);
        expect(burnKillResult.state.gold.eq(new Decimal(13))).toBe(true);
        expect(burnKillResult.state.combatLog).toContain("Sewer Rat Lv4 was defeated!");
        expect(burnKillResult.outcome).toBe("victory");
    });

    it("reduces ATB gain while slowed and restores normal gain after expiry", () => {
        const baselineWarrior = createHero("hero_1", "Brom", "Warrior");
        baselineWarrior.actionProgress = 0;
        const slowedWarrior = createHero("hero_2", "Thess", "Warrior");
        slowedWarrior.actionProgress = 0;
        slowedWarrior.statusEffects = [
            {
                key: "slow",
                polarity: "debuff",
                sourceId: "enemy_water",
                remainingTicks: 2,
                stacks: 1,
                maxStacks: 1,
                potency: 0.2,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const baselineAfterOneTick = simulateTick(
            createInitialGameState({
                party: [baselineWarrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        const slowedAfterOneTick = simulateTick(
            createInitialGameState({
                party: [slowedWarrior],
                enemies: [createEnemy(1, "enemy_slow_1")],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        expect(slowedAfterOneTick.state.party[0].actionProgress).toBeLessThan(baselineAfterOneTick.state.party[0].actionProgress);

        const slowedAfterExpiry = simulateTick(slowedAfterOneTick.state, createSequenceRandomSource(0));
        const slowedIncrementAfterExpiry =
            slowedAfterExpiry.state.party[0].actionProgress - slowedAfterOneTick.state.party[0].actionProgress;

        expect(slowedIncrementAfterExpiry).toBeCloseTo(baselineAfterOneTick.state.party[0].actionProgress, 5);
        expect(slowedAfterExpiry.state.party[0].statusEffects).toEqual([]);
    });

    it("reduces outgoing damage while weakened", () => {
        const baselineWarrior = createHero("hero_1", "Brom", "Warrior");
        baselineWarrior.actionProgress = 99;
        baselineWarrior.critChance = 0;

        const weakenedWarrior = createHero("hero_2", "Mira", "Warrior");
        weakenedWarrior.actionProgress = 99;
        weakenedWarrior.critChance = 0;
        weakenedWarrior.statusEffects = [
            {
                key: "weaken",
                polarity: "debuff",
                sourceId: "enemy_earth",
                remainingTicks: 60,
                stacks: 1,
                maxStacks: 1,
                potency: 0.15,
            },
        ];

        const baselineEnemy = createEnemy(1, "enemy_base");
        baselineEnemy.parryRating = 0;
        baselineEnemy.evasionRating = 0;

        const weakenedEnemy = createEnemy(1, "enemy_weakened");
        weakenedEnemy.parryRating = 0;
        weakenedEnemy.evasionRating = 0;

        const baselineResult = simulateTick(
            createInitialGameState({
                party: [baselineWarrior],
                enemies: [baselineEnemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        const weakenedResult = simulateTick(
            createInitialGameState({
                party: [weakenedWarrior],
                enemies: [weakenedEnemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        const baselineDamage = baselineEnemy.currentHp.minus(baselineResult.state.enemies[0].currentHp);
        const weakenedDamage = weakenedEnemy.currentHp.minus(weakenedResult.state.enemies[0].currentHp);

        expect(weakenedDamage.lt(baselineDamage)).toBe(true);
    });

    it("lets warriors reach Rage Strike within a few exchanged actions", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.critChance = 0;
        warrior.parryRating = 0;
        warrior.currentResource = new Decimal(32);

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

        expect(result.state.party[0].level).toBe(3);
        expect(result.state.party[0].attributes.dex).toBe(16);
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

    it("lets clerics cast Bless to apply regen buff to party members without regen", () => {
        const cleric = createHero("hero_1", "Ione", "Cleric");
        cleric.actionProgress = 99;

        const warrior = createHero("hero_2", "Brom", "Warrior");
        warrior.actionProgress = -999;

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = simulateTick(
            createInitialGameState({
                party: [cleric, warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        const regenEffect = result.state.party[1].statusEffects.find((se) => se.key === "regen");
        expect(regenEffect).toBeDefined();
        expect(regenEffect?.polarity).toBe("buff");
        expect(regenEffect?.remainingTicks).toBe(REGEN_DURATION_TICKS);
        expect(result.state.combatLog[0]).toMatch(/bless/i);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "apply" && event.statusKey === "regen")).toBe(true);
    });

    it("deducts mana when cleric casts Bless and skips allies who already have regen", () => {
        const cleric = createHero("hero_1", "Ione", "Cleric");
        cleric.actionProgress = 99;
        const startMana = cleric.currentResource;

        const warrior = createHero("hero_2", "Brom", "Warrior");
        warrior.actionProgress = -999;

        const archer = createHero("hero_3", "Vera", "Archer");
        archer.actionProgress = -999;
        archer.statusEffects = [
            {
                key: "regen",
                polarity: "buff",
                sourceId: "hero_1",
                remainingTicks: REGEN_DURATION_TICKS,
                stacks: 1,
                maxStacks: 1,
                potency: 5,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = simulateTick(
            createInitialGameState({
                party: [cleric, warrior, archer],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        expect(result.state.party[0].currentResource.lt(startMana)).toBe(true);
        expect(result.state.party[1].statusEffects.some((se) => se.key === "regen")).toBe(true);
        // The archer's existing regen should tick down by 1 (processStatusEffects runs each tick)
        expect(result.state.party[2].statusEffects[0]?.remainingTicks).toBe(REGEN_DURATION_TICKS - 1);
    });

    it("ticks regen once per second and restores HP", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = -999;
        warrior.currentHp = new Decimal(50);
        warrior.statusEffects = [
            {
                key: "regen",
                polarity: "buff",
                sourceId: "hero_cleric",
                remainingTicks: 40,
                stacks: 1,
                maxStacks: 1,
                potency: 10,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = advanceTicks(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            20,
        );

        expect(result.state.party[0].currentHp.gt(new Decimal(50))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "tick" && event.statusKey === "regen")).toBe(true);
        expect(result.state.combatLog.some((entry) => /regenerates/i.test(entry))).toBe(true);
    });

    it("expires regen after its duration and removes the status", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = -999;
        warrior.statusEffects = [
            {
                key: "regen",
                polarity: "buff",
                sourceId: "hero_cleric",
                remainingTicks: 2,
                stacks: 1,
                maxStacks: 1,
                potency: 5,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = advanceTicks(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            2,
        );

        expect(result.state.party[0].statusEffects.filter((se) => se.key === "regen")).toHaveLength(0);
        expect(result.state.combatLog.some((entry) => /regen fades/i.test(entry))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "expire" && event.statusKey === "regen")).toBe(true);
    });

    it("applies hex from shadow hits and logs the affliction", () => {
        const hero = createHero("hero_1", "Brom", "Warrior");
        hero.actionProgress = -999;
        hero.tenacity = 0;

        const shadowCaster = createEnemy(5, "enemy_shadow", { archetype: "Caster", element: "shadow" });
        shadowCaster.actionProgress = 99;
        shadowCaster.critChance = 0;

        // Rolls: 0=hit, 0=no-crit, 0=hex apply succeeds
        const result = simulateTick(
            createInitialGameState({
                party: [hero],
                enemies: [shadowCaster],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0),
        );

        expect(result.state.party[0].statusEffects.some((se) => se.key === "hex" && se.polarity === "debuff")).toBe(true);
        expect(result.state.combatLog.some((entry) => /hex/i.test(entry))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "apply" && event.statusKey === "hex")).toBe(true);
    });

    it("expires hex after its duration and removes the status", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = -999;
        warrior.statusEffects = [
            {
                key: "hex",
                polarity: "debuff",
                sourceId: "enemy_shadow",
                remainingTicks: 2,
                stacks: 1,
                maxStacks: 1,
                potency: 0.3,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = advanceTicks(
            createInitialGameState({
                party: [warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            2,
        );

        expect(result.state.party[0].statusEffects.filter((se) => se.key === "hex")).toHaveLength(0);
        expect(result.state.combatLog.some((entry) => /hex fades/i.test(entry))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "expire" && event.statusKey === "hex")).toBe(true);
    });

    it("reduces incoming healing from cleric mend when target carries hex", () => {
        const buildParty = (withHex: boolean) => {
            const cleric = createHero("hero_1", "Ione", "Cleric");
            cleric.actionProgress = 99;

            const warrior = createHero("hero_2", "Brom", "Warrior");
            warrior.actionProgress = -999;
            warrior.currentHp = new Decimal(10);
            if (withHex) {
                warrior.statusEffects = [
                    {
                        key: "hex",
                        polarity: "debuff",
                        sourceId: "enemy_shadow",
                        remainingTicks: 60,
                        stacks: 1,
                        maxStacks: 1,
                        potency: 0.3,
                    },
                ];
            }

            return [cleric, warrior];
        };

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const withoutHex = simulateTick(
            createInitialGameState({
                party: buildParty(false),
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        const withHex = simulateTick(
            createInitialGameState({
                party: buildParty(true),
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        const healedHpWithout = withoutHex.state.party[1].currentHp.minus(10);
        const healedHpWith = withHex.state.party[1].currentHp.minus(10);

        expect(healedHpWith.lt(healedHpWithout)).toBe(true);
        expect(withHex.state.combatLog[0]).toMatch(/mend/i);
    });

    it("refreshes hex duration on reapplication and keeps the effect active", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        warrior.actionProgress = -999;
        warrior.tenacity = 0;
        warrior.statusEffects = [
            {
                key: "hex",
                polarity: "debuff",
                sourceId: "enemy_shadow_old",
                remainingTicks: 5,
                stacks: 1,
                maxStacks: 1,
                potency: 0.3,
            },
        ];

        const shadowCaster = createEnemy(5, "enemy_shadow", { archetype: "Caster", element: "shadow" });
        shadowCaster.actionProgress = 99;
        shadowCaster.critChance = 0;

        // Rolls: 0=hit, 0=no-crit, 0=hex apply succeeds (refreshes existing hex)
        const result = simulateTick(
            createInitialGameState({
                party: [warrior],
                enemies: [shadowCaster],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0),
        );

        const hexEffect = result.state.party[0].statusEffects.find((se) => se.key === "hex");
        expect(hexEffect).toBeDefined();
        expect(hexEffect!.remainingTicks).toBeGreaterThan(5);
        expect(hexEffect!.remainingTicks).toBe(HEX_DURATION_TICKS);
    });

    it("applies blind from light hits and logs the affliction", () => {
        const cleric = createHero("hero_1", "Ione", "Cleric");
        cleric.actionProgress = 99;
        cleric.critChance = 0;

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;
        enemy.tenacity = 0;

        const result = simulateTick(
            createInitialGameState({
                party: [cleric],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0),
        );

        expect(result.state.enemies[0].statusEffects.some((se) => se.key === "blind" && se.polarity === "debuff")).toBe(true);
        expect(result.state.combatLog.some((entry) => /blind/i.test(entry))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "apply" && event.statusKey === "blind")).toBe(true);
    });

    it("reduces hit chance while blinded and expires cleanly", () => {
        const baselineWarrior = createHero("hero_1", "Brom", "Warrior");
        const blindedWarrior = createHero("hero_2", "Tarin", "Warrior");
        blindedWarrior.actionProgress = -999;
        blindedWarrior.statusEffects = [
            {
                key: "blind",
                polarity: "debuff",
                sourceId: "hero_light",
                remainingTicks: 2,
                stacks: 1,
                maxStacks: 1,
                potency: 15,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        expect(getPhysicalHitChance(blindedWarrior, enemy)).toBeLessThan(getPhysicalHitChance(baselineWarrior, enemy));

        const result = advanceTicks(
            createInitialGameState({
                party: [blindedWarrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
            2,
        );

        expect(result.state.party[0].statusEffects.filter((se) => se.key === "blind")).toHaveLength(0);
        expect(result.state.combatLog.some((entry) => /blind fades/i.test(entry))).toBe(true);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "expire" && event.statusKey === "blind")).toBe(true);
        expect(getPhysicalHitChance(result.state.party[0], enemy)).toBe(getPhysicalHitChance(baselineWarrior, enemy));
    });

    it("Bless cleanses hex while refreshing regen and logs the cleanse", () => {
        const cleric = createHero("hero_1", "Ione", "Cleric");
        cleric.actionProgress = 99;

        const warrior = createHero("hero_2", "Brom", "Warrior");
        warrior.actionProgress = -999;
        warrior.statusEffects = [
            {
                key: "hex",
                polarity: "debuff",
                sourceId: "enemy_shadow",
                remainingTicks: 30,
                stacks: 1,
                maxStacks: 1,
                potency: 0.3,
            },
            {
                key: "regen",
                polarity: "buff",
                sourceId: "hero_old_cleric",
                remainingTicks: 2,
                stacks: 1,
                maxStacks: 1,
                potency: 4,
            },
        ];

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = simulateTick(
            createInitialGameState({
                party: [cleric, warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0),
        );

        const refreshedWarrior = result.state.party[1];
        expect(refreshedWarrior.statusEffects.some((se) => se.key === "hex")).toBe(false);
        expect(refreshedWarrior.statusEffects.find((se) => se.key === "regen")?.remainingTicks).toBe(REGEN_DURATION_TICKS);
        expect(result.state.combatEvents.some((event) => event.kind === "status" && event.statusPhase === "cleanse" && event.statusKey === "hex")).toBe(true);
        expect(result.state.combatLog.some((entry) => /casts Bless on Brom/i.test(entry))).toBe(true);
        expect(result.state.combatLog.some((entry) => /Hex is cleansed/i.test(entry))).toBe(true);
    });

    it("spends mana up to CLERIC_BLESS_COST when casting Bless and falls back to Smite if mana is low", () => {
        const cleric = createHero("hero_1", "Ione", "Cleric");
        cleric.actionProgress = 99;
        // Set mana low enough that even after per-tick wis regen it can't reach CLERIC_BLESS_COST
        cleric.currentResource = new Decimal(0);

        const warrior = createHero("hero_2", "Brom", "Warrior");
        warrior.actionProgress = -999;

        const enemy = createEnemy(1, "enemy_1");
        enemy.actionProgress = -999;

        const result = simulateTick(
            createInitialGameState({
                party: [cleric, warrior],
                enemies: [enemy],
                combatLog: [],
            }),
            createSequenceRandomSource(0, 0, 0.9),
        );

        expect(result.state.party[1].statusEffects.some((se) => se.key === "regen")).toBe(false);
        expect(result.state.combatLog[0]).toMatch(/smite/i);
    });
});
