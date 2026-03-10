import Decimal from "decimal.js";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEnemy, createStarterParty } from "./entity";
import { GameProvider, useGame } from "./gameState";

const CombatProbe = () => {
    const { state } = useGame();
    const warrior = state.party.find((hero) => hero.class === "Warrior");

    return (
        <>
            <div data-testid="warrior-hp">{warrior?.currentHp.toString()}</div>
            <div>{state.combatLog[0]}</div>
        </>
    );
};

describe("GameProvider integration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("lets clerics heal injured allies during the ATB loop", () => {
        const party = createStarterParty("Ayla", "Cleric");
        const warrior = party.find((hero) => hero.class === "Warrior");
        const cleric = party.find((hero) => hero.class === "Cleric");

        if (!warrior || !cleric) {
            throw new Error("Expected starter party to include a warrior and cleric.");
        }

        const startingHp = warrior.currentHp.div(2);
        warrior.currentHp = startingHp;
        cleric.actionProgress = 99;
        cleric.currentResource = new Decimal(cleric.maxResource);

        render(
            <GameProvider
                initialState={{
                    party,
                    enemies: [createEnemy(1, "enemy_1")],
                    combatLog: [],
                }}
            >
                <CombatProbe />
            </GameProvider>,
        );

        act(() => {
            vi.advanceTimersByTime(60);
        });

        expect(Number(screen.getByTestId("warrior-hp").textContent)).toBeGreaterThan(startingHp.toNumber());
        expect(screen.getByText(/casts mend/i)).toBeInTheDocument();
    });
});