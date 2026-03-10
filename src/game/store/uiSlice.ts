import type { GameState, GameStateCreator, UiActions, UiSlice } from "./types";

export const selectUiState = (state: GameState): UiSlice => ({
    activeSection: state.activeSection,
});

export const createUiSlice = (initialState: UiSlice): GameStateCreator<UiSlice & UiActions> => {
    return (set) => ({
        ...initialState,
        setActiveSection: (section) => {
            set({ activeSection: section });
        },
    });
};