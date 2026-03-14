import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createStarterParty } from "@/game/entity";
import { createInitialGameState } from "@/game/engine/simulation";

import { deserializeGameState, serializeGameState } from "./persistence";

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
        });

        const restoredState = deserializeGameState(serializeGameState(exportedState));

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

    it("rehydrates missing combat ratings and scaling stats from older save payloads", () => {
        const exportedState = createInitialGameState({
            party: createStarterParty("Selene", "Cleric"),
            enemies: [createEnemy(3, "enemy_3")],
        });

        const payload = JSON.parse(serializeGameState(exportedState)) as {
            state: {
                party: Array<Record<string, unknown>>;
                enemies: Array<Record<string, unknown>>;
            };
        };

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
    });

    it("rejects malformed save payloads", () => {
        expect(() => deserializeGameState("[]")).toThrow(/json object/i);
    });
});
