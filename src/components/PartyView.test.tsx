import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRecruitHero, createStarterParty } from "@/game/entity";
import { GameProvider } from "@/game/gameState";

import { PartyView } from "./PartyView";

describe("PartyView", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the character sheet for the first hero with portrait, name and class badge", () => {
        render(
            <GameProvider initialState={{ party: createStarterParty("Ayla", "Cleric") }}>
                <PartyView />
            </GameProvider>,
        );

        expect(screen.getByText("Ayla")).toBeInTheDocument();
        expect(screen.getByText(/cleric/i)).toBeInTheDocument();
        expect(screen.getByAltText(/ayla portrait/i)).toBeInTheDocument();
        expect(screen.getByText(/1 \/ 1/i)).toBeInTheDocument();
    });

    it("shows basic stats panel by default with HP, resource and attribute grid", () => {
        render(
            <GameProvider initialState={{ party: createStarterParty("Ayla", "Cleric") }}>
                <PartyView />
            </GameProvider>,
        );

        expect(screen.getByText(/basic stats/i)).toBeInTheDocument();
        // HP label appears in both the portrait bar and the stats panel
        expect(screen.getAllByText(/^HP$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/^Mana$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Phys Dmg$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Armor$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^VIT$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^STR$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^DEX$/i).length).toBeGreaterThanOrEqual(1);
    });

    it("switches to secondary stats panel when the Secondary tab is clicked", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider initialState={{ party: createStarterParty("Ayla", "Cleric") }}>
                <PartyView />
            </GameProvider>,
        );

        await user.click(screen.getByRole("button", { name: /secondary/i }));

        expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
        expect(screen.getByText(/evasion/i)).toBeInTheDocument();
        expect(screen.getByText(/crit chance/i)).toBeInTheDocument();
        expect(screen.getByText(/resistances/i)).toBeInTheDocument();
    });

    it("switches to talents panel and allows learning a talent when points are available", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider
                initialState={{
                    party: createStarterParty("Ayla", "Cleric"),
                    talentProgression: {
                        unlockedTalentIdsByHeroId: {},
                        talentPointsByHeroId: { hero_1: 1 },
                    },
                }}
            >
                <PartyView />
            </GameProvider>,
        );

        await user.click(screen.getByRole("button", { name: /talents/i }));

        expect(screen.getByText(/1 pts/i)).toBeInTheDocument();

        const learnButtons = screen.getAllByRole("button", { name: /learn/i });
        expect(learnButtons.length).toBeGreaterThan(0);

        await user.click(learnButtons[0]);

        expect(screen.getByText(/0 pts/i)).toBeInTheDocument();
    });

    it("switches to equipment panel and shows all four gear slots", async () => {
        const user = userEvent.setup();

        render(
            <GameProvider initialState={{ party: createStarterParty("Ayla", "Cleric") }}>
                <PartyView />
            </GameProvider>,
        );

        await user.click(screen.getByRole("button", { name: /equipment/i }));

        expect(screen.getByText(/weapon/i)).toBeInTheDocument();
        expect(screen.getByText(/armor/i)).toBeInTheDocument();
        expect(screen.getAllByText(/charm/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/trinket/i)).toBeInTheDocument();
    });

    it("paginates between heroes when there are multiple party members", async () => {
        const user = userEvent.setup();

        const [first] = createStarterParty("Brom", "Warrior");
        const second = createRecruitHero("Cleric", [first]);

        render(
            <GameProvider initialState={{ party: [first, second], partyCapacity: 2 }}>
                <PartyView />
            </GameProvider>,
        );

        expect(screen.getByText(/1 \/ 2/i)).toBeInTheDocument();
        expect(screen.getByText("Brom")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /next hero/i }));

        expect(screen.getByText(/2 \/ 2/i)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /previous hero/i }));

        expect(screen.getByText(/1 \/ 2/i)).toBeInTheDocument();
        expect(screen.getByText("Brom")).toBeInTheDocument();
    });

    it("shows an empty-party message when the party has no heroes", () => {
        render(
            <GameProvider initialState={{ party: [] }}>
                <PartyView />
            </GameProvider>,
        );

        expect(screen.getByText(/no heroes in your party/i)).toBeInTheDocument();
    });
});
