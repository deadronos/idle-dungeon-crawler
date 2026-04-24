import { createInitialGameState } from "../engine/simulation";
import {
    GAME_STATE_STORAGE_KEY,
    MAX_SAVE_SIZE_BYTES,
} from "./persistence.types";
import { GAME_STATE_EXPORT_VERSION, migrateSaveEnvelope, normalizeSaveEnvelope } from "./persistence.migrations";
import { normalizeHeroProgressionToCurrentCurve, toPartialGameState } from "./persistence.validation";
import type { GameState } from "./types";

export const getGameStateSnapshot = (state: GameState): GameState => ({
    ...createInitialGameState({
        ...state,
        party: state.party.map((hero) => normalizeHeroProgressionToCurrentCurve(hero) as GameState["party"][number]),
    }),
    combatEvents: [],
});

export const serializeGameState = (state: GameState) =>
    JSON.stringify(
        {
            version: GAME_STATE_EXPORT_VERSION,
            savedAt: new Date().toISOString(),
            state: getGameStateSnapshot(state),
        },
        null,
        2,
    );

export const deserializeGameState = (serializedState: string): GameState => {
    const serializedByteLength = new TextEncoder().encode(serializedState).length;
    if (serializedByteLength > MAX_SAVE_SIZE_BYTES) {
        throw new Error("Save file is too large.");
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(serializedState) as unknown;
    } catch {
        throw new Error("Save file is not valid JSON.");
    }

    const migratedEnvelope = migrateSaveEnvelope(normalizeSaveEnvelope(parsed));

    try {
        return createInitialGameState(toPartialGameState(migratedEnvelope.state));
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Save file is missing required game-state data.", { cause: error });
    }
};

export const loadGameStateFromStorage = (storage: Pick<Storage, "getItem">) => {
    const serializedState = storage.getItem(GAME_STATE_STORAGE_KEY);
    if (!serializedState) {
        return null;
    }

    try {
        return deserializeGameState(serializedState);
    } catch {
        return null;
    }
};

export const saveGameStateToStorage = (storage: Pick<Storage, "setItem">, state: GameState) => {
    storage.setItem(GAME_STATE_STORAGE_KEY, serializeGameState(state));
};
