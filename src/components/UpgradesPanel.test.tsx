import Decimal from "decimal.js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createStarterParty } from "@/game/entity";
import { GameProvider } from "@/game/gameState";

import { UpgradesPanel } from "./UpgradesPanel";

describe("UpgradesPanel", () => {
    it("buys a persistent training upgrade when enough gold is available", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(100),
                    party: createStarterParty("Ayla", "Warrior"),
                }}
            >
                <UpgradesPanel />
            </GameProvider>,
        );

        await user.click(screen.getByRole("button", { name: /upgrade \(25 gold\)/i }));

        expect(screen.getByText("Lv 1")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /upgrade \(40 gold\)/i })).toBeInTheDocument();
    });

    it("unlocks a party slot and recruits a new adventurer when requirements are met", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(100),
                    party: createStarterParty("Ayla", "Warrior"),
                    highestFloorCleared: 5,
                }}
            >
                <UpgradesPanel />
            </GameProvider>,
        );

        await user.click(screen.getByRole("button", { name: /unlock slot \(60 gold\)/i }));

        const recruitWarriorButton = screen.getByRole("button", { name: /recruit warrior/i });
        expect(recruitWarriorButton).toBeEnabled();
        expect(screen.getByText(/open slots: 1/i)).toBeInTheDocument();

        await user.click(recruitWarriorButton);

        expect(screen.getByText(/open slots: 0/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /recruit warrior/i })).toBeDisabled();
        expect(screen.getByText(/current recruit cost: 90 gold/i)).toBeInTheDocument();
    });
});
