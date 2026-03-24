import { describe, expect, it } from "vitest";

import {
    applyEnemyArchetypeBias,
    getEnemyArchetypeLabel,
    getEnemyArchetypePoolForFloor,
    getEnemyCombatRatingBiases,
    getEnemyElementForEncounter,
    getEncounterArchetypes,
    inferEnemyArchetype,
    isBossArchetype,
} from "./entity.enemies";
import type { EnemyArchetype } from "./entity.types";

const baseAttributes = { vit: 10, str: 10, dex: 10, int: 10, wis: 10 };

describe("applyEnemyArchetypeBias", () => {
    it("boosts vitality and strength for Bruiser, reduces dex and int", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Bruiser");
        expect(result.vit).toBe(10 * 1.45);
        expect(result.str).toBe(10 * 1.25);
        expect(result.dex).toBe(10 * 0.75);
        expect(result.int).toBe(10 * 0.7);
        expect(result.wis).toBe(10 * 0.85);
    });

    it("boosts dexterity for Skirmisher", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Skirmisher");
        expect(result.dex).toBe(10 * 1.45);
        expect(result.vit).toBe(10 * 0.85);
        expect(result.str).toBe(10 * 0.9);
        expect(result.int).toBe(10 * 0.8);
        expect(result.wis).toBe(10 * 1.05);
    });

    it("boosts int and wis for Caster", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Caster");
        expect(result.int).toBe(10 * 1.45);
        expect(result.wis).toBe(10 * 1.25);
        expect(result.str).toBe(10 * 0.65);
    });

    it("boosts wis and int for Support", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Support");
        expect(result.wis).toBe(10 * 1.45);
        expect(result.int).toBe(10 * 1.25);
        expect(result.str).toBe(10 * 0.65);
        expect(result.vit).toBe(10);
    });

    it("boosts all stats evenly for Boss", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Boss");
        expect(result.vit).toBe(10 * 1.25);
        expect(result.str).toBe(10 * 1.15);
        expect(result.dex).toBe(10 * 1.2);
        expect(result.int).toBe(10 * 1.2);
        expect(result.wis).toBe(10 * 1.2);
    });

    it("returns attributes unchanged for an unknown archetype via the default branch", () => {
        const result = applyEnemyArchetypeBias(baseAttributes, "Unknown" as EnemyArchetype);
        expect(result).toEqual(baseAttributes);
    });
});

describe("isBossArchetype", () => {
    it("returns true for Boss", () => {
        expect(isBossArchetype("Boss")).toBe(true);
    });

    it("returns false for non-boss archetypes", () => {
        expect(isBossArchetype("Bruiser")).toBe(false);
        expect(isBossArchetype("Skirmisher")).toBe(false);
        expect(isBossArchetype("Caster")).toBe(false);
        expect(isBossArchetype("Support")).toBe(false);
    });

    it("returns false for null or undefined", () => {
        expect(isBossArchetype(null)).toBe(false);
        expect(isBossArchetype(undefined)).toBe(false);
    });
});

describe("getEnemyArchetypePoolForFloor", () => {
    it("returns only Boss on boss floors (multiples of 10)", () => {
        expect(getEnemyArchetypePoolForFloor(10)).toEqual(["Boss"]);
        expect(getEnemyArchetypePoolForFloor(20)).toEqual(["Boss"]);
    });

    it("returns Bruiser and Skirmisher only on floors 1-4", () => {
        const pool = getEnemyArchetypePoolForFloor(1);
        expect(pool).toEqual(["Bruiser", "Skirmisher"]);
        expect(getEnemyArchetypePoolForFloor(4)).toEqual(["Bruiser", "Skirmisher"]);
    });

    it("adds Caster to the pool on floors 5-10", () => {
        const pool = getEnemyArchetypePoolForFloor(5);
        expect(pool).toContain("Bruiser");
        expect(pool).toContain("Skirmisher");
        expect(pool).toContain("Caster");
        expect(pool).not.toContain("Support");
    });

    it("includes Support in the pool from floor 11 onwards", () => {
        const pool = getEnemyArchetypePoolForFloor(11);
        expect(pool).toContain("Support");
        expect(pool).toEqual(["Bruiser", "Skirmisher", "Caster", "Support"]);
    });
});

describe("getEncounterArchetypes", () => {
    it("always returns [Boss] on boss floors regardless of encounter size", () => {
        expect(getEncounterArchetypes(10, 1)).toEqual(["Boss"]);
        expect(getEncounterArchetypes(20, 3)).toEqual(["Boss"]);
    });

    it("returns offensive archetypes for early floors (< 5)", () => {
        const archetypes = getEncounterArchetypes(3, 2);
        for (const archetype of archetypes) {
            expect(["Bruiser", "Skirmisher"]).toContain(archetype);
        }
    });

    it("includes Caster archetype from floor 5 onwards", () => {
        const archetypes = getEncounterArchetypes(5, 3);
        expect(archetypes.some((a) => a === "Caster")).toBe(true);
    });

    it("promotes the last slot to Support on odd floors >= 11 with 2+ enemies", () => {
        const archetypes = getEncounterArchetypes(11, 2);
        expect(archetypes[archetypes.length - 1]).toBe("Support");
    });

    it("does not add Support on even floors >= 11", () => {
        const archetypes = getEncounterArchetypes(12, 2);
        expect(archetypes[archetypes.length - 1]).not.toBe("Support");
    });
});

