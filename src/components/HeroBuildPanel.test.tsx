import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createStarterParty } from "@/game/entity";
import { createLegacyEquipmentProgression } from "@/game/equipmentProgression";
import { GameProvider } from "@/game/gameState";

import { HeroBuildPanel } from "./HeroBuildPanel";

describe("HeroBuildPanel", () => {
    it("lets the player learn a talent and equip stocked gear for a hero", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    party: createStarterParty("Ayla", "Cleric"),
                    talentProgression: {
                        talentRanksByHeroId: {},
                        talentPointsByHeroId: {
                            hero_1: 1,
                        },
                    },
                    equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
                }}
            >
                <HeroBuildPanel />
            </GameProvider>,
        );

        expect(screen.getByText(/talent points: 1/i)).toBeInTheDocument();

        const sunfireCard = screen.getByText("Sunfire").closest<HTMLElement>("div.rounded-xl");
        if (!sunfireCard) {
            throw new Error("Expected Sunfire talent card to be rendered.");
        }

        await user.click(within(sunfireCard).getByRole("button", { name: /learn/i }));

        expect(screen.getByText(/talent points: 0/i)).toBeInTheDocument();
    expect(within(sunfireCard).getByText(/rank 1\/3/i)).toBeInTheDocument();
    expect(within(sunfireCard).getByRole("button", { name: /upgrade/i })).toBeDisabled();

        const weaponSection = screen.getByText(/weapon/i).closest<HTMLElement>("div.rounded-xl");
        if (!weaponSection) {
            throw new Error("Expected weapon section to be rendered.");
        }

        await user.click(within(weaponSection).getByRole("button", { name: /sunlit censer/i }));

        expect(within(weaponSection).getByRole("button", { name: /unequip/i })).toBeInTheDocument();
        expect(within(weaponSection).getAllByText(/sunlit censer/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/1\/4 equipped/i)).toBeInTheDocument();
    });
});
