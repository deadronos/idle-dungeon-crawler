import { describe, expect, it } from "vitest";

import {
    BASE_META_UPGRADES,
    BOSS_STRENGTH_MULTIPLIER,
    BOSS_VITALITY_MULTIPLIER,
    createEnemy,
    createHero,
    createRecruitHero,
    createStarterParty,
    getEnemyArchetypeLabel,
} from "./entity";

describe("entity model", () => {
    it("creates a single-hero starter party around the selected leader", () => {
        const party = createStarterParty("Ayla", "Cleric");

        expect(party).toHaveLength(1);
        expect(party[0].id).toBe("hero_1");
        expect(party[0].name).toBe("Ayla");
        expect(party[0].class).toBe("Cleric");
    });

    it("creates recruits with unique ids and duplicate-safe generated names", () => {
        const starterParty = createStarterParty("Ayla", "Warrior");
        const firstRecruit = createRecruitHero("Warrior", starterParty);
        const secondRecruit = createRecruitHero("Warrior", [...starterParty, firstRecruit]);

        expect(firstRecruit.id).toBe("hero_2");
        expect(secondRecruit.id).toBe("hero_3");
        expect(firstRecruit.class).toBe("Warrior");
        expect(secondRecruit.class).toBe("Warrior");
        expect(firstRecruit.name).not.toBe(secondRecruit.name);
    });

    it("applies meta upgrades to hero damage and armor", () => {
        const baseline = createHero("hero_base", "Brom", "Warrior", BASE_META_UPGRADES);
        const upgraded = createHero("hero_upgraded", "Brom", "Warrior", { training: 2, fortification: 1 });

        expect(upgraded.physicalDamage.gt(baseline.physicalDamage)).toBe(true);
        expect(upgraded.magicDamage.gt(baseline.magicDamage)).toBe(true);
        expect(upgraded.armor.gt(baseline.armor)).toBe(true);
    });

    it("derives combat ratings, penetration, and tenacity from existing attributes", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");

        expect(warrior.accuracyRating).toBeCloseTo(60.5);
        expect(warrior.evasionRating).toBeCloseTo(43);
        expect(warrior.parryRating).toBeCloseTo(18.75);
        expect(warrior.armorPenetration).toBeCloseTo(12.5);
        expect(warrior.elementalPenetration).toBeCloseTo(4.5);
        expect(warrior.tenacity).toBeCloseTo(10.5);
    });

    it("creates tougher boss enemies on every tenth floor with the softened boss multipliers", () => {
        const bossEnemy = createEnemy(10, "enemy_10");
        const expectedBaseVit = 5 + (10 * 2);
        const expectedBaseStr = 5 + (10 * 1.5);

        expect(bossEnemy.name.startsWith("Boss:")).toBe(true);
        expect(bossEnemy.attributes.vit).toBe(expectedBaseVit * 1.25 * BOSS_VITALITY_MULTIPLIER);
        expect(bossEnemy.attributes.str).toBe(expectedBaseStr * 1.15 * BOSS_STRENGTH_MULTIPLIER);
    });

    it("applies archetype stat biases and labels to generated enemies", () => {
        const bruiser = createEnemy(8, "enemy_bruiser", { archetype: "Bruiser" });
        const skirmisher = createEnemy(8, "enemy_skirmisher", { archetype: "Skirmisher" });
        const caster = createEnemy(8, "enemy_caster", { archetype: "Caster", element: "fire" });

        expect(bruiser.enemyArchetype).toBe("Bruiser");
        expect(skirmisher.enemyArchetype).toBe("Skirmisher");
        expect(caster.enemyArchetype).toBe("Caster");
        expect(caster.enemyElement).toBe("fire");
        expect(bruiser.maxHp.gt(skirmisher.maxHp)).toBe(true);
        expect(skirmisher.evasionRating).toBeGreaterThan(bruiser.evasionRating);
        expect(caster.magicDamage.gt(bruiser.magicDamage)).toBe(true);
        expect(getEnemyArchetypeLabel(caster)).toBe("Fire Caster");
    });
});
