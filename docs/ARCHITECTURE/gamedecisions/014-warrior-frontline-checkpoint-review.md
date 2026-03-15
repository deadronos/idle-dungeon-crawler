# 014 - Warrior Frontline Checkpoint Review

**Date:** 2026-03-15
**Status:** Snapshot

## Context

Issue [#92](https://github.com/deadronos/idle-dungeon-crawler/issues/92) asked for a post-progression re-check of Warrior-inclusive milestone pacing.

The concern was specific:

* early snapshots previously showed **Warrior + Cleric** trailing **Cleric + Archer** at some duo checkpoints
* later milestone walls risked reading as a Warrior/frontline tax rather than a broader pacing problem
* follow-up work on recovery, XP pacing, talent progression, and equipment progression could have already changed the answer enough that direct Warrior tuning was no longer justified

This review answers that question against the current branch state before adding any new Warrior-specific coefficient changes.

## Method

This report uses the balance harness in `src/game/engine/balanceSnapshot.ts` in two passes.

### 1. Canonical branch snapshot

The existing documented snapshot still uses the branch's standard **12 seeded runs** for:

* encounter-isolated milestone checks
* recovery-aware checkpoint climbs

Those are the same lenses described in [012 - Build-Aware Milestone Balance Baseline](012-build-aware-milestone-balance-baseline.md).

### 2. Cross-composition sanity pass

To answer Issue `#92` more directly, this review also ran **24 seeded expected-build comparisons** across additional plausible party compositions.

The comparison pass kept the same expected-build philosophy as the branch baseline:

* first copy of each class receives its simple class-aligned weapon + armor loadout
* duplicate classes receive the branch's current fallback accessory-style loadouts when unique main-slot gear is already claimed
* no hypothetical future items or talents were invented for the test

That means this report stays anchored to the current live catalog, not an imagined future armory.

## Canonical checkpoint signal

The current expected-build tables already show that the main early Warrior concern from Issue `#92` has been resolved.

| Scenario | Warrior-inclusive | Comparison party |
| --- | --- | --- |
| Floor `8`, level `4`, isolated | Warrior + Cleric `100%` | Cleric + Archer `100%` |
| Floor `10`, level `5`, isolated | Warrior + Cleric `91.7%` | Cleric + Archer `83.3%` |
| Floor `6 -> 8`, level `4`, recovery-aware | Warrior + Cleric `100%` | Cleric + Archer `100%` |
| Floor `8 -> 10`, level `5`, recovery-aware | Warrior + Cleric `100%` | Cleric + Archer `100%` |

The Warrior-led support duo is no longer behind the support/ranged duo at the targeted early milestone checks.

The same branch snapshot also still shows:

* isolated Floor `20` is healthy for Warrior-inclusive trio play (`100%` expected at level `11`, `91.7%` at level `12`)
* the live `19 -> 20` checkpoint still collapses to `0%`

That matters because it points away from a Warrior-specific isolated-fight weakness and back toward approach attrition.

## Cross-composition comparison

### Early duo checkpoints (`24` seeded runs, expected-build only)

| Scenario | Warrior + Cleric | Warrior + Archer | Cleric + Archer |
| --- | --- | --- | --- |
| Floor `8`, level `4`, isolated | `100%` | `25%` | `100%` |
| Floor `6 -> 8`, level `4`, recovery-aware | `100%` | `0%` | `100%` |
| Floor `10`, level `5`, isolated | `95.8%` | `0%` | `87.5%` |
| Floor `8 -> 10`, level `5`, recovery-aware | `100%` | `0%` | `100%` |

This sharpens the issue diagnosis:

* **Warrior + Cleric is competitive now**
* **Warrior + Archer is not**

The current weakness is therefore not "Warrior parties in general." It is specifically the no-healer Warrior/Archer pairing, which lacks the sustain and recovery smoothing that every successful duo in this test set uses.

### Late trio and slot-gate checkpoints (`24` seeded runs, expected-build only)

| Scenario | WCA | WCC | CCA | CAA | WAA |
| --- | --- | --- | --- | --- | --- |
| Floor `18`, level `10`, isolated | `0%` | `0%` | `0%` | `0%` | `0%` |
| Floor `16 -> 18`, level `10`, recovery-aware | `0%` | `0%` | `0%` | `0%` | `0%` |
| Floor `20`, level `11`, isolated | `100%` | `100%` | `100%` | `83.3%` | `0%` |
| Floor `19 -> 20`, level `11`, recovery-aware | `0%` | `0%` | `0%` | `0%` | `0%` |
| Floor `20`, level `12`, isolated | `95.8%` | `100%` | `100%` | `91.7%` | `0%` |
| Floor `19 -> 20`, level `12`, recovery-aware | `0%` | `0%` | `0%` | `0%` | `0%` |

Abbreviations:

* `WCA` = Warrior + Cleric + Archer
* `WCC` = Warrior + Cleric + Cleric
* `CCA` = Cleric + Cleric + Archer
* `CAA` = Cleric + Archer + Archer
* `WAA` = Warrior + Archer + Archer

The signal is consistent:

* Floor `18` is a structural wall for every tested trio, not a Warrior-only wall
* isolated Floor `20` is healthy for Warrior-inclusive support trios and at least competitive with non-Warrior alternatives
* the live `19 -> 20` climb fails for every tested trio, which again points to checkpoint attrition rather than Warrior coefficients

### Floor `28` slot-5 gate (`24` seeded runs, expected-build only)

| Scenario | Win rate |
| --- | --- |
| Warrior + Cleric + Cleric + Archer | `0%` |
| Cleric + Cleric + Archer + Archer | `0%` |
| Warrior + Cleric + Archer + Archer | `0%` |

The slot-5 wall remains fully structural under the current first-region pacing target.

## Findings

### 1. Issue `#92`'s primary early-warrior concern is no longer present

The important comparison in the issue body was Warrior-inclusive support play versus the previously stronger support/ranged duo.

On the current branch:

* expected-build **Warrior + Cleric** matches **Cleric + Archer** on the early recovery-aware checkpoints
* expected-build **Warrior + Cleric** slightly exceeds **Cleric + Archer** on the isolated Floor `10` boss check

That satisfies the core "keep Warrior parties competitive" goal for the targeted duo milestones.

### 2. The remaining weak Warrior lineup is composition-specific, not class-wide

**Warrior + Archer** and **Warrior + Archer + Archer** remain poor performers.

That does not read like a general Warrior tax. It reads like a deliberate cost of running a frontline-damage composition without Cleric sustain or a substitute support package.

If future balance work wants a no-healer Warrior rush composition to be viable, that should be treated as a separate composition-design task rather than as evidence that Warrior itself is undertuned.

### 3. The late failures remain structural and checkpoint-based

The current branch still shows the same broad pattern from the earlier balance report:

* Floor `18` is unwinnable across tested trio compositions even before composition-specific blame enters the picture
* the live `19 -> 20` checkpoint is unwinnable across tested trio compositions even though the isolated Floor `20` boss is healthy for several of them
* Floor `28` remains unwinnable across tested four-hero compositions

That is a pacing / slot-gate / checkpoint-attrition problem first.

### 4. Additional Warrior buffs would likely solve the wrong problem

Because Warrior-inclusive support comps are already strong in isolated Floor `20` tests, broad Warrior durability or damage buffs would most likely:

* over-reward already healthy Warrior + Cleric and Warrior + Cleric + Cleric compositions
* still fail to solve the live `19 -> 20` or `26 -> 28` checkpoint collapses, which affect non-Warrior groups too

That makes Warrior-specific retuning the wrong first lever on the current branch.

## Outcome

This review concludes that Issue `#92` is effectively resolved by the branch's existing recovery and progression changes.

### Recommended balance call

* **Do not add new Warrior-specific coefficient tuning on this branch**
* treat **Warrior + Cleric** as already competitive at the issue's targeted milestone checkpoints
* continue treating Floors `18`, `20`-approach, and `28` as structural pacing problems rather than Warrior/frontline identity problems

### Suggested follow-up focus

If more balance work is required after this branch, it should target:

* slot-gate pacing
* checkpoint approach attrition
* recovery/economy between milestone floors

not generic Warrior buffs.
