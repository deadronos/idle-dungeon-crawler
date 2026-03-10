import { describe, expect, it } from "vitest";

import { BASE_META_UPGRADES, createEnemy, createHero, createRecruitHero, createStarterParty } from "./entity";

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

    it("creates tougher boss enemies on every tenth floor", () => {
        const floorNineEnemy = createEnemy(9, "enemy_9");
        const bossEnemy = createEnemy(10, "enemy_10");

        expect(bossEnemy.name.startsWith("Boss:")).toBe(true);
        expect(bossEnemy.maxHp.gt(floorNineEnemy.maxHp)).toBe(true);
        expect(bossEnemy.physicalDamage.gt(floorNineEnemy.physicalDamage)).toBe(true);
    });
});
