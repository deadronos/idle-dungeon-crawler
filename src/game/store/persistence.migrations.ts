import type { SaveEnvelope, SaveMigration } from "./persistence.types";
import {
    DEFAULT_SAVE_TIMESTAMP,
    LEGACY_UNVERSIONED_SAVE_VERSION,
} from "./persistence.types";
import {
    hasOwn,
    isRecord,
    normalizeHeroProgressionToCurrentCurve,
    sanitizeEntityArray,
    sanitizeEquipmentProgression,
    sanitizeTalentProgression,
} from "./persistence.validation";

export const SAVE_MIGRATIONS = [
    ((state) => ({ ...state })) satisfies SaveMigration,
    ((state) => ({
        ...state,
        party: sanitizeEntityArray(state.party),
        enemies: sanitizeEntityArray(state.enemies),
        combatEvents: [],
        talentProgression: sanitizeTalentProgression(state.talentProgression),
        equipmentProgression: sanitizeEquipmentProgression(state.equipmentProgression),
    })) satisfies SaveMigration,
    ((state) => ({
        ...state,
        equipmentProgression: sanitizeEquipmentProgression(state.equipmentProgression),
    })) satisfies SaveMigration,
    ((state) => ({
        ...state,
        talentProgression: sanitizeTalentProgression(state.talentProgression),
    })) satisfies SaveMigration,
    ((state) => ({
        ...state,
        party: Array.isArray(state.party) ? state.party.map(normalizeHeroProgressionToCurrentCurve) : state.party,
    })) satisfies SaveMigration,
] as const;

export const GAME_STATE_EXPORT_VERSION = LEGACY_UNVERSIONED_SAVE_VERSION + SAVE_MIGRATIONS.length;

export const normalizeSaveEnvelope = (value: unknown): SaveEnvelope => {
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
        state: { ...(value as Record<string, unknown>) },
    };
};

export const migrateSaveEnvelope = (envelope: SaveEnvelope): SaveEnvelope => {
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
