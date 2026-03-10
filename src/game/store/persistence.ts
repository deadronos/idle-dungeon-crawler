import { createInitialGameState } from "../engine/simulation";
import type { GameState } from "./types";

export const GAME_STATE_STORAGE_KEY = "idle-dungeon-crawler.game-state";
export const GAME_STATE_AUTOSAVE_MS = 10_000;
export const GAME_STATE_EXPORT_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const toPartialGameState = (value: unknown): Partial<GameState> => {
    if (!isRecord(value)) {
        throw new Error("Save data must be a JSON object.");
    }

    const candidate: Partial<GameState> = {};

    if (Array.isArray(value.party)) {
        candidate.party = value.party as GameState["party"];
    }

    if (Array.isArray(value.enemies)) {
        candidate.enemies = value.enemies as GameState["enemies"];
    }

    if (typeof value.gold === "string" || typeof value.gold === "number") {
        candidate.gold = value.gold as unknown as GameState["gold"];
    }

    if (typeof value.floor === "number") {
        candidate.floor = value.floor;
    }

    if (typeof value.autoFight === "boolean") {
        candidate.autoFight = value.autoFight;
    }

    if (typeof value.autoAdvance === "boolean") {
        candidate.autoAdvance = value.autoAdvance;
    }

    if (Array.isArray(value.combatLog) && value.combatLog.every((entry) => typeof entry === "string")) {
        candidate.combatLog = value.combatLog;
    }

    if (isRecord(value.metaUpgrades)) {
        const metaUpgrades: GameState["metaUpgrades"] = {
            training: typeof value.metaUpgrades.training === "number" ? value.metaUpgrades.training : 0,
            fortification: typeof value.metaUpgrades.fortification === "number" ? value.metaUpgrades.fortification : 0,
        };
        candidate.metaUpgrades = metaUpgrades;
    }

    if (typeof value.partyCapacity === "number") {
        candidate.partyCapacity = value.partyCapacity;
    }

    if (typeof value.maxPartySize === "number") {
        candidate.maxPartySize = value.maxPartySize;
    }

    if (typeof value.highestFloorCleared === "number") {
        candidate.highestFloorCleared = value.highestFloorCleared;
    }

    if (value.activeSection === "dungeon" || value.activeSection === "shop") {
        candidate.activeSection = value.activeSection;
    }

    return candidate;
};

export const getGameStateSnapshot = (state: GameState): GameState => createInitialGameState(state);

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
    let parsed: unknown;

    try {
        parsed = JSON.parse(serializedState) as unknown;
    } catch {
        throw new Error("Save file is not valid JSON.");
    }

    const rawState = isRecord(parsed) && "state" in parsed ? parsed.state : parsed;

    try {
        return createInitialGameState(toPartialGameState(rawState));
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Save file is missing required game-state data.");
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
