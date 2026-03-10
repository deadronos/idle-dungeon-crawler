import React, { useEffect, useId, useRef, useState } from "react";

import { Download, Upload } from "lucide-react";

import { useGameStore, useGameStoreApi } from "@/game/store/gameStore";
import { deserializeGameState, getGameStateSnapshot, saveGameStateToStorage, serializeGameState } from "@/game/store/persistence";

import { Button } from "./ui/button";

const STATUS_TIMEOUT_MS = 3_000;

const formatSaveFileDate = () => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");

    return [
        now.getUTCFullYear(),
        pad(now.getUTCMonth() + 1),
        pad(now.getUTCDate()),
        "-",
        pad(now.getUTCHours()),
        pad(now.getUTCMinutes()),
        pad(now.getUTCSeconds()),
    ].join("");
};

export const SaveControls: React.FC = () => {
    const store = useGameStoreApi();
    const hasParty = useGameStore((state) => state.party.length > 0);
    const inputId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!statusMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => setStatusMessage(null), STATUS_TIMEOUT_MS);
        return () => window.clearTimeout(timeoutId);
    }, [statusMessage]);

    const handleExport = () => {
        const serializedState = serializeGameState(getGameStateSnapshot(store.getState()));
        const blob = new Blob([serializedState], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `idle-dungeon-crawler-save-${formatSaveFileDate()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setStatusMessage("Save exported.");
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const importedState = deserializeGameState(await file.text());

            store.getState().reset(importedState);

            if (typeof window !== "undefined") {
                saveGameStateToStorage(window.localStorage, importedState);
            }

            setStatusMessage("Save imported.");
        } catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Import failed.");
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleExport}
                    className="rounded-full border-slate-600 bg-slate-900/70 font-bold uppercase tracking-[0.2em] text-slate-100 hover:bg-slate-800"
                >
                    <Download className="size-4" />
                    Export Save
                </Button>
                <input
                    ref={fileInputRef}
                    id={inputId}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImport}
                    className="sr-only"
                />
                <label htmlFor={inputId} className="sr-only">
                    Import save file
                </label>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border-slate-600 bg-slate-900/70 font-bold uppercase tracking-[0.2em] text-slate-100 hover:bg-slate-800"
                >
                    <Upload className="size-4" />
                    Import Save
                </Button>
            </div>
            <div
                role="status"
                aria-live="polite"
                className="min-h-5 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
            >
                {statusMessage ?? (hasParty ? "Autosaves every 10s" : "Import a save or start a run")}
            </div>
        </div>
    );
};
