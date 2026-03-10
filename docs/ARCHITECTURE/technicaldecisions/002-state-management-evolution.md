# 002 - State Management Evolution

**Date:** 2026-03-10
**Status:** Proposed

## Context

The current prototype keeps all gameplay state inside a single React context provider in `src/game/gameState.tsx`. This works well for the present scope: one hero, one to three enemies, a small number of panels, and a straightforward ATB loop.

However, the game loop updates ATB and resource bars every tick. That means React context consumers are observing hot simulation state directly, which will become progressively more expensive as we add:

* multiple heroes in the party
* resource-spending abilities
* buffs, debuffs, and status effects
* more UI panels subscribing to combat state
* meta-progression and upgrade systems

We want an incremental next step that preserves the current entity model and combat formulas while reducing unnecessary rerenders and separating engine logic from the UI.

## Decision

When the prototype expands past the current single-hero auto-battler scope, we should move hot gameplay state to **`zustand`**.

`zustand` is the preferred next step because it offers:

1. **Selector-based subscriptions** so React components only rerender when the specific slice they use changes.
2. **Low ceremony** compared with Redux-class solutions, which keeps the codebase approachable for a small game project.
3. **A good fit for simulation-style updates** where the engine can mutate a draft-like next state and publish it once per tick.
4. **Incremental adoption** without forcing an immediate rewrite of the `Entity` model or combat formulas.

We are **not** adopting an ECS library such as `miniplex` at this stage. The current game model does not yet have enough entity/component variety to justify that additional architectural complexity.

## Recommended Store Shape

We should keep the domain model centered on `Entity`, but split the store by update frequency and responsibility.

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

The store should expose small, explicit actions rather than one giant reducer-shaped API.

Suggested high-level actions:

* `initializeParty(hero)`
* `toggleAutoProgress()`
* `nextFloor()`
* `handlePartyWipe()`
* `appendCombatLog(message)`
* `stepSimulation(deltaMs)`

The `stepSimulation` action should delegate most math and rules to pure engine helpers so the store remains orchestration-focused rather than becoming a monolithic rules file.

## Recommended Module Boundaries

To keep the architecture readable, split the system roughly as follows:

* `src/game/entity.ts` — entity construction and stat derivation
* `src/game/engine/` — pure combat helpers such as target selection, damage resolution, reward distribution, and tick stepping
* `src/game/store/` — `zustand` store setup, slices, and selectors
* `src/components/` — UI that subscribes to narrow selectors instead of the whole game object

## Consequences

* **Easier:** Components such as `EntityRoster`, the header gold display, and the combat log can subscribe only to the state they actually render. This should reduce unnecessary rerenders as the game becomes more complex.
* **Easier:** The combat engine can become more testable because the rules can move into pure helper modules instead of living entirely inside a React effect.
* **Difficult:** We will need a careful migration path from the current `GameProvider` to the store to avoid breaking the prototype while features are still moving quickly.
* **Difficult:** `zustand` helps with subscription granularity, but it does not magically solve every architecture problem. If the combat model eventually grows into many orthogonal systems (auras, summons, projectiles, status effects), we should revisit whether an ECS architecture is justified at that time.