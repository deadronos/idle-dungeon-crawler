import Decimal from "decimal.js";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GameProvider } from "@/game/gameState";
import { PrestigeUpgradesPanel } from "./PrestigeUpgradesPanel";

describe("PrestigeUpgradesPanel", () => {
    it("renders correctly with initial state", () => {
        render(
            <GameProvider
                initialState={{
                    heroSouls: new Decimal(100),
                    prestigeUpgrades: {
                        costReducer: 0,
                        hpMultiplier: 0,
                        gameSpeed: 0,
                        xpMultiplier: 0,
                    },
                }}
            >
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        expect(screen.getByText(/Altar of Souls/i)).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText(/Souls Available/i)).toBeInTheDocument();

        // Check for upgrade names (using Greed, Vitality, Haste, Insight as seen in component)
        expect(screen.getByText(/Greed/i)).toBeInTheDocument();
        expect(screen.getByText(/Vitality/i)).toBeInTheDocument();
        expect(screen.getByText(/Haste/i)).toBeInTheDocument();
        expect(screen.getByText(/Insight/i)).toBeInTheDocument();

        // Check for initial levels
        const lv0s = screen.getAllByText("Lv 0");
        expect(lv0s).toHaveLength(4);
    });

    it("disables buttons when not enough souls are available", () => {
        render(
            <GameProvider
                initialState={{
                    heroSouls: new Decimal(0),
                }}
            >
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        const buttons = screen.getAllByRole("button", { name: /Imbue/i });
        buttons.forEach(button => {
            expect(button).toBeDisabled();
        });
    });

    it("enables buttons when enough souls are available", () => {
        render(
            <GameProvider
                initialState={{
                    heroSouls: new Decimal(100),
                }}
            >
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        const buttons = screen.getAllByRole("button", { name: /Imbue/i });
        buttons.forEach(button => {
            expect(button).toBeEnabled();
        });
    });

    it("buys an upgrade when the button is clicked", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    heroSouls: new Decimal(100),
                    prestigeUpgrades: {
                        costReducer: 0,
                        hpMultiplier: 0,
                        gameSpeed: 0,
                        xpMultiplier: 0,
                    },
                }}
            >
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        // Target the Greed card specifically to find its button
        const greedCard = screen.getByText(/Greed/i).closest(".rounded-xl") as HTMLElement;
        if (!greedCard) throw new Error("Could not find Greed card");

        const imbueButton = within(greedCard).getByRole("button", { name: /Imbue/i });
        await user.click(imbueButton);

        // Should now be Lv 1
        expect(within(greedCard).getByText("Lv 1")).toBeInTheDocument();
        // 100 - 10 = 90 souls left (PRESTIGE_BASE_COSTS.costReducer = 10)
        expect(screen.getByText("90")).toBeInTheDocument();
    });

    it("displays correct Insight XP bonus in description", () => {
        render(
            <GameProvider>
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        // INSIGHT_XP_BONUS_PER_LEVEL is 0.6, so 60%
        expect(screen.getByText(/60%/i)).toBeInTheDocument();
    });
});
