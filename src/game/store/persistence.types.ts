export const GAME_STATE_STORAGE_KEY = "idle-dungeon-crawler.game-state";
export const GAME_STATE_AUTOSAVE_MS = 10_000;
export const LEGACY_UNVERSIONED_SAVE_VERSION = 0;
export const DEFAULT_SAVE_TIMESTAMP = new Date(0).toISOString();

export type RawSaveRecord = Record<string, unknown>;

export interface SaveEnvelope {
    version: number;
    savedAt: string;
    state: RawSaveRecord;
}

export type SaveMigration = (state: RawSaveRecord) => RawSaveRecord;