describe("getEnemyElementForEncounter", () => {
    it("returns a valid enemy element based on floor and index", () => {
        const validElements = ["fire", "water", "earth", "air", "light", "shadow"];
        expect(validElements).toContain(getEnemyElementForEncounter(1));
        expect(validElements).toContain(getEnemyElementForEncounter(1, 0));
        expect(validElements).toContain(getEnemyElementForEncounter(1, 2));
    });

    it("cycles through elements deterministically by floor", () => {
        const elem0 = getEnemyElementForEncounter(0);
        const elem1 = getEnemyElementForEncounter(1);
        expect(elem0).not.toBe(elem1);
    });
});

describe("getEnemyArchetypeLabel", () => {
    it("returns null for hero entities", () => {
        const hero = { isEnemy: false, enemyArchetype: undefined, enemyElement: null };
        expect(getEnemyArchetypeLabel(hero)).toBeNull();
    });

    it("returns null when enemyArchetype is null", () => {
        const enemy = { isEnemy: true, enemyArchetype: null, enemyElement: null };
        expect(getEnemyArchetypeLabel(enemy)).toBeNull();
    });

    it("prefixes the element for Caster archetypes", () => {
        const caster = { isEnemy: true, enemyArchetype: "Caster" as EnemyArchetype, enemyElement: "fire" as const };
        expect(getEnemyArchetypeLabel(caster)).toBe("Fire Caster");
    });

    it("prefixes the element for Boss archetypes", () => {
        const boss = { isEnemy: true, enemyArchetype: "Boss" as EnemyArchetype, enemyElement: "shadow" as const };
        expect(getEnemyArchetypeLabel(boss)).toBe("Shadow Boss");
    });

    it("returns just the archetype name for non-elemental archetypes", () => {
        const bruiser = { isEnemy: true, enemyArchetype: "Bruiser" as EnemyArchetype, enemyElement: null };
        expect(getEnemyArchetypeLabel(bruiser)).toBe("Bruiser");

        const support = { isEnemy: true, enemyArchetype: "Support" as EnemyArchetype, enemyElement: null };
        expect(getEnemyArchetypeLabel(support)).toBe("Support");
    });
});

describe("inferEnemyArchetype", () => {
    it("returns undefined for hero entities", () => {
        expect(inferEnemyArchetype({ isEnemy: false, enemyArchetype: undefined, name: "Ayla" })).toBeUndefined();
    });

    it("returns the stored archetype when present", () => {
        expect(inferEnemyArchetype({ isEnemy: true, enemyArchetype: "Skirmisher", name: "Goblin" })).toBe("Skirmisher");
    });

    it("infers Boss from a name starting with 'Boss:'", () => {
        expect(inferEnemyArchetype({ isEnemy: true, enemyArchetype: undefined, name: "Boss: Rat King" })).toBe("Boss");
    });

    it("falls back to Bruiser when archetype is absent and name has no boss prefix", () => {
        expect(inferEnemyArchetype({ isEnemy: true, enemyArchetype: undefined, name: "Goblin" })).toBe("Bruiser");
    });
});

describe("getEnemyCombatRatingBiases", () => {
    const makeEnemy = (archetype: EnemyArchetype) => ({ isEnemy: true, enemyArchetype: archetype, name: "Enemy" });

    it("returns power and guard bonuses for Bruiser", () => {
        const biases = getEnemyCombatRatingBiases(makeEnemy("Bruiser"));
        expect(biases.power).toBeGreaterThan(0);
        expect(biases.guard).toBeGreaterThan(0);
    });

    it("returns precision, haste, and crit bonuses for Skirmisher", () => {
        const biases = getEnemyCombatRatingBiases(makeEnemy("Skirmisher"));
        expect(biases.precision).toBeGreaterThan(0);
        expect(biases.haste).toBeGreaterThan(0);
        expect(biases.crit).toBeGreaterThan(0);
    });

    it("returns spellPower, resolve, and potency bonuses for Caster", () => {
        const biases = getEnemyCombatRatingBiases(makeEnemy("Caster"));
        expect(biases.spellPower).toBeGreaterThan(0);
        expect(biases.potency).toBeGreaterThan(0);
    });

    it("returns spellPower and resolve bonuses for Support", () => {
        const biases = getEnemyCombatRatingBiases(makeEnemy("Support"));
        expect(biases.spellPower).toBeGreaterThan(0);
        expect(biases.resolve).toBeGreaterThan(0);
    });

    it("returns bonuses across all ratings for Boss", () => {
        const biases = getEnemyCombatRatingBiases(makeEnemy("Boss"));
        expect(biases.power).toBeGreaterThan(0);
        expect(biases.spellPower).toBeGreaterThan(0);
        expect(biases.haste).toBeGreaterThan(0);
    });

    it("returns an empty object for non-enemy entities via the default branch", () => {
        const biases = getEnemyCombatRatingBiases({ isEnemy: false, enemyArchetype: undefined, name: "Ayla" });
        expect(biases).toEqual({});
    });
});
