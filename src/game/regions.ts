export interface RegionDefinition {
  id: string;
  name: string;
  order: number;
  localFloorStart: number;
  localFloorEnd: number;
  backgroundAsset: string;
  enemyRoster: string[];
  completionFloor: number;
  nextRegionId: string | null;
  statBandMultiplier: number;
}

export interface RegionProgress {
  highestLocalFloorCleared: number;
  unlocked: boolean;
  completed: boolean;
}

export interface FloorContext {
  regionId: string;
  localFloor: number;
  globalFloor?: number;
}

const REGION_DEFINITIONS: Record<string, RegionDefinition> = {
  "dank cellar": {
    id: "dank cellar",
    name: "Dank Cellar",
    order: 1,
    localFloorStart: 1,
    localFloorEnd: 50,
    backgroundAsset: "/assets/dungeon_bg.png",
    enemyRoster: ["rat", "spider", "slime", "skeleton"],
    completionFloor: 50,
    nextRegionId: "forgotten tunnels",
    statBandMultiplier: 1.0,
  },
  "forgotten tunnels": {
    id: "forgotten tunnels",
    name: "Forgotten Tunnels",
    order: 2,
    localFloorStart: 1,
    localFloorEnd: 50,
    backgroundAsset: "/assets/dungeon_bg_region2.png",
    enemyRoster: ["bat", "goblin", "ooze", "wraith"],
    completionFloor: 50,
    nextRegionId: null,
    statBandMultiplier: 1.3,
  },
};

export const getRegionDefinition = (regionId: string): RegionDefinition => {
  const def = REGION_DEFINITIONS[regionId];
  if (!def) {
    throw new Error(`Unknown region: ${regionId}`);
  }
  return def;
};

export const getDefaultRegionProgress = (): Record<string, RegionProgress> => ({
  "dank cellar": {
    highestLocalFloorCleared: 0,
    unlocked: true,
    completed: false,
  },
  "forgotten tunnels": {
    highestLocalFloorCleared: 0,
    unlocked: false,
    completed: false,
  },
});

export const getStartingFloorContext = (): FloorContext => ({
  regionId: "dank cellar",
  localFloor: 1,
  globalFloor: 1,
});

export const getGlobalFloor = (context: FloorContext): number => {
  const def = getRegionDefinition(context.regionId);
  return (def.order - 1) * 50 + context.localFloor;
};
