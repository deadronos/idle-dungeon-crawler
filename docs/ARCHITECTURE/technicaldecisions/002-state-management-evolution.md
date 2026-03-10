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
* `autoProgress`
* `combatLog`
* lightweight combat metadata such as `inCombat`, `bossFloor`, or `tickCount`

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

* `initializeParty(hero)`
* `toggleAutoAdvance()`
* `nextFloor()`
* `previousFloor()`
* `handlePartyWipe()`
* `appendCombatLog(message)`
* `stepSimulation(deltaMs)`
* `setActiveSection(section)`

The `stepSimulation` action delegates combat math and rules to pure engine helpers in `src/game/engine/simulation.ts`, keeping the store orchestration-focused rather than turning it into a monolithic rules file.

## Recommended Module Boundaries

The implementation is now split roughly as follows:

* `src/game/entity.ts` — entity construction and stat derivation
* `src/game/engine/` — pure combat helpers such as target selection, damage resolution, reward distribution, and tick stepping
* `src/game/store/` — `zustand` store setup, slice-oriented state types, provider compatibility, and selectors (currently split into `hotSimulationSlice.ts`, `progressionSlice.ts`, and `uiSlice.ts`)
* `src/components/` — UI that subscribes to narrow selectors instead of the whole game object

## Implementation Notes

The migration landed with a compatibility path:

* `GameProvider` still exists so the app root and existing tests can mount an isolated game instance per render.
* `useGame` is retained as a compatibility hook for legacy callers.
* New and migrated UI components subscribe through `useGameStore(selector)` so unrelated panels do not rerender on every ATB tick.

The first concrete UI slice stores section navigation (`dungeon` vs `shop`) separately from combat state, which keeps presentational concerns out of the simulation loop.

## Consequences

* **Easier:** Components such as the header gold display, shop panels, and combat log now subscribe only to the slices they actually render, reducing unrelated rerenders during combat ticks.
* **Easier:** The combat engine is more testable because simulation rules live in pure helpers and the store can be exercised directly without rendering React.
* **Easier:** The compatibility `GameProvider` keeps incremental rollout and test isolation straightforward while the rest of the codebase migrates to selector-based hooks.
* **Difficult:** `zustand` helps with subscription granularity, but it does not magically solve every architecture problem. If the combat model eventually grows into many orthogonal systems (auras, summons, projectiles, status effects), we should revisit whether an ECS architecture is justified at that time.
