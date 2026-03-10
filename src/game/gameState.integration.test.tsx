import Decimal from "decimal.js";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEnemy, createRecruitHero, createStarterParty } from "./entity";
import { GameProvider, useGame } from "./gameState";

const CombatProbe = () => {
    const { state } = useGame();
    const warrior = state.party.find((hero) => hero.class === "Warrior");
    const cleric = state.party.find((hero) => hero.class === "Cleric");

    return (
        <>
            <div data-testid="floor">{state.floor}</div>
            <div data-testid="warrior-hp">{warrior?.currentHp.toString()}</div>
            <div data-testid="warrior-progress">{warrior?.actionProgress.toString()}</div>
            <div data-testid="cleric-skill">{cleric?.activeSkill ?? ""}</div>
            <div>{state.combatLog[0]}</div>
        </>
    );
};

describe("GameProvider integration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("lets clerics heal injured allies during the ATB loop", () => {
        const party = createStarterParty("Ayla", "Cleric");
        party.push(createRecruitHero("Warrior", party));
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
        expect(screen.getByTestId("cleric-skill").textContent).toMatch(/casting mend/i);
    });

    it("pauses ATB progress while autofight is disabled", () => {
        const party = createStarterParty("Ayla", "Warrior");
        const warrior = party.find((hero) => hero.class === "Warrior");

        if (!warrior) {
            throw new Error("Expected starter party to include a warrior.");
        }

        warrior.actionProgress = 40;

        render(
            <GameProvider
                initialState={{
                    party,
                    enemies: [createEnemy(1, "enemy_1")],
                    combatLog: [],
                    autoFight: false,
                }}
            >
                <CombatProbe />
            </GameProvider>,
        );

        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(Number(screen.getByTestId("warrior-progress").textContent)).toBe(40);
    });

    it("does not auto-advance floors when autoadvance is disabled", () => {
        render(
            <GameProvider
                initialState={{
                    party: createStarterParty("Ayla", "Warrior"),
                    enemies: [],
                    floor: 4,
                    autoFight: true,
                    autoAdvance: false,
                }}
            >
                <CombatProbe />
            </GameProvider>,
        );

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(screen.getByTestId("floor").textContent).toBe("4");
    });
});