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
});
