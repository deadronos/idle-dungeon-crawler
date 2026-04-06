import Decimal from "decimal.js";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createStarterParty } from "@/game/entity";
import { GameProvider } from "@/game/gameState";

import { PrestigeUpgradesPanel } from "./PrestigeUpgradesPanel";
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

    it("keeps the first party slot locked until floor 3 has been cleared", () => {
        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(100),
                    party: createStarterParty("Ayla", "Warrior"),
                    highestFloorCleared: 2,
                }}
            >
                <UpgradesPanel />
            </GameProvider>,
        );

        expect(screen.getByText(/requires floor 3 cleared/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /unlock slot \(60 gold\)/i })).toBeDisabled();
    });

    it("enables fortification as soon as enough gold is available", () => {
        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(35),
                    party: createStarterParty("Ayla", "Warrior"),
                }}
            >
                <UpgradesPanel />
            </GameProvider>,
        );

        expect(screen.getByRole("button", { name: /upgrade \(35 gold\)/i })).toBeEnabled();
    });

    it("unlocks a party slot and recruits a new adventurer as soon as floor 3 is cleared", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(100),
                    party: createStarterParty("Ayla", "Warrior"),
                    highestFloorCleared: 3,
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

    it("unlocks the third party slot after floor 8 has been cleared", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(1000),
                    party: createStarterParty("Ayla", "Warrior"),
                    partyCapacity: 2,
                    highestFloorCleared: 8,
                }}
            >
                <UpgradesPanel />
            </GameProvider>,
        );

        const unlockButton = screen.getByRole("button", { name: /unlock slot \(180 gold\)/i });

        expect(unlockButton).toBeEnabled();

        await user.click(unlockButton);

        expect(screen.getByText("3/5")).toBeInTheDocument();
        expect(screen.getByText(/next capacity: 4/i)).toBeInTheDocument();
    });

    it("updates displayed upgrade costs after buying the gold cost reducer prestige upgrade", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    gold: new Decimal(100000),
                    heroSouls: new Decimal(10),
                    metaUpgrades: {
                        training: 17,
                        fortification: 0,
                    },
                    party: createStarterParty("Ayla", "Warrior"),
                }}
            >
                <UpgradesPanel />
                <PrestigeUpgradesPanel />
            </GameProvider>,
        );

        const battleDrillsCard = screen.getByText("Battle Drills").closest<HTMLElement>("div.rounded-xl");

        if (!battleDrillsCard) {
            throw new Error("Expected Battle Drills upgrade card to be rendered.");
        }

        expect(within(battleDrillsCard).getByRole("button", { name: /upgrade/i })).toHaveTextContent("73.79k");

        const greedCard = screen.getByText("Greed").closest<HTMLElement>("div.rounded-xl");

        if (!greedCard) {
            throw new Error("Expected Greed prestige card to be rendered.");
        }

        await user.click(within(greedCard).getByRole("button", { name: /imbue \(10 souls\)/i }));

        expect(within(battleDrillsCard).getByRole("button", { name: /upgrade/i })).toHaveTextContent("66.33k");
    });
});
