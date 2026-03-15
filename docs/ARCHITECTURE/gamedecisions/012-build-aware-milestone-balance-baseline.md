# 012 - Build-Aware Milestone Balance Baseline

**Date:** 2026-03-15
**Status:** Snapshot

## Context

[010 - Post-Refactor Combat Identity Balance Report](010-post-refactor-balance-report.md) proved that the layered combat model improved class identity and moved the most obvious progression wall away from the old Floor 10 dead-end.

Issue `#88` added the next measurement layer: build-aware milestone snapshots that compare the same floor under three assumptions instead of only a no-build baseline.

This document was later refreshed after the follow-up progression pass landed:

* issue `#90` expanded staged equipment progression
* issue `#91` added ranked talents
* issue `#95` added **25% post-victory HP recovery** between encounters
* the first-region pacing direction explicitly moved to **"Floors `1-50`, with Floors `30+` treated as endgame"** and allowed reasonable XP / loot farming before deeper checkpoints

That means the old late-floor assumptions in this report were no longer canonical. Measuring Floor `18` with a uniform level-10 trio and Floor `28` with a level-13 quartet understated the current live progression target.

The refreshed harness therefore uses **mixed recruit-cadence party levels**, current ranked-talent expectations, and current equipment tier/rank assumptions.

## Method

The balance harness in `src/game/engine/balanceSnapshot.ts` keeps **two lenses**, still using **12 seeded runs** per scenario:

1. **Encounter-isolated snapshots**
   * measure a single representative floor from a fresh full-HP start
2. **Recovery-aware checkpoint runs**
   * measure a short climb into that checkpoint while preserving:
     * surviving heroes' HP
     * between-floor 25% HP recovery
     * resource / combat momentum generated during earlier floors

Both lenses compare the same three deterministic build assumptions:

1. **`baseline`:** no learned talents and no equipped items
2. **`expectedBuild`:** a reasonable current-build state for that milestone
   * early duos use one defining rank-2 talent and simple weapon + armor setups
   * late trios / quartets use both class talents at rank 3 and milestone-appropriate tiered gear
3. **`curatedBuild`:** a stronger but still plausible stocked-build state
   * same earned talents as `expectedBuild`
   * fuller accessory coverage and higher tier/rank rolls from the currently unlocked armory

The late-game snapshots now use the recruit-cadence party levels implied by the current first-region XP curve:

* Floor `18` gate: Warrior / Cleric / Archer at levels `[13, 13, 12]`
* Floor `20` boss: Warrior / Cleric / Archer at levels `[13, 13, 13]`
* Floor `28` gate: Warrior / Cleric / Cleric / Archer at levels `[18, 18, 17, 16]`

The recovery-aware checkpoint runs use these ranges:

* Floor `6 -> 8` for the level `4` duo bridge
* Floor `8 -> 10` for the level `5` duo boss approach
* Floor `16 -> 18` for the `[13, 13, 12]` trio slot-4 gate
* Floor `19 -> 20` for the `[13, 13, 13]` trio boss approach
* Floor `26 -> 28` for the `[18, 18, 17, 16]` quartet slot-5 gate

Floor `20` intentionally still starts at `19` rather than `18` because Floor `18` remains the separate slot-4 structural gate tracked in the same report.

## Encounter-Isolated Snapshot

| Scenario | `baseline` | `expectedBuild` | `curatedBuild` |
| --- | --- | --- | --- |
| Floor 8, level 4 Warrior + Cleric | `50%` | `100%` | `100%` |
| Floor 8, level 4 Cleric + Archer | `66.7%` | `100%` | `100%` |
| Floor 10 boss, level 5 Warrior + Cleric | `25%` | `100%` | `100%` |
| Floor 10 boss, level 5 Cleric + Archer | `33.3%` | `100%` | `100%` |
| Floor 18 gate, levels `[13, 13, 12]` Warrior + Cleric + Archer | `0%` | `91.7%` | `75%` |
| Floor 20 boss, levels `[13, 13, 13]` Warrior + Cleric + Archer | `100%` | `100%` | `100%` |
| Floor 28 gate, levels `[18, 18, 17, 16]` Warrior + Cleric + Cleric + Archer | `0%` | `8.3%` | `8.3%` |

## Recovery-Aware Checkpoint Snapshot

