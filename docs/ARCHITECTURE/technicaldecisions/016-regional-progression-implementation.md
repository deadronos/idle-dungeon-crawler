# 016 - Regional Progression Implementation

**Date:** 2026-05-28
**Status:** Accepted

## Context

[015 - Regional Progression Architecture](015-regional-progression-architecture.md) defined the data model and runtime requirements for moving from an infinite global floor ladder to region-local floor bands. This decision records the actual implementation details and any deviations from the architecture spec.

## Implementation Summary

### 1. Region Data Model

Created `src/game/regions.ts` with:

- `RegionDefinition` — id, name, order, localFloorStart, localFloorEnd, backgroundAsset, enemyRoster, completionFloor, nextRegionId, statBandMultiplier
- `RegionProgress` — highestLocalFloorCleared, unlocked, completed
- `FloorContext` — regionId + localFloor (with optional globalFloor for convenience)
- Two shipped regions:
  - **Dank Cellar** (order 1, floors 1-50, statBandMultiplier 1.0)
  - **Forgotten Tunnels** (order 2, floors 1-50, statBandMultiplier 1.3, locked by default)

### 2. GameState Extension

Added to `GameState` / `ProgressionSlice` in `src/game/store/types.ts`:

- `currentRegionId: string`
- `currentRegionFloor: number`
- `regionProgress: Record<string, RegionProgress>`
- `highestRegionFloorCleared: number`

### 3. Region Zustand Slice

Created `src/game/store/regionSlice.ts` with actions:

- `advanceToNextFloor()` — increments local floor, updates progress, marks completion
- `changeRegion(regionId)` — switches active region (only if unlocked)
- `completeCurrentRegion()` — marks region done, unlocks next region

### 4. Region-Aware Encounter Generation

Refactored `src/game/engine/encounter.ts`:

- `isBossFloor`, `getEncounterSize`, `createEncounter` now accept `number | FloorContext`
- Backward-compatible: raw `floor: number` still works via overload
- Uses `context.localFloor` when FloorContext is provided

### 5. Persistence Migration

Added `SAVE_MIGRATIONS[5]` in `src/game/store/persistence.migrations.ts`:

- Maps legacy `floor` → `currentRegionFloor`
- Maps legacy `highestFloorCleared` → `regionProgress["dank cellar"].highestLocalFloorCleared`
- Initializes `currentRegionId: "dank cellar"`
- Bumps `GAME_STATE_EXPORT_VERSION` to 6

### 6. UI Integration

Updated `src/components/MainGameView.tsx`:

- Displays region name above floor number using `getRegionDefinition(currentRegionId).name`
- Gracefully handles undefined regionId during test hydration

## Deviations from Decision 015

1. **Milestone definitions** are not yet moved into `RegionDefinition`. The existing `progressionRules.party.ts` and `progressionRules.equipment.ts` still define milestones globally. Moving them into region definitions is planned for a follow-up that authors Region 2 content.

2. **Enemy roster** in `RegionDefinition` is currently a simple string array (family names). The actual encounter generation still uses the existing `getEncounterArchetypes()` logic based on local floor. Region-specific archetype pools and boss packages will be added when Region 2 content is authored.

3. **Background asset switching** is not yet wired. The `backgroundAsset` field exists on `RegionDefinition`, but `MainGameView` still uses the hardcoded `/assets/dungeon_bg.png`. Dynamic background switching will be implemented with the visual theme system.

4. **Region selection UI** is not yet implemented. The `changeRegion` action exists in the store, but there is no player-facing region picker. This is intentional — the scaffolding is in place, but the UI will be added when multiple unlocked regions are possible in normal gameplay.

## Save Compatibility

Old saves (versions 0-5) are automatically migrated on load:

- Legacy `floor` becomes `currentRegionFloor` in Dank Cellar
- Legacy `highestFloorCleared` becomes `highestLocalFloorCleared` for Dank Cellar
- `regionProgress` is created with Dank Cellar unlocked and Forgotten Tunnels locked

New saves (version 6+) include all region fields natively.

## Testing

- `src/game/regions.test.ts` — 3 tests for data model
- `src/game/store/regionSlice.test.ts` — 6 tests for slice actions
- `src/game/store/persistence.test.ts` — 12 tests (all passing with migration)
- All 280 existing tests continue to pass without modification

## Next Steps

1. Author Forgotten Tunnels enemy roster, bosses, and milestones
2. Implement region selection UI (dropdown or modal)
3. Wire dynamic background assets per region
4. Move milestone definitions into `RegionDefinition`
5. Add region-specific encounter scripts (elite variants, etc.)
