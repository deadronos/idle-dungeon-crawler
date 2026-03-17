import { describe, expect, it, vi } from "vitest";

import type { GameState, UiSlice } from "./types";
import { createUiSlice, selectUiState } from "./uiSlice";

describe("uiSlice", () => {
    describe("selectUiState", () => {
        it("should extract the UI state from the full game state", () => {
            const mockState = {
                activeSection: "shop",
                floor: 10,
                gold: { toString: () => "100" },
            } as unknown as GameState;

            const selected = selectUiState(mockState);
            expect(selected).toEqual({ activeSection: "shop" });
        });
    });

    describe("createUiSlice", () => {
        const initialState: UiSlice = { activeSection: "dungeon" };

        it("should initialize with the provided state", () => {
            const set = vi.fn();
            const get = vi.fn();
            const api = {} as Parameters<ReturnType<typeof createUiSlice>>[2];

            const slice = createUiSlice(initialState)(set, get, api);

            expect(slice.activeSection).toBe("dungeon");
            expect(typeof slice.setActiveSection).toBe("function");
        });

        it("should update activeSection when setActiveSection is called", () => {
            const set = vi.fn();
            const get = vi.fn();
            const api = {} as Parameters<ReturnType<typeof createUiSlice>>[2];

            const slice = createUiSlice(initialState)(set, get, api);
            slice.setActiveSection("party");

            expect(set).toHaveBeenCalledWith({ activeSection: "party" });
        });
    });
});
