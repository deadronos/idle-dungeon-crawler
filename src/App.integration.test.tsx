import Decimal from "decimal.js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { createStarterParty, createEnemy } from "./game/entity";
import { createInitialGameState } from "./game/engine/simulation";
import { serializeGameState } from "./game/store/persistence";

describe("App integration", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        window.localStorage.clear();
    });

    it("creates a solo starter party and navigates to the upgrade shop", async () => {
        const user = userEvent.setup();

        const { unmount } = render(<App />);

        await user.clear(screen.getByLabelText(/hero name/i));
        await user.type(screen.getByLabelText(/hero name/i), "Ayla");
        await user.click(screen.getByRole("button", { name: /cleric/i }));
        await user.click(screen.getByRole("button", { name: /start journey/i }));

        expect(screen.getByText("Ayla")).toBeInTheDocument();
        expect(screen.queryByText("Brom")).not.toBeInTheDocument();
        expect(screen.getByLabelText(/autofight/i)).toBeChecked();
        expect(screen.getByLabelText(/autoadvance/i)).toBeChecked();
        expect(screen.getByRole("button", { name: /previous floor/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /next floor/i })).toBeInTheDocument();
        expect(screen.getAllByText(/^Combat Ratings$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^Derived Detail$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^VIT$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^STR$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^DEX$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^INT$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^WIS$/i)).toHaveLength(2);
        expect(screen.getAllByText(/^Resistances$/i)).toHaveLength(2);

        await user.click(screen.getByRole("button", { name: /next floor/i }));

        expect(screen.getByRole("button", { name: /previous floor/i })).toBeEnabled();
        expect(screen.getAllByText(/2/).length).toBeGreaterThan(0);

        await user.click(screen.getByRole("button", { name: /upgrade shop/i }));

        expect(screen.getByRole("tab", { name: /sanctum upgrades/i })).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: /hero builds/i })).not.toBeInTheDocument();
        expect(screen.getByText(/adventure stats/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /unlock slot \(60 gold\)/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /recruit warrior/i })).toBeDisabled();
        expect(screen.queryByRole("button", { name: /previous floor/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /dungeon/i })).toBeInTheDocument();

        unmount();
    });

    it("imports a saved run before creating a new party", async () => {
        const user = userEvent.setup();
        const importedState = createInitialGameState({
            party: createStarterParty("Selene", "Cleric"),
            enemies: [createEnemy(4, "enemy_4")],
            gold: new Decimal(77),
            floor: 4,
            activeSection: "shop",
            combatLog: ["Imported save"],
        });
        const saveFile = new File([serializeGameState(importedState)], "save.json", { type: "application/json" });

        render(<App />);

        await user.upload(screen.getByLabelText(/import save file/i), saveFile);

        expect(screen.getByText("77 Gold")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /sanctum upgrades/i })).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: /hero builds/i })).not.toBeInTheDocument();
        expect(screen.getByText(/adventure stats/i)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /start journey/i })).not.toBeInTheDocument();
    });

    it("exports the current run from the save controls", async () => {
        const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:save-file");
        const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
        const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
        const user = userEvent.setup();

        render(<App />);

        await user.clear(screen.getByLabelText(/hero name/i));
        await user.type(screen.getByLabelText(/hero name/i), "Ayla");
        await user.click(screen.getByRole("button", { name: /warrior/i }));
        await user.click(screen.getByRole("button", { name: /start journey/i }));
        await user.click(screen.getByRole("button", { name: /export save/i }));

        expect(anchorClick).toHaveBeenCalled();
        expect(createObjectURL).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledOnce();
        expect(screen.getByRole("status")).toHaveTextContent(/save exported/i);
    });
});
