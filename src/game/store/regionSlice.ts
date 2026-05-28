import type { GameState, GameStateCreator } from "./types";
import { getRegionDefinition, getStartingFloorContext } from "../regions";
import type { RegionActions, RegionSlice } from "./types";

export const selectRegionState = (state: GameState): RegionSlice => ({
    currentRegionId: state.currentRegionId,
    currentRegionFloor: state.currentRegionFloor,
    regionProgress: state.regionProgress,
    highestRegionFloorCleared: state.highestRegionFloorCleared,
});

export const createRegionSlice = (
    initialState: RegionSlice,
): GameStateCreator<RegionSlice & RegionActions> => {
    return (set, get) => ({
        ...initialState,
        advanceToNextFloor: () => {
            set((state) => {
                const nextFloor = state.currentRegionFloor + 1;
                const region = state.currentRegionId;
                const def = getRegionDefinition(region);
                const progress = { ...state.regionProgress };
                const regionProgress = { ...progress[region] };
                regionProgress.highestLocalFloorCleared = Math.max(regionProgress.highestLocalFloorCleared, nextFloor);
                if (nextFloor >= def.completionFloor) {
                    regionProgress.completed = true;
                }
                progress[region] = regionProgress;
                return {
                    currentRegionFloor: nextFloor,
                    regionProgress: progress,
                    highestRegionFloorCleared: Math.max(state.highestRegionFloorCleared, nextFloor),
                };
            });
        },
        changeRegion: (regionId: string) => {
            set((state) => {
                const progress = state.regionProgress[regionId];
                if (!progress || !progress.unlocked) {
                    return {};
                }
                const def = getRegionDefinition(regionId);
                return {
                    currentRegionId: regionId,
                    currentRegionFloor: def.localFloorStart,
                    floor: (def.order - 1) * 50 + def.localFloorStart,
                };
            });
        },
        completeCurrentRegion: () => {
            set((state) => {
                const region = state.currentRegionId;
                const def = getRegionDefinition(region);
                const progress = { ...state.regionProgress };
                const regionProgress = { ...progress[region] };
                regionProgress.completed = true;
                regionProgress.highestLocalFloorCleared = def.localFloorEnd;
                const nextRegionId = def.nextRegionId;
                if (nextRegionId) {
                    const nextProgress = progress[nextRegionId]
                        ? { ...progress[nextRegionId] }
                        : { highestLocalFloorCleared: 0, unlocked: true, completed: false };
                    nextProgress.unlocked = true;
                    progress[nextRegionId] = nextProgress;
                }
                progress[region] = regionProgress;
                return {
                    regionProgress: progress,
                    highestRegionFloorCleared: Math.max(state.highestRegionFloorCleared, def.localFloorEnd),
                };
            });
        },
    });
};
