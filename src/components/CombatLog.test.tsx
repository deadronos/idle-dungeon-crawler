import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createEnemy, createStarterParty } from "@/game/entity";
import { GameProvider } from "@/game/gameState";

import { CombatLog } from "./CombatLog";

const renderCombatLog = (combatLog: string[]) =>
    render(
        <GameProvider
            initialState={{
                combatLog,
                party: createStarterParty("Ayla", "Warrior"),
                enemies: [createEnemy(1, "enemy_1")],
                autoFight: false,
            }}
        >
            <CombatLog />
        </GameProvider>,
    );

describe("CombatLog", () => {
    it("shows an empty-state message for both log tabs when there are no entries", async () => {
        const user = userEvent.setup();

        renderCombatLog([]);

        expect(screen.getByText(/no combat entries yet/i)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /events/i }));

        expect(screen.getByText(/no notable events yet/i)).toBeInTheDocument();
    });

    it("filters the events tab down to notable combat messages", async () => {
        const user = userEvent.setup();

        renderCombatLog([
            "Ayla attacks the slime.",
            "Brom lands a critical hit!",
            "The slime is slain.",
            "Party formation holds steady.",
        ]);

        await user.click(screen.getByRole("button", { name: /events/i }));

        expect(screen.queryByText(/ayla attacks the slime/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/party formation holds steady/i)).not.toBeInTheDocument();
        expect(screen.getByText(/brom lands a critical hit/i)).toBeInTheDocument();
        expect(screen.getByText(/the slime is slain/i)).toBeInTheDocument();
    });

    it("reveals more entries when expanded or resized", async () => {
        const user = userEvent.setup();
        const entries = ["Entry 1", "Entry 2", "Entry 3", "Entry 4", "Entry 5", "Entry 6"];

        renderCombatLog(entries);

        expect(screen.queryByText("Entry 5")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /expand/i }));

        expect(screen.getByRole("button", { name: /collapse/i })).toBeInTheDocument();
        expect(screen.getByText("Entry 5")).toBeInTheDocument();
        expect(screen.getByText("Entry 6")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /collapse/i }));

        expect(screen.queryByText("Entry 5")).not.toBeInTheDocument();

        fireEvent.pointerDown(screen.getByRole("button", { name: /resize combat log/i }), { clientY: 100 });
        fireEvent.pointerMove(window, { clientY: 16 });
        fireEvent.pointerUp(window);

        expect(screen.getByText("Entry 5")).toBeInTheDocument();
        expect(screen.getByText("Entry 6")).toBeInTheDocument();
    });
});