| Scenario | `baseline` | `expectedBuild` | `curatedBuild` |
| --- | --- | --- | --- |
| Floor `6 -> 8`, level 4 Warrior + Cleric | `100%` | `100%` | `100%` |
| Floor `6 -> 8`, level 4 Cleric + Archer | `75%` | `100%` | `100%` |
| Floor `8 -> 10`, level 5 Warrior + Cleric | `83.3%` | `100%` | `100%` |
| Floor `8 -> 10`, level 5 Cleric + Archer | `50%` | `100%` | `100%` |
| Floor `16 -> 18`, levels `[13, 13, 12]` Warrior + Cleric + Archer | `0%` | `83.3%` | `75%` |
| Floor `19 -> 20`, levels `[13, 13, 13]` Warrior + Cleric + Archer | `0%` | `66.7%` | `66.7%` |
| Floor `26 -> 28`, levels `[18, 18, 17, 16]` Warrior + Cleric + Cleric + Archer | `0%` | `0%` | `0%` |

## Findings

### 1. The build layer still does real work in both lenses

The live passives, ranked talents, and staged armory are not cosmetic.

Relative to the no-build baseline, even the expected build state dramatically improves:

* Floor 8 duo bridge pressure
* Floor 10 duo boss pressure
* the Floor 18 trio gate
* the Floor 19 -> 20 trio approach

That keeps Issue `#88`'s original conclusion intact: the layered build model is already doing real gameplay work.

### 2. The old Floor 18 and Floor 20 walls were partly snapshot-assumption walls

The most important change in this refresh is methodological.

Under the old late-floor assumptions, the harness was effectively asking under-leveled parties to prove a pacing point the current first-region design no longer expects.

With the refreshed mixed party levels:

* isolated Floor `18` moves from the old `0%` framing to `91.7%` expected / `75%` curated
* the recovery-aware `16 -> 18` climb moves to `83.3%` expected / `75%` curated
* the recovery-aware `19 -> 20` climb is no longer a universal collapse and now lands at `66.7%`

That means slot-4 pacing is no longer best described as an unwinnable structural wall under current progression expectations.

### 3. Floor 28 remains the real structural gate

The updated quartet assumption does not fully rescue the slot-5 checkpoint:

* isolated Floor `28` only reaches `8.3%` under both build-aware variants
* the full `26 -> 28` recovery-aware climb remains `0%`

That keeps the late first-region slot-5 gate as the clearest remaining structural pacing problem.

### 4. `expectedBuild` and `curatedBuild` are not guaranteed to be strictly monotonic

The refreshed tables show an important nuance:

* `curatedBuild` is often equal to `expectedBuild`
* at Floor `18`, the curated loadout is actually slightly worse than the expected loadout

This is acceptable.

The curated setups reflect plausible stocked gear swaps, not an oracle-best optimizer. A more defensive accessory substitution can trade away tempo or damage even while being a "richer" inventory state.

### 5. Issue `#89` should now focus on slot-5 fairness inside the first region

The late milestone snapshots in this document should be read as part of the active first-region pacing target:

* the balance target is Floors `1-50`
* Floors `30+` are endgame for that first region
* some farming of XP and items before breaching the deepest checkpoints is acceptable

That narrows Issue `#89`'s remaining scope.

The most urgent fairness problem is no longer "Floor 18 at level 10" or "Floor 20 at level 11." It is the still-punishing transition into the slot-5 region gate around Floor `28`.

## Outcome

The refreshed build-aware baseline clarifies the current state:

* the refactor direction is still correct
* the current build layer already provides meaningful power when used
* between-floor recovery successfully softens early climb pressure
* realistic first-region leveling removes the old artificial Floor `18` / Floor `20` snapshot wall conclusions
* the main remaining structural pacing problem is the Floor `28` slot-5 gate
* the current balance target is the first region's Floors `1-50`, with Floors `30+` treated as endgame rather than as the start of a forever-linear expectation

## Follow-up Alignment

This refreshed baseline now reflects the decisions made in the follow-up issues themselves:

* `#89` remains open as primarily a slot-5 pacing problem inside the first region
* `#90` is represented through tiered and ranked equipment assumptions in the harness
* `#91` is represented through ranked talent assumptions in the harness
* `#92`, re-read against this updated baseline in [014 - Warrior Frontline Checkpoint Review](014-warrior-frontline-checkpoint-review.md), no longer points toward Warrior-specific tuning as the first lever
