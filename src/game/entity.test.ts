import { describe, expect, it } from "vitest";

import {
    BASE_META_UPGRADES,
    BOSS_STRENGTH_MULTIPLIER,
    BOSS_VITALITY_MULTIPLIER,
    createEnemy,
    getCombatRatings,
    createHero,
    createRecruitHero,
    createStarterParty,
    getEnemyArchetypeLabel,
    recalculateEntity,
} from "./entity";
import { createLegacyEquipmentProgression } from "./equipmentProgression";

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

    it("derives layered combat ratings and final combat stats from attributes plus class packages", () => {
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const warriorRatings = getCombatRatings(warrior);

        expect(warriorRatings.power).toBeCloseTo(24);
        expect(warriorRatings.precision).toBeCloseTo(4.5);
        expect(warriorRatings.haste).toBeCloseTo(5.05);
        expect(warriorRatings.guard).toBeCloseTo(25);
        expect(warriorRatings.resolve).toBeCloseTo(6.6);
        expect(warriorRatings.potency).toBeCloseTo(3.15);
        expect(warriorRatings.crit).toBeCloseTo(2.5);
        expect(warrior.armor.toNumber()).toBeCloseTo(17);
        expect(warrior.physicalDamage.toNumber()).toBeCloseTo(29.58, 2);
        expect(warrior.magicDamage.toNumber()).toBeCloseTo(9.52, 2);
        expect(warrior.accuracyRating).toBeCloseTo(55.65);
        expect(warrior.evasionRating).toBeCloseTo(40.69);
        expect(warrior.parryRating).toBeCloseTo(20.9);
        expect(warrior.armorPenetration).toBeCloseTo(15);
        expect(warrior.elementalPenetration).toBeCloseTo(2.81);
        expect(warrior.tenacity).toBeCloseTo(9.29);
        expect(warrior.resistances.light).toBeCloseTo(0.0728);
        expect(warrior.statusEffects).toEqual([]);
    });

    it("preserves warrior, cleric, and archer combat identity even with matched attributes", () => {
        const sharedAttributes = { vit: 8, str: 6, dex: 9, int: 6, wis: 6 };
        const warrior = createHero("hero_1", "Brom", "Warrior");
        const cleric = createHero("hero_2", "Ayla", "Cleric");
        const archer = createHero("hero_3", "Vera", "Archer");

        warrior.attributes = { ...sharedAttributes };
        cleric.attributes = { ...sharedAttributes };
        archer.attributes = { ...sharedAttributes };

        recalculateEntity(warrior);
        recalculateEntity(cleric);
        recalculateEntity(archer);

        expect(warrior.armor.gt(archer.armor)).toBe(true);
        expect(archer.accuracyRating).toBeGreaterThan(warrior.accuracyRating);
        expect(archer.critChance).toBeGreaterThan(warrior.critChance);
        expect(archer.physicalDamage.gt(warrior.physicalDamage)).toBe(true);
        expect(cleric.magicDamage.gt(archer.magicDamage)).toBe(true);
        expect(cleric.tenacity).toBeGreaterThan(warrior.tenacity);
        expect(cleric.resistances.shadow).toBeGreaterThan(archer.resistances.shadow);
    });

    it("applies passive, talent, and equipment bonuses through the shared build layer", () => {
        const baselineCleric = createHero("hero_1", "Ayla", "Cleric");
        const boostedCleric = createHero("hero_1", "Ayla", "Cleric");
        const buildState = {
            talentProgression: {
                talentRanksByHeroId: {
                    hero_1: {
                        "cleric-sunfire": 3,
                        "cleric-shepherd": 2,
                    },
                },
                talentPointsByHeroId: {
                    hero_1: 0,
                },
            },
            equipmentProgression: createLegacyEquipmentProgression(
                ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
                {
                    hero_1: ["sunlit-censer", "pilgrim-vestments", "ember-charm", "iron-prayer-bead"],
                },
            ),
        };

        const baselineRatings = getCombatRatings(baselineCleric);
        recalculateEntity(boostedCleric, BASE_META_UPGRADES, undefined, buildState);
        const boostedRatings = getCombatRatings(boostedCleric, buildState);

        expect(boostedRatings.spellPower).toBeGreaterThan(baselineRatings.spellPower);
        expect(boostedRatings.resolve).toBeGreaterThan(baselineRatings.resolve);
        expect(boostedRatings.potency).toBeGreaterThan(baselineRatings.potency);
        expect(boostedCleric.magicDamage.gt(baselineCleric.magicDamage)).toBe(true);
        expect(boostedCleric.maxResource.gt(baselineCleric.maxResource)).toBe(true);
        expect(boostedRatings.spellPower - baselineRatings.spellPower).toBeGreaterThanOrEqual(10);
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
