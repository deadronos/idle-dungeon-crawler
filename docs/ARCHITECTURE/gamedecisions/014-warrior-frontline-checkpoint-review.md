# 014 - Warrior Frontline Checkpoint Review

**Date:** 2026-03-15
**Status:** Snapshot

## Context

Issue [#92](https://github.com/deadronos/idle-dungeon-crawler/issues/92) asked for a post-progression re-check of Warrior-inclusive milestone pacing.

The concern was specific:

* early snapshots previously showed **Warrior + Cleric** trailing **Cleric + Archer** at some duo checkpoints
* later milestone walls risked reading as a Warrior/frontline tax rather than a broader pacing problem
* follow-up work on recovery, XP pacing, ranked talents, and equipment progression could have already changed the answer enough that direct Warrior tuning was no longer justified

This review answers that question against the current branch state before adding any new Warrior-specific coefficient changes.

## Method

This refresh uses the current canonical snapshot definitions in `src/game/engine/balanceSnapshot.ts` and the same **12 seeded runs** documented in [012 - Build-Aware Milestone Balance Baseline](012-build-aware-milestone-balance-baseline.md).

The important change is that the canonical late-floor assumptions are no longer the old uniform level-10 / level-11 / level-12 / level-13 parties.

The current review therefore reads Warrior performance against the refreshed mixed-level first-region assumptions instead:

* Floor `18`: Warrior / Cleric / Archer at levels `[13, 13, 12]`
* Floor `20`: Warrior / Cleric / Archer at levels `[13, 13, 13]`
* Floor `28`: Warrior / Cleric / Cleric / Archer at levels `[18, 18, 17, 16]`

This keeps the analysis aligned with the current XP curve, ranked-talent system, and staged equipment progression rather than the retired checkpoint assumptions.

## Canonical checkpoint signal

The refreshed expected-build tables still show that the main early Warrior concern from Issue `#92` is resolved.

| Scenario | Warrior-inclusive | Comparison party |
| --- | --- | --- |
| Floor `8`, level `4`, isolated | Warrior + Cleric `100%` | Cleric + Archer `100%` |
| Floor `10`, level `5`, isolated | Warrior + Cleric `100%` | Cleric + Archer `100%` |
| Floor `6 -> 8`, level `4`, recovery-aware | Warrior + Cleric `100%` | Cleric + Archer `100%` |
| Floor `8 -> 10`, level `5`, recovery-aware | Warrior + Cleric `100%` | Cleric + Archer `100%` |

The Warrior-led support duo is therefore no longer behind the support/ranged duo at the targeted early milestone checks.

The same refreshed snapshot also shows:

* isolated Floor `18` is healthy for the Warrior / Cleric / Archer trio at the new first-region expectation (`91.7%` expected build)
* the recovery-aware `16 -> 18` climb is also viable (`83.3%` expected build)
* the recovery-aware `19 -> 20` approach no longer collapses to `0%` and now lands at `66.7%`
* the remaining late Warrior-inclusive failure is the Floor `28` slot-5 gate, which remains `0%` in the recovery-aware lens

That points away from a Warrior-specific coefficient problem and toward the remaining slot-5 pacing problem.

## Interpretation

The old extended cross-composition tables are no longer the canonical evidence for this issue because they were generated against the retired low-level late-floor assumptions.

For the current branch, the canonical signal is already enough:

* Warrior-inclusive support lineups are healthy at the early duo milestones
* Warrior / Cleric / Archer is healthy at the refreshed Floor `18` and Floor `20` checkpoints
* the remaining late failure is shared by the slot-5 gate rather than uniquely by Warrior parties

In other words, the answer to Issue `#92` does not depend on inventing a new Warrior-only rescue test. The refreshed baseline already shows that Warrior support comps are competitive where the current branch intends them to be competitive.

## Findings

### 1. Issue `#92`'s primary early-warrior concern is no longer present

The important comparison in the issue body was Warrior-inclusive support play versus the previously stronger support/ranged duo.

On the current branch:

* expected-build **Warrior + Cleric** matches **Cleric + Archer** on the early recovery-aware checkpoints
* expected-build **Warrior + Cleric** is no worse than **Cleric + Archer** on the isolated Floor `10` boss check

That satisfies the core "keep Warrior parties competitive" goal for the targeted duo milestones.

### 2. The refreshed late-game evidence also points away from Warrior-specific blame

Under the current first-region expectation:

* Floor `18` is no longer a Warrior-inclusive failure case
* the live `19 -> 20` climb is no longer a universal collapse
* Floor `28` remains the late checkpoint that still fails, and it fails for structural pacing reasons rather than for a Warrior identity reason

That is a much cleaner answer than the earlier branch read.

### 3. Additional Warrior buffs would still solve the wrong problem

Because Warrior-inclusive support comps are already healthy at the refreshed milestone checks, broad Warrior durability or damage buffs would mostly:

* over-reward already successful Warrior + Cleric progressions
* leave the real late-region friction concentrated around the Floor `28` slot-5 gate

That still makes Warrior-specific retuning the wrong first lever on the current branch.

## Outcome

This review concludes that Issue `#92` is effectively resolved by the branch's existing recovery and progression changes.

### Recommended balance call

* **Do not add new Warrior-specific coefficient tuning on this branch**
* treat **Warrior + Cleric** as already competitive at the issue's targeted milestone checkpoints
* continue treating the remaining late pacing problem as a **Floor `28` slot-gate / region-end** problem rather than a Warrior/frontline identity problem

### Suggested follow-up focus

If more balance work is required after this branch, it should target:

* slot-gate pacing around Floor `28`
* quartet-endgame recovery / economy in the late first region
* any future region handoff expectations

not generic Warrior buffs.
