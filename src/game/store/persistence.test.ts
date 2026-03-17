import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createStarterParty } from "@/game/entity";
import { createLegacyEquipmentProgression } from "@/game/equipmentProgression";
import { createInitialGameState } from "@/game/engine/simulation";
import { getExpRequirement } from "@/game/entity";

import {
    deserializeGameState,
    GAME_STATE_EXPORT_VERSION,
    LEGACY_UNVERSIONED_SAVE_VERSION,
    SAVE_MIGRATIONS,
    serializeGameState,
} from "./persistence";

describe("game-state persistence", () => {
    it("roundtrips the playable game state through JSON export and import", () => {
        const party = createStarterParty("Selene", "Cleric");
        party[0].statusEffects = [
            {
                key: "burn",
                polarity: "debuff",
                sourceId: "enemy_3",
                remainingTicks: 60,
                stacks: 2,
                maxStacks: 2,
                potency: 4.2,
            },
        ];

        const exportedState = createInitialGameState({
            party,
            enemies: [createEnemy(3, "enemy_3")],
            gold: new Decimal(345),
            floor: 3,
            autoFight: false,
            autoAdvance: true,
            combatLog: ["Recovered save"],
            partyCapacity: 2,
            highestFloorCleared: 7,
            activeSection: "shop",
            talentProgression: {
                talentRanksByHeroId: {
                    hero_1: {
                        "cleric-sunfire": 2,
                        "cleric-shepherd": 1,
                    },
                },
                talentPointsByHeroId: {
                    hero_1: 2,
                },
            },
            equipmentProgression: createLegacyEquipmentProgression(
                ["sunlit-censer", "iron-prayer-bead"],
                {
                    hero_1: ["sunlit-censer"],
                },
            ),
        });

        const serializedState = serializeGameState(exportedState);
        const payload = JSON.parse(serializedState) as { version: number };
        const restoredState = deserializeGameState(serializedState);

        expect(payload.version).toBe(GAME_STATE_EXPORT_VERSION);
        expect(restoredState.gold.toString()).toBe("345");
        expect(restoredState.party[0]?.name).toBe("Selene");
        expect(restoredState.party[0]?.currentHp.eq(exportedState.party[0]?.currentHp ?? 0)).toBe(true);
        expect(restoredState.party[0]?.statusEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "burn",
                    stacks: 2,
                }),
            ]),
        );
        expect(restoredState.enemies[0]?.name).toBe(exportedState.enemies[0]?.name);
        expect(restoredState.autoFight).toBe(false);
        expect(restoredState.activeSection).toBe("shop");
        expect(restoredState.talentProgression).toEqual(exportedState.talentProgression);
        expect(restoredState.equipmentProgression).toEqual(exportedState.equipmentProgression);
    });

    it("does not persist transient combat events in exported saves", () => {
        const exportedState = createInitialGameState({
            party: createStarterParty("Selene", "Cleric"),
            enemies: [createEnemy(3, "enemy_3")],
            combatEvents: [
                {
                    id: "combat-event-1",
                    targetId: "enemy_3",
                    kind: "damage",
                    text: "-12",
                    ttlTicks: 8,
                },
            ],
        });

        const restoredState = deserializeGameState(serializeGameState(exportedState));

        expect(restoredState.combatEvents).toEqual([]);
    });

    it("migrates older versioned saves and defaults missing combat and progression fields", () => {
        const exportedState = createInitialGameState({
            party: createStarterParty("Selene", "Cleric"),
            enemies: [createEnemy(3, "enemy_3")],
        });

        const payload = JSON.parse(serializeGameState(exportedState)) as {
            version: number;
            state: {
                party: Array<Record<string, unknown>>;
                enemies: Array<Record<string, unknown>>;
            };
        };
        payload.version = 1;

        delete payload.state.party[0]?.accuracyRating;
        delete payload.state.party[0]?.evasionRating;
        delete payload.state.party[0]?.parryRating;
        delete payload.state.party[0]?.armorPenetration;
        delete payload.state.party[0]?.elementalPenetration;
        delete payload.state.party[0]?.tenacity;
        delete payload.state.party[0]?.guardStacks;
        delete payload.state.party[0]?.statusEffects;
        delete payload.state.enemies[0]?.accuracyRating;
        delete payload.state.enemies[0]?.evasionRating;
        delete payload.state.enemies[0]?.parryRating;
        delete payload.state.enemies[0]?.armorPenetration;
        delete payload.state.enemies[0]?.elementalPenetration;
        delete payload.state.enemies[0]?.tenacity;
        delete payload.state.enemies[0]?.enemyArchetype;
        delete payload.state.enemies[0]?.enemyElement;
        delete payload.state.enemies[0]?.guardStacks;
        delete payload.state.enemies[0]?.statusEffects;
        delete (payload.state as Record<string, unknown>).talentProgression;
        delete (payload.state as Record<string, unknown>).equipmentProgression;

        const restoredState = deserializeGameState(JSON.stringify(payload));

        expect(restoredState.party[0]?.accuracyRating).toBeGreaterThan(0);
        expect(restoredState.party[0]?.evasionRating).toBeGreaterThan(0);
        expect(restoredState.party[0]?.parryRating).toBeGreaterThan(0);
        expect(restoredState.party[0]?.armorPenetration).toBeGreaterThan(0);
        expect(restoredState.party[0]?.elementalPenetration).toBeGreaterThan(0);
        expect(restoredState.party[0]?.tenacity).toBeGreaterThan(0);
        expect(restoredState.party[0]?.guardStacks).toBe(0);
        expect(restoredState.party[0]?.statusEffects).toEqual([]);
        expect(restoredState.enemies[0]?.accuracyRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.evasionRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.parryRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.armorPenetration).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.elementalPenetration).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.tenacity).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.enemyArchetype).toBe("Bruiser");
        expect(restoredState.enemies[0]?.guardStacks).toBe(0);
        expect(restoredState.enemies[0]?.statusEffects).toEqual([]);
        expect(restoredState.talentProgression).toEqual({
            talentRanksByHeroId: {
                hero_1: {},
            },
            talentPointsByHeroId: {
                hero_1: 0,
            },
        });
        expect(restoredState.equipmentProgression).toEqual({
            inventoryItems: [],
            equippedItemInstanceIdsByHeroId: {
                hero_1: [],
            },
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 12,
            nextInstanceSequence: 1,
        });
    });

    it("restores supported mid-combat encounter state while dropping transient combat events", () => {
        const party = createStarterParty("Selene", "Cleric");
        const enemy = createEnemy(3, "enemy_3");
        party[0].actionProgress = 64;
        party[0].activeSkill = "Casting Bless";
        party[0].activeSkillTicks = 8;
        party[0].guardStacks = 1;
        enemy.actionProgress = 37;
        enemy.guardStacks = 1;

        const exportedState = createInitialGameState({
            party,
            enemies: [enemy],
            combatEvents: [
                {
                    id: "combat-event-1",
                    targetId: "enemy_3",
                    kind: "damage",
                    text: "-12",
                    ttlTicks: 8,
                },
            ],
        });

        const restoredState = deserializeGameState(serializeGameState(exportedState));

        expect(restoredState.party[0]?.actionProgress).toBe(64);
        expect(restoredState.party[0]?.activeSkill).toBe("Casting Bless");
        expect(restoredState.party[0]?.activeSkillTicks).toBe(8);
        expect(restoredState.party[0]?.guardStacks).toBe(1);
        expect(restoredState.enemies[0]?.actionProgress).toBe(37);
        expect(restoredState.enemies[0]?.guardStacks).toBe(1);
        expect(restoredState.combatEvents).toEqual([]);
    });

    it("rejects save payloads from a newer unsupported version", () => {
        const payload = {
            version: GAME_STATE_EXPORT_VERSION + 1,
            savedAt: new Date().toISOString(),
            state: {},
        };

        expect(() => deserializeGameState(JSON.stringify(payload))).toThrow(/newer than this build supports/i);
    });

    it("rejects malformed save payloads", () => {
        expect(() => deserializeGameState("[]")).toThrow(/json object/i);
    });

    it("derives the current export version from the migration plan", () => {
        expect(GAME_STATE_EXPORT_VERSION).toBe(LEGACY_UNVERSIONED_SAVE_VERSION + SAVE_MIGRATIONS.length);
    });

    it("rejects invalid save versions before migration", () => {
        expect(() => deserializeGameState(JSON.stringify({
            version: 1.5,
            savedAt: new Date().toISOString(),
            state: {},
        }))).toThrow(/version is invalid/i);

        expect(() => deserializeGameState(JSON.stringify({
            version: -1,
            savedAt: new Date().toISOString(),
            state: {},
        }))).toThrow(/version is invalid/i);
    });

    it("migrates legacy learned-talent arrays into rank-1 talent maps", () => {
        const payload = {
            version: 3,
            savedAt: new Date().toISOString(),
            state: {
                party: createStarterParty("Selene", "Cleric"),
                enemies: [],
                talentProgression: {
                    unlockedTalentIdsByHeroId: {
                        hero_1: ["cleric-sunfire", "cleric-shepherd"],
                    },
                    talentPointsByHeroId: {
                        hero_1: 1,
                    },
                },
            },
        };

        const restoredState = deserializeGameState(JSON.stringify(payload));

        expect(restoredState.talentProgression).toEqual({
            talentRanksByHeroId: {
                hero_1: {
                    "cleric-sunfire": 1,
                    "cleric-shepherd": 1,
                },
            },
            talentPointsByHeroId: {
                hero_1: 1,
            },
        });
    });

    it("migrates saved hero level progress onto the current XP curve", () => {
        const party = createStarterParty("Selene", "Cleric");
        party[0].level = 28;
        party[0].exp = new Decimal(18_000);
        party[0].expToNext = new Decimal(72_000);

        const exportedState = createInitialGameState({
            party,
            enemies: [createEnemy(28, "enemy_28")],
        });

        const restoredState = deserializeGameState(JSON.stringify({
            version: 4,
            savedAt: new Date().toISOString(),
            state: exportedState,
        }));
        const restoredHero = restoredState.party[0];
        const expectedExpToNext = getExpRequirement(28);
        const expectedExp = expectedExpToNext.div(4).floor();

        expect(restoredHero?.level).toBe(28);
        expect(restoredHero?.expToNext.eq(expectedExpToNext)).toBe(true);
        expect(restoredHero?.exp.toString()).toBe(expectedExp.toString());
    });

    it("normalizes stale hero XP thresholds when exporting a current save snapshot", () => {
        const party = createStarterParty("Selene", "Cleric");
        party[0].level = 28;
        party[0].exp = new Decimal(18_000);
        party[0].expToNext = new Decimal(72_000);

        const restoredState = deserializeGameState(serializeGameState(createInitialGameState({ party })));
        const restoredHero = restoredState.party[0];
        const expectedExpToNext = getExpRequirement(28);
        const expectedExp = expectedExpToNext.div(4).floor();

        expect(restoredHero?.expToNext.eq(expectedExpToNext)).toBe(true);
        expect(restoredHero?.exp.toString()).toBe(expectedExp.toString());
    });
});
