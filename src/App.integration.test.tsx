import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App integration", () => {
    it("creates a starter party and shows the main game view", async () => {
        const user = userEvent.setup();

        render(<App />);

        await user.clear(screen.getByLabelText(/hero name/i));
        await user.type(screen.getByLabelText(/hero name/i), "Ayla");
        await user.click(screen.getByRole("button", { name: /cleric/i }));
        await user.click(screen.getByRole("button", { name: /start journey/i }));

        expect(screen.getByText("Ayla")).toBeInTheDocument();
        expect(screen.getByText("Brom")).toBeInTheDocument();
        expect(screen.getByText("Kestrel")).toBeInTheDocument();
        expect(screen.getByText(/sanctum upgrades/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /auto-progress: on/i })).toBeInTheDocument();
        expect(screen.getAllByText(/VIT:/i)).toHaveLength(4);
        expect(screen.getAllByText(/STR:/i)).toHaveLength(4);
        expect(screen.getAllByText(/DEX:/i)).toHaveLength(4);
        expect(screen.getAllByText(/INT:/i)).toHaveLength(4);
        expect(screen.getAllByText(/WIS:/i)).toHaveLength(4);
    });
});
