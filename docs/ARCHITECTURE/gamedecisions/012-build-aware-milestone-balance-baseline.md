# 012 - Build-Aware Milestone Balance Baseline

**Date:** 2026-03-15
**Status:** Snapshot

## Context

[010 - Post-Refactor Combat Identity Balance Report](010-post-refactor-balance-report.md) proved that the layered combat model improved class identity and moved the most obvious progression wall away from the old Floor 10 dead-end.

Issue `#88` adds the next measurement layer: build-aware milestone snapshots that compare the same floor under three assumptions instead of only a no-build baseline.

After issue `#95` added **25% post-victory HP recovery** between encounters, this branch was revisited.

The original isolated-floor snapshot is still useful for measuring per-encounter combat pressure, but it no longer fully describes the live climb because party HP and combat momentum now carry across floor transitions.

The goal is still not to declare a new balance pass finished. It is to capture the pre-ranked-talent baseline that justified the next progression pass before follow-up issues extend equipment depth or retune slot-gate pacing.

This baseline should now be interpreted inside the current **first-region target band of Floors `1-50`** rather than as a forever-global floor expectation. For the current region, **Floors `30+` count as endgame**. Some farming of XP and items on safer floors is acceptable before breaching deeper late-region checkpoints or before a future region handoff exists.

## Method

The balance harness in `src/game/engine/balanceSnapshot.ts` now keeps **two lenses**, still using **12 seeded runs** per scenario:

1. **Encounter-isolated snapshots**
   * measure a single representative floor from a fresh full-HP start
2. **Recovery-aware checkpoint runs**
   * measure a short climb into that checkpoint while preserving:
     * surviving heroes' HP
     * between-floor 25% HP recovery
     * resource / combat momentum generated during earlier floors

Both lenses compare the same three deterministic build assumptions:

1. **`baseline`:** no learned talents and no equipped items
2. **`expectedBuild`:** a reasonable current-build state
   * one defining talent per hero
   * a simple class-aligned loadout, usually weapon + armor
   * fallback universal accessories when duplicate-class or party-size constraints prevent full class gear coverage
3. **`curatedBuild`:** a stronger but still plausible current-build state
   * all earned current talents learned
   * the strongest currently stocked loadout we can assign while respecting one-item-per-hero ownership

These scenarios intentionally capture the then-current live talent and armory rules rather than hypothetical future unlock systems.

The recovery-aware checkpoint runs use these ranges:

* Floor `6 -> 8` for the level `4` duo bridge
* Floor `8 -> 10` for the level `5` duo boss approach
* Floor `16 -> 18` for the level `10` slot-4 gate
* Floor `19 -> 20` for the level `11` and `12` trio boss approach
* Floor `26 -> 28` for the level `13` slot-5 gate

Floor `20` intentionally starts at `19` rather than `18` because Floor `18` is already the separate slot-4 structural gate tracked in the same report.

## Encounter-Isolated Snapshot

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

## Recovery-Aware Checkpoint Snapshot

| Scenario | `baseline` | `expectedBuild` | `curatedBuild` |
| --- | --- | --- | --- |
| Floor `6 -> 8`, level 4 Warrior + Cleric | `100%` | `100%` | `100%` |
| Floor `6 -> 8`, level 4 Cleric + Archer | `75%` | `100%` | `100%` |
| Floor `8 -> 10`, level 5 Warrior + Cleric | `75%` | `100%` | `100%` |
| Floor `8 -> 10`, level 5 Cleric + Archer | `41.7%` | `100%` | `91.7%` |
| Floor `16 -> 18`, level 10 Warrior + Cleric + Archer | `0%` | `0%` | `0%` |
| Floor `19 -> 20`, level 11 Warrior + Cleric + Archer | `0%` | `0%` | `0%` |
| Floor `19 -> 20`, level 12 Warrior + Cleric + Archer | `0%` | `0%` | `0%` |
| Floor `26 -> 28`, level 13 Warrior + Cleric + Cleric + Archer | `0%` | `0%` | `0%` |

## Findings

### 1. The build layer still does real work in both lenses

The live passives, talents, and stocked armory are not cosmetic.

Relative to the no-build baseline, even a modest expected build state dramatically improves:

