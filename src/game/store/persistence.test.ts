import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createEnemy, createStarterParty } from "@/game/entity";
import { createInitialGameState } from "@/game/engine/simulation";

import { deserializeGameState, serializeGameState } from "./persistence";

describe("game-state persistence", () => {
    it("roundtrips the playable game state through JSON export and import", () => {
        const exportedState = createInitialGameState({
            party: createStarterParty("Selene", "Cleric"),
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

    it("rehydrates missing combat ratings from older save payloads", () => {
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
        delete payload.state.enemies[0]?.accuracyRating;
        delete payload.state.enemies[0]?.evasionRating;
        delete payload.state.enemies[0]?.parryRating;

        const restoredState = deserializeGameState(JSON.stringify(payload));

        expect(restoredState.party[0]?.accuracyRating).toBeGreaterThan(0);
        expect(restoredState.party[0]?.evasionRating).toBeGreaterThan(0);
        expect(restoredState.party[0]?.parryRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.accuracyRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.evasionRating).toBeGreaterThan(0);
        expect(restoredState.enemies[0]?.parryRating).toBeGreaterThan(0);
    });

    it("rejects malformed save payloads", () => {
        expect(() => deserializeGameState("[]")).toThrow(/json object/i);
    });
});
