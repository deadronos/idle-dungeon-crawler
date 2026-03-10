import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App integration", () => {
    it("creates a starter party and supports dungeon and shop sections", async () => {
        const user = userEvent.setup();

        render(<App />);

        await user.clear(screen.getByLabelText(/hero name/i));
        await user.type(screen.getByLabelText(/hero name/i), "Ayla");
        await user.click(screen.getByRole("button", { name: /cleric/i }));
        await user.click(screen.getByRole("button", { name: /start journey/i }));

        expect(screen.getByText("Ayla")).toBeInTheDocument();
        expect(screen.getByText("Brom")).toBeInTheDocument();
        expect(screen.getByText("Kestrel")).toBeInTheDocument();
        expect(screen.getByLabelText(/autofight/i)).toBeChecked();
        expect(screen.getByLabelText(/autoadvance/i)).toBeChecked();
        expect(screen.getByRole("button", { name: /previous floor/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /next floor/i })).toBeInTheDocument();
        expect(screen.getAllByText(/VIT:/i)).toHaveLength(4);
        expect(screen.getAllByText(/STR:/i)).toHaveLength(4);
        expect(screen.getAllByText(/DEX:/i)).toHaveLength(4);
        expect(screen.getAllByText(/INT:/i)).toHaveLength(4);
        expect(screen.getAllByText(/WIS:/i)).toHaveLength(4);

        await user.click(screen.getByRole("button", { name: /next floor/i }));

        expect(screen.getByRole("button", { name: /previous floor/i })).toBeEnabled();
        expect(screen.getAllByText(/2/).length).toBeGreaterThan(0);

        await user.click(screen.getByRole("button", { name: /upgrade shop/i }));

        expect(screen.getByText(/sanctum upgrades/i)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /previous floor/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /dungeon/i })).toBeInTheDocument();
    });
});
