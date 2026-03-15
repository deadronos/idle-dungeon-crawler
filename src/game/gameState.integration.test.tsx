import Decimal from "decimal.js";
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEnemy, createRecruitHero, createStarterParty } from "./entity";
import { GAME_STATE_STORAGE_KEY, deserializeGameState } from "./store/persistence";
import { GameProvider, useGame } from "./gameState";

const CombatProbe = () => {
    const { state } = useGame();
    const warrior = state.party.find((hero) => hero.class === "Warrior");
    const cleric = state.party.find((hero) => hero.class === "Cleric");

    return (
        <>
            <div data-testid="floor">{state.floor}</div>
            <div data-testid="enemy-count">{state.enemies.length}</div>
            <div data-testid="warrior-hp">{warrior?.currentHp.toString()}</div>
            <div data-testid="warrior-progress">{warrior?.actionProgress.toString()}</div>
            <div data-testid="cleric-skill">{cleric?.activeSkill ?? ""}</div>
            <div>{state.combatLog[0]}</div>
        </>
    );
};

const AutoSaveProbe = () => {
    const { state, actions } = useGame();

    React.useEffect(() => {
        if (state.party.length > 0) {
            return;
        }

        actions.initializeParty(createStarterParty("Ayla", "Warrior"));
        actions.toggleAutoFight();
    }, [actions, state.party.length]);

    return <div data-testid="autosave-party-size">{state.party.length}</div>;
};

describe("GameProvider integration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
        window.localStorage.clear();
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

    it("restarts the same floor instead of stalling when autoadvance is disabled", () => {
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
        expect(screen.getByTestId("enemy-count").textContent).toBe("1");
        expect(screen.getByText(/recovers 25% hp/i)).toBeInTheDocument();
    });

    it("autosaves the current run to local storage", () => {
        render(
            <GameProvider>
                <AutoSaveProbe />
            </GameProvider>,
        );

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        const savedState = window.localStorage.getItem(GAME_STATE_STORAGE_KEY);

        expect(screen.getByTestId("autosave-party-size").textContent).toBe("1");
        expect(savedState).toBeTruthy();
        expect(deserializeGameState(savedState ?? "")).toMatchObject({
            autoFight: false,
            floor: 1,
        });
    });
});
