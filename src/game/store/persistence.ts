import { createInitialGameState } from "../engine/simulation";
import {
    createEmptyEquipmentProgressionState,
    createEmptyTalentProgressionState,
} from "./types";
import type { GameState } from "./types";

export const GAME_STATE_STORAGE_KEY = "idle-dungeon-crawler.game-state";
export const GAME_STATE_AUTOSAVE_MS = 10_000;
export const GAME_STATE_EXPORT_VERSION = 2;
const LEGACY_UNVERSIONED_SAVE_VERSION = 0;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOwn = <TKey extends string>(value: Record<string, unknown>, key: TKey): value is Record<TKey, unknown> =>
    Object.prototype.hasOwnProperty.call(value, key);
const DEFAULT_SAVE_TIMESTAMP = new Date(0).toISOString();

type RawSaveRecord = Record<string, unknown>;

interface SaveEnvelope {
    version: number;
    savedAt: string;
    state: RawSaveRecord;
}

type SaveMigration = (state: RawSaveRecord) => RawSaveRecord;

const getStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const getStringArrayRecord = (value: unknown): Record<string, string[]> => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, getStringArray(entryValue)]),
    );
};

const getNumberRecord = (value: unknown): Record<string, number> => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.entries(value).reduce<Record<string, number>>((accumulator, [key, entryValue]) => {
        if (typeof entryValue === "number") {
            accumulator[key] = entryValue;
        }

        return accumulator;
    }, {});
};

const sanitizeTalentProgression = (value: unknown) => {
    const defaults = createEmptyTalentProgressionState();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        unlockedTalentIdsByHeroId: hasOwn(value, "unlockedTalentIdsByHeroId")
            ? getStringArrayRecord(value.unlockedTalentIdsByHeroId)
            : defaults.unlockedTalentIdsByHeroId,
        talentPointsByHeroId: hasOwn(value, "talentPointsByHeroId")
            ? getNumberRecord(value.talentPointsByHeroId)
            : defaults.talentPointsByHeroId,
    };
};

const sanitizeEquipmentProgression = (value: unknown) => {
    const defaults = createEmptyEquipmentProgressionState();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        inventoryItemIds: hasOwn(value, "inventoryItemIds") ? getStringArray(value.inventoryItemIds) : defaults.inventoryItemIds,
        equippedItemIdsByHeroId: hasOwn(value, "equippedItemIdsByHeroId")
            ? getStringArrayRecord(value.equippedItemIdsByHeroId)
            : defaults.equippedItemIdsByHeroId,
    };
};

const sanitizeMigratedEntity = (value: unknown): unknown => {
    if (!isRecord(value)) {
        return value;
    }

    return {
        ...value,
        activeSkill: typeof value.activeSkill === "string" ? value.activeSkill : null,
        activeSkillTicks: typeof value.activeSkillTicks === "number" ? value.activeSkillTicks : 0,
        actionProgress: typeof value.actionProgress === "number" ? value.actionProgress : 0,
        guardStacks: typeof value.guardStacks === "number" ? value.guardStacks : 0,
        statusEffects: Array.isArray(value.statusEffects) ? value.statusEffects : [],
    };
};

const sanitizeEntityArray = (value: unknown) => Array.isArray(value) ? value.map(sanitizeMigratedEntity) : value;

const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
    0: (state) => ({ ...state }),
    1: (state) => ({
        ...state,
        party: sanitizeEntityArray(state.party),
        enemies: sanitizeEntityArray(state.enemies),
        combatEvents: [],
        talentProgression: sanitizeTalentProgression(state.talentProgression),
        equipmentProgression: sanitizeEquipmentProgression(state.equipmentProgression),
    }),
};

const normalizeSaveEnvelope = (value: unknown): SaveEnvelope => {
    if (!isRecord(value)) {
        throw new Error("Save data must be a JSON object.");
    }

    if (hasOwn(value, "state")) {
        if (!isRecord(value.state)) {
            throw new Error("Save file is missing required game-state data.");
        }

        return {
            version: typeof value.version === "number" ? value.version : 1,
            savedAt: typeof value.savedAt === "string" ? value.savedAt : DEFAULT_SAVE_TIMESTAMP,
            state: { ...value.state },
        };
    }

    return {
        version: LEGACY_UNVERSIONED_SAVE_VERSION,
        savedAt: DEFAULT_SAVE_TIMESTAMP,
        state: { ...(value as RawSaveRecord) },
    };
};

const migrateSaveEnvelope = (envelope: SaveEnvelope): SaveEnvelope => {
    if (!Number.isInteger(envelope.version) || envelope.version < LEGACY_UNVERSIONED_SAVE_VERSION) {
        throw new Error("Save file version is invalid.");
    }

    if (envelope.version > GAME_STATE_EXPORT_VERSION) {
        throw new Error(`Save file version ${envelope.version} is newer than this build supports.`);
    }

    let migratedEnvelope = { ...envelope, state: { ...envelope.state } };

    while (migratedEnvelope.version < GAME_STATE_EXPORT_VERSION) {
        const migration = SAVE_MIGRATIONS[migratedEnvelope.version];
        if (!migration) {
            throw new Error(`No migration path from save version ${migratedEnvelope.version}.`);
        }

        migratedEnvelope = {
            ...migratedEnvelope,
            version: migratedEnvelope.version + 1,
            state: migration(migratedEnvelope.state),
        };
    }

    return migratedEnvelope;
};

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

    if (typeof value.heroSouls === "string" || typeof value.heroSouls === "number") {
        candidate.heroSouls = value.heroSouls as unknown as GameState["heroSouls"];
    }

    if (isRecord(value.prestigeUpgrades)) {
        const prestigeUpgrades: GameState["prestigeUpgrades"] = {
            costReducer: typeof value.prestigeUpgrades.costReducer === "number" ? value.prestigeUpgrades.costReducer : 0,
            hpMultiplier: typeof value.prestigeUpgrades.hpMultiplier === "number" ? value.prestigeUpgrades.hpMultiplier : 0,
            gameSpeed: typeof value.prestigeUpgrades.gameSpeed === "number" ? value.prestigeUpgrades.gameSpeed : 0,
            xpMultiplier: typeof value.prestigeUpgrades.xpMultiplier === "number" ? value.prestigeUpgrades.xpMultiplier : 0,
        };
        candidate.prestigeUpgrades = prestigeUpgrades;
    }

    if (isRecord(value.talentProgression)) {
        candidate.talentProgression = sanitizeTalentProgression(value.talentProgression);
    }

    if (isRecord(value.equipmentProgression)) {
        candidate.equipmentProgression = sanitizeEquipmentProgression(value.equipmentProgression);
    }

    return candidate;
};

export const getGameStateSnapshot = (state: GameState): GameState => ({
    ...createInitialGameState(state),
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