* Floor 8 duo bridge pressure
* Floor 10 duo boss pressure
* isolated Floor 20 trio boss pressure

This is strong evidence that the current layered build model is already doing real gameplay work, not just surfacing flavor text.

### 2. Between-floor recovery meaningfully improves early duo climbs

The new checkpoint lens shows that partial recovery plus carried combat momentum makes the early bridge healthier than the isolated encounter table alone suggests:

* Warrior + Cleric improves from `50%` on isolated Floor `8` to `100%` across the full `6 -> 8` climb
* Warrior + Cleric improves from `25%` on isolated Floor `10` to `75%` across `8 -> 10`, even before talents or gear
* Cleric + Archer still benefits, but remains less stable on the same boss approach (`41.7%` baseline vs `100%` expected build)

This supports the design goal behind issue `#95`: recovery reduces the "one bad floor ends the run" feeling without removing the value of builds.

### 3. Floor 18 and Floor 28 remain structural walls, not build-optimization walls

The most important result is the absence of movement:

* Floor 18 stays `0%` across all three assumptions
* Floor 28 stays `0%` across all three assumptions

That isolates those two checkpoints as structural slot-gate problems first.

The current live build layer cannot overcome the fact that the player is still asked to clear a floor whose encounter count has already outgrown current party capacity.

### 4. Floor 20 is healthier as an isolated encounter than as a live checkpoint climb

This is the biggest new balance signal from revisiting the branch after partial recovery landed:

* isolated Floor `20` still looks promising (`100%` expected at level `11`, `91.7%` expected at level `12`)
* the actual `19 -> 20` climb collapses to `0%` across all three build assumptions at both tested levels

That means the current floor-20 boss is not the real problem in isolation.

The live problem is the combined attrition and pacing of the approach into that boss. Partial recovery helps earlier checkpoints, but it does not create enough recovery headroom to preserve the floor-20 promise seen in the isolated table.

### 5. The gap between `expectedBuild` and `curatedBuild` is still narrow

Once the player is using the current build systems correctly, there is still not much additional headroom left inside the current catalog:

* most early checkpoints collapse to the same result under `expectedBuild` and `curatedBuild`
* even where the recovery-aware run differs, the gap stays small (`100%` vs `91.7%` on the Cleric + Archer `8 -> 10` route)
* the late structural walls do not move at all

That is useful for planning.

It suggests the next build-progression work should focus less on squeezing more cleverness out of the current tiny catalog and more on extending the catalog itself:

* richer staged armory progression
* longer-lived talent progression
* more headroom before the system saturates

### 6. Issue `#89` should be tuned against the current first-region target, not an infinite-floor assumption

The late milestone snapshots in this document should now be read as part of the current first-region pacing target:

* the active balance target is Floors `1-50`
* Floors `30+` are endgame for that first region
* some farming of XP and items before breaching the deeper late-region floors is acceptable
* future regions can carry the next major difficulty jump instead of forcing one endless floor ladder to hold every future scaling need

That means Issue `#89` is still a real pacing problem, but the fix target is more specific than "every floor should be beaten immediately at near-identical level forever." The current work should instead make slot-4 and slot-5 progression feel fair inside the first-region band while preserving room for item farming, XP farming, and later cross-region systems.

## Outcome

The build-aware baseline clarifies the current state:

* the refactor direction is still correct
* the existing build layer already provides meaningful power when used
* between-floor recovery successfully softens early climb pressure
* later slot-gate walls are still primarily structural
* the live trio approach into Floor `20` is still a major pacing problem even after partial recovery
* the current build layer saturates quickly enough that future equipment and talent issues should be treated as progression-depth work, not only tuning garnish
* the current balance target is the first region's Floors `1-50`, with Floors `30+` treated as endgame rather than as the start of a forever-linear expectation

## Follow-up Alignment

This baseline directly supports the current follow-up issues:

* `#89` for slot-4 and slot-5 pacing
* `#90` for staged equipment progression
* `#91`, now implemented, for ranked talents and longer-lived talent progression grounded in this baseline
* `#92`, now reviewed in [014 - Warrior Frontline Checkpoint Review](014-warrior-frontline-checkpoint-review.md), for Warrior/frontline checkpoint validation against the stronger build-aware and recovery-aware baseline
