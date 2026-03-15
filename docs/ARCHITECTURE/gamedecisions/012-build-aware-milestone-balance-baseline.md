# 012 - Build-Aware Milestone Balance Baseline

**Date:** 2026-03-15
**Status:** Snapshot

## Context

[010 - Post-Refactor Combat Identity Balance Report](010-post-refactor-balance-report.md) proved that the layered combat model improved class identity and moved the most obvious progression wall away from the old Floor 10 dead-end.

Issue `#88` adds the next measurement layer: build-aware milestone snapshots that compare the same floor under three assumptions instead of only a no-build baseline.

The goal is not to declare a new balance pass finished. It is to capture the current live baseline before follow-up issues extend equipment and talent progression or retune slot-gate pacing.

## Method

The balance harness in `src/game/engine/balanceSnapshot.ts` now checks representative milestone floors under three deterministic build assumptions, still using **12 seeded encounter runs** per scenario:

1. **`baseline`:** no learned talents and no equipped items
2. **`expectedBuild`:** a reasonable current-build state
   * one defining talent per hero
   * a simple class-aligned loadout, usually weapon + armor
   * fallback universal accessories when duplicate-class or party-size constraints prevent full class gear coverage
3. **`curatedBuild`:** a stronger but still plausible current-build state
   * all earned current talents learned
   * the strongest currently stocked loadout we can assign while respecting one-item-per-hero ownership

These scenarios intentionally use the current live talent and armory rules rather than hypothetical future unlock systems.

## Snapshot

| Scenario | `baseline` | `expectedBuild` | `curatedBuild` |
| --- | --- | --- | --- |
| Floor 8, level 4 Warrior + Cleric | `50%` | `100%` | `100%` |
| Floor 8, level 4 Cleric + Archer | `66.7%` | `100%` | `100%` |
| Floor 10 boss, level 5 Warrior + Cleric | `25%` | `91.7%` | `100%` |
| Floor 10 boss, level 5 Cleric + Archer | `33.3%` | `83.3%` | `100%` |
| Floor 18 slot-4 gate, level 10 Warrior + Cleric + Archer | `0%` | `0%` | `0%` |
| Floor 20 boss, level 11 Warrior + Cleric + Archer | `16.7%` | `100%` | `100%` |
| Floor 20 boss, level 12 Warrior + Cleric + Archer | `75%` | `91.7%` | `100%` |
| Floor 28 slot-5 gate, level 13 Warrior + Cleric + Cleric + Archer | `0%` | `0%` | `0%` |

## Findings

### 1. The current build layer already matters a lot at early and mid-boss checkpoints

The live passives, talents, and stocked armory are not cosmetic.

Relative to the no-build baseline, even a modest expected build state dramatically improves:

* Floor 8 duo bridge pressure
* Floor 10 duo boss pressure
* Floor 20 trio boss pressure

This is strong evidence that the current layered build model is already doing real gameplay work, not just surfacing flavor text.

### 2. Floor 18 and Floor 28 remain structural walls, not build-optimization walls

The most important result is the absence of movement:

* Floor 18 stays `0%` across all three assumptions
* Floor 28 stays `0%` across all three assumptions

That isolates those two checkpoints as structural slot-gate problems first.

The current live build layer cannot overcome the fact that the player is still asked to clear a floor whose encounter count has already outgrown current party capacity.

### 3. The gap between `expectedBuild` and `curatedBuild` is already narrow

Once the player is using the current build systems correctly, there is not much additional headroom left inside the current catalog:

* Floor 8 collapses to the same result under `expectedBuild` and `curatedBuild`
* Floor 20, level 11 also collapses to the same result
* Floor 10 and Floor 20, level 12 show only a small remaining optimization gap

That is useful for planning.

It suggests the next build-progression work should focus less on squeezing more cleverness out of the current tiny catalog and more on extending the catalog itself:

* richer staged armory progression
* longer-lived talent progression
* more headroom before the system saturates

## Outcome

The build-aware baseline clarifies the current state:

* the refactor direction is still correct
* the existing build layer already provides meaningful power when used
* later slot-gate walls are still primarily structural
* the current build layer saturates quickly enough that future equipment and talent issues should be treated as progression-depth work, not only tuning garnish

## Follow-up Alignment

This baseline directly supports the current follow-up issues:

* `#89` for slot-4 and slot-5 pacing
* `#90` for staged equipment progression
* `#91` for ranked talents and longer-lived talent progression
* `#92` for Warrior/frontline checkpoint review against the stronger build-aware baseline
