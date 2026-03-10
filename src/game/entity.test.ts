import { describe, expect, it } from "vitest";

import { BASE_META_UPGRADES, createEnemy, createHero, createStarterParty } from "./entity";

describe("entity model", () => {
    it("creates a three-hero starter party around the selected leader", () => {
        const party = createStarterParty("Ayla", "Cleric");

        expect(party).toHaveLength(3);
        expect(party[0].name).toBe("Ayla");
        expect(party[0].class).toBe("Cleric");
        expect(new Set(party.map((hero) => hero.class))).toEqual(new Set(["Warrior", "Cleric", "Archer"]));
    });

    it("applies meta upgrades to hero damage and armor", () => {
        const baseline = createHero("hero_base", "Brom", "Warrior", BASE_META_UPGRADES);
        const upgraded = createHero("hero_upgraded", "Brom", "Warrior", { training: 2, fortification: 1 });

        expect(upgraded.physicalDamage.gt(baseline.physicalDamage)).toBe(true);
        expect(upgraded.magicDamage.gt(baseline.magicDamage)).toBe(true);
        expect(upgraded.armor.gt(baseline.armor)).toBe(true);
    });

    it("creates tougher boss enemies on every tenth floor", () => {
        const floorNineEnemy = createEnemy(9, "enemy_9");
        const bossEnemy = createEnemy(10, "enemy_10");

        expect(bossEnemy.name.startsWith("Boss:")).toBe(true);
        expect(bossEnemy.maxHp.gt(floorNineEnemy.maxHp)).toBe(true);
        expect(bossEnemy.physicalDamage.gt(floorNineEnemy.physicalDamage)).toBe(true);
    });
});
