# 002 - State Management Evolution

**Date:** 2026-03-10
**Status:** Accepted

## Context

The original prototype kept all gameplay state inside a single React context provider in `src/game/gameState.tsx`. That worked for the initial scope: one hero, one to three enemies, a small number of panels, and a straightforward ATB loop.

However, the game loop updates ATB and resource bars every tick. That means React context consumers are observing hot simulation state directly, which will become progressively more expensive as we add:

* multiple heroes in the party
* resource-spending abilities
* buffs, debuffs, and status effects
* more UI panels subscribing to combat state
* meta-progression and upgrade systems

We want an incremental next step that preserves the current entity model and combat formulas while reducing unnecessary rerenders and separating engine logic from the UI.

## Decision

We moved hot gameplay state to **`zustand`**.

`zustand` was chosen because it offers:

1. **Selector-based subscriptions** so React components only rerender when the specific slice they use changes.
2. **Low ceremony** compared with Redux-class solutions, which keeps the codebase approachable for a small game project.
3. **A good fit for simulation-style updates** where the engine can mutate a draft-like next state and publish it once per tick.
4. **Incremental adoption** without forcing an immediate rewrite of the `Entity` model or combat formulas.

We are **not** adopting an ECS library such as `miniplex` at this stage. The current game model still does not have enough entity/component variety to justify that additional architectural complexity.

## Recommended Store Shape

We kept the domain model centered on `Entity`, while splitting the store by update frequency and responsibility.

### Hot simulation slice

State that changes on combat ticks and should be subscribed to selectively:

* `party`
* `enemies`
* `floor`
* `gold`
* `autoFight`
* `autoAdvance`
* `combatLog`
* `combatEvents`

### Progression and meta slice

State that changes less frequently and can remain decoupled from rendering-heavy combat updates:

* unlocks
* permanent upgrades
* prestige/meta currencies
* future inventory/equipment systems

### UI slice

State that is purely presentational and should not be mixed into the combat engine:

* selected entity panel
* open modals/drawers
* combat log filters
* animation or notification toggles

## Recommended Action Layout

The store exposes small, explicit actions rather than one giant reducer-shaped API.

Implemented high-level actions:

* `initializeParty(party)`
* `toggleAutoFight()`
* `toggleAutoAdvance()`
* `nextFloor()`
* `previousFloor()`
* `handlePartyWipe()`
* `appendCombatLog(message)`
* `stepSimulation(deltaMs)`
* `setActiveSection(section)`
* `reset(overrides?)`

The `stepSimulation` action delegates combat math and rules to pure engine helpers in `src/game/engine/`. `simulation.ts` remains the tick orchestrator and compatibility entrypoint for engine-facing imports, while focused modules such as `combatAi.ts`, `combatMath.ts`, `combatEvents.ts`, `encounter.ts`, `simulationDraft.ts`, `simulationProgression.ts`, `statusEffects.ts`, and `turnResolution.ts` own the extracted rule sets for targeting, combat math, draft cloning, post-victory transitions, and per-actor turn resolution. Progression actions likewise delegate purchase, recruitment, retirement, talent, equipment, inventory, and prestige state transitions to focused helpers re-exported through `src/game/progressionRules.ts`, while cost/query helpers still live in modules such as `upgrades.ts`, `partyProgression.ts`, and `equipmentProgression.ts`. Generic combat-log formatting now lives in `src/game/combatLog.ts` so progression and store code no longer depend on the simulation orchestrator just to prepend messages. This keeps the store orchestration-focused rather than turning it into a monolithic rules file.

## Recommended Module Boundaries

The implementation is now split roughly as follows:

* `src/game/entity.ts` — compatibility barrel over focused entity modules (`entity.types.ts`, `entity.status.ts`, `entity.enemies.ts`, `entity.combat.ts`, and `entity.factories.ts`)
* `src/game/heroBuilds.ts` — compatibility barrel over hero-build helpers, with equipment behavior further decomposed behind `src/game/heroBuilds/equipment.ts` into constants, catalog, instance, and query modules
* `src/game/combatLog.ts` — neutral combat-log formatting helpers shared by engine, progression, and store modules
* `src/game/engine/` — pure combat helpers plus the simulation orchestration surface, with `simulation.ts` coordinating tick entry/outcome flow and focused helpers handling target selection, damage resolution, status processing, encounter setup, reward distribution, combat-event presentation, per-actor turn resolution, and simulation draft cloning
* `src/game/progressionRules.ts` — compatibility barrel over focused progression/meta transitions for upgrades, hero management, talents, equipment, inventory, and prestige
* `src/game/store/` — `zustand` store setup, slice-oriented state types, provider compatibility, selectors, and persistence split into types/constants, validation, migrations, and serialization modules behind `src/game/store/persistence.ts`
* `src/components/` — UI that subscribes to narrow selectors instead of the whole game object, with large panels such as `PartyView` now acting as a thin selector wrapper over `src/components/party-view/CharacterSheet.tsx` and its focused stat, talent, and equipment panels

## Implementation Notes

The migration landed with a compatibility path:

* `GameProvider` still exists so the app root and existing tests can mount an isolated game instance per render.
* `useGame` is retained as a compatibility hook for tests and any remaining legacy callers, but production UI should prefer `useGameStore(selector)`.
* New and migrated UI components subscribe through `useGameStore(selector)` so unrelated panels do not rerender on every ATB tick.
* Browser-only persistence now hangs off the provider lifecycle: when no explicit `initialState` is supplied, the provider restores the latest autosave from `localStorage` and writes a fresh JSON save every 10 seconds.
* Save export/import now flows through an explicit versioned migration layer before runtime hydration. Older payloads are normalized into the current schema first, then handed to `reset(...)`, which keeps future additive progression systems from requiring one-off compatibility hacks in unrelated store code. The exported save version is derived from the migration plan itself so serializer and migrator stay aligned as the schema evolves.
* Large public modules that still serve as import anchors (`entity.ts`, `heroBuilds.ts`, `progressionRules.ts`, `persistence.ts`) now act as facades over narrower internal files so call sites can stay stable while implementation details remain easier to review and test.
* `PartyView.tsx` now stays intentionally small: it selects the active party roster and delegates hero build rendering to `CharacterSheet.tsx`, which in turn composes the focused `BasicStatsPanel`, `SecondaryStatsPanel`, `TalentsPanel`, and `EquipmentPanel` modules.

The first concrete UI slice stores section navigation (`dungeon`, `shop`, and `party`) separately from combat state, which keeps presentational concerns out of the simulation loop.
Save management stays outside the hot combat loop as well: export/import controls serialize the current playable `GameState` to a JSON file and feed imported saves back through `reset(...)`, so the store remains the single source of truth after deserialization.

## Consequences

* **Easier:** Components such as the header gold display, shop panels, and combat log now subscribe only to the slices they actually render, reducing unrelated rerenders during combat ticks.
* **Easier:** The combat engine is more testable because simulation rules live in pure helpers and the store can be exercised directly without rendering React.
* **Easier:** The compatibility `GameProvider` keeps incremental rollout and test isolation straightforward while the rest of the codebase migrates to selector-based hooks.
* **Difficult:** `zustand` helps with subscription granularity, but it does not magically solve every architecture problem. If the combat model eventually grows into many orthogonal systems (auras, summons, projectiles, status effects), we should revisit whether an ECS architecture is justified at that time.
