import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStarterParty } from "@/game/entity";
import { GameProvider } from "@/game/gameState";
import { MAX_SAVE_SIZE_BYTES } from "@/game/store/persistence";

import { SaveControls } from "./SaveControls";

const renderSaveControls = (hasParty: boolean) =>
    render(
        <GameProvider initialState={{ party: hasParty ? createStarterParty("Ayla", "Cleric") : [] }}>
            <SaveControls />
        </GameProvider>,
    );

describe("SaveControls", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("shows the correct idle status based on whether a party exists", () => {
        const { rerender } = renderSaveControls(false);

        expect(screen.getByRole("status")).toHaveTextContent(/import a save or start a run/i);

        rerender(
            <GameProvider initialState={{ party: createStarterParty("Ayla", "Cleric") }}>
                <SaveControls />
            </GameProvider>,
        );

        expect(screen.getByRole("status")).toHaveTextContent(/autosaves every 10s/i);
    });

    it("opens the hidden file input when import save is clicked", async () => {
        const user = userEvent.setup();
        const inputClick = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);

        renderSaveControls(true);

        await user.click(screen.getByRole("button", { name: /import save/i }));

        expect(inputClick).toHaveBeenCalledOnce();
    });

    it("ignores empty file selections", () => {
        renderSaveControls(true);

        fireEvent.change(screen.getByLabelText(/import save file/i), { target: { files: [] } });

        expect(screen.getByRole("status")).toHaveTextContent(/autosaves every 10s/i);
    });

    it("shows import validation errors and clears them after the status timeout", async () => {
        vi.useFakeTimers();
        const oversizedFile = new File(["{}"], "oversized-save.json", { type: "application/json" });
        Object.defineProperty(oversizedFile, "size", { configurable: true, value: MAX_SAVE_SIZE_BYTES + 1 });

        renderSaveControls(true);

        fireEvent.change(screen.getByLabelText(/import save file/i), { target: { files: [oversizedFile] } });

        expect(screen.getByRole("status")).toHaveTextContent(/save file is too large/i);

        act(() => {
            vi.advanceTimersByTime(3_000);
        });

        expect(screen.getByRole("status")).toHaveTextContent(/autosaves every 10s/i);
    });

    it("surfaces invalid json import failures", async () => {
        const user = userEvent.setup();
        const invalidSave = new File(["not json"], "broken-save.json", { type: "application/json" });

        renderSaveControls(true);

        await user.upload(screen.getByLabelText(/import save file/i), invalidSave);

        expect(screen.getByRole("status")).toHaveTextContent(/save file is not valid json/i);
    });
});
