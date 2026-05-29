import { describe, expect, it } from "vitest";
import { createRegionSlice } from "./regionSlice";
import type { RegionSlice } from "./types";

const createMockStore = (initial: RegionSlice) => {
    let state = { ...initial } as Record<string, unknown>;
    const set = (fn: (s: typeof state) => Partial<typeof state>) => {
        const patch = fn(state);
        state = { ...state, ...patch };
    };
    const get = () => state as typeof state & RegionSlice;
    const slice = createRegionSlice(initial)(set, get);
    return { slice, getState: () => state as typeof state & RegionSlice };
};

describe("region slice", () => {
    it("should create a slice with default region state", () => {
        const { slice } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 1,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 0, unlocked: true, completed: false },
            },
            highestRegionFloorCleared: 0,
        });
        expect(slice.currentRegionId).toBe("dank cellar");
        expect(slice.currentRegionFloor).toBe(1);
    });

    it("advanceToNextFloor increments floor and updates progress", () => {
        const { slice, getState } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 5,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 5, unlocked: true, completed: false },
            },
            highestRegionFloorCleared: 5,
        });
        slice.advanceToNextFloor();
        expect(getState().currentRegionFloor).toBe(6);
        expect(getState().regionProgress["dank cellar"].highestLocalFloorCleared).toBe(6);
    });

    it("advanceToNextFloor marks region completed at completion floor", () => {
        const { slice, getState } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 49,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 49, unlocked: true, completed: false },
            },
            highestRegionFloorCleared: 49,
        });
        slice.advanceToNextFloor();
        expect(getState().currentRegionFloor).toBe(50);
        expect(getState().regionProgress["dank cellar"].completed).toBe(true);
    });

    it("changeRegion switches to an unlocked region", () => {
        const { slice, getState } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 10,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 10, unlocked: true, completed: false },
                "forgotten tunnels": { highestLocalFloorCleared: 0, unlocked: true, completed: false },
            },
            highestRegionFloorCleared: 10,
        });
        slice.changeRegion("forgotten tunnels");
        expect(getState().currentRegionId).toBe("forgotten tunnels");
        expect(getState().currentRegionFloor).toBe(1);
    });

    it("changeRegion does nothing for locked regions", () => {
        const { slice, getState } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 10,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 10, unlocked: true, completed: false },
                "forgotten tunnels": { highestLocalFloorCleared: 0, unlocked: false, completed: false },
            },
            highestRegionFloorCleared: 10,
        });
        slice.changeRegion("forgotten tunnels");
        expect(getState().currentRegionId).toBe("dank cellar");
    });

    it("completeCurrentRegion marks region completed and unlocks next region", () => {
        const { slice, getState } = createMockStore({
            currentRegionId: "dank cellar",
            currentRegionFloor: 50,
            regionProgress: {
                "dank cellar": { highestLocalFloorCleared: 50, unlocked: true, completed: false },
                "forgotten tunnels": { highestLocalFloorCleared: 0, unlocked: false, completed: false },
            },
            highestRegionFloorCleared: 50,
        });
        slice.completeCurrentRegion();
        expect(getState().regionProgress["dank cellar"].completed).toBe(true);
        expect(getState().regionProgress["forgotten tunnels"].unlocked).toBe(true);
    });
});
