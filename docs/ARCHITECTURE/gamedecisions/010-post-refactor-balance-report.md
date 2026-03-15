# 010 - Post-Refactor Combat Identity Balance Report

**Date:** 2026-03-15
**Status:** Snapshot

## Context

This report is the balance-validation follow-up for umbrella issue `#65`.

The structural work from `#68` through `#74` changed where combat identity lives:

* attributes stay as broad foundation stats
* class templates now add explicit combat-rating bias packages
* passives, talents, and equipment can further differentiate the same shared combat layer

The remaining question was whether the runtime is actually healthier than the pre-refactor baseline rather than merely different.

## Method

The balance harness in `src/game/engine/balanceSnapshot.ts` compares:

1. **Pre-refactor baseline formulas** from tag `v0.0.2.a`
2. **Current post-refactor runtime** at `HEAD`
3. **Deterministic milestone simulations** using 12 seeded encounter runs per scenario

The snapshot intentionally mixes two lenses:

* **formula comparisons** for representative Warrior / Cleric / Archer identity
* **simulation pressure checks** for the milestone concerns originally captured in `#55`

## Identity Distribution Findings

### 1. Matched attributes no longer collapse almost every class into the same sheet

Using the same shared attributes (`VIT 8 / STR 6 / DEX 9 / INT 6 / WIS 6`):

| Class | Legacy result | Post-refactor result |
| --- | --- | --- |
| Warrior | same armor, same accuracy, same evasion, same magic damage as Cleric | clearly shifts into the armored / parry-facing role with the highest armor and parry |
| Cleric | same armor, same accuracy, same evasion, same physical damage as Warrior | becomes the strongest magic / resolve package instead of sharing a generic sheet |
| Archer | only distinct because `DEX` directly replaced `STR` for physical damage | keeps the highest accuracy, evasion, crit, and physical pressure without relying on raw `DEX` alone |

Before the refactor, matched attributes produced nearly identical Warrior and Cleric combat sheets and only left Archer ahead on direct ranged damage. After the refactor, the same stat line still resolves into clearly different frontline, caster-support, and precision-ranged identities.

### 2. A measurable share of class identity now comes from explicit template layers instead of raw attributes alone

Signature rating package bias share at level 1:

| Class | Signature rating package | Explicit template-bias share |
| --- | --- | --- |
| Warrior | `power`, `guard`, `haste` | `27.8%` |
| Cleric | `spellPower`, `precision`, `resolve`, `potency`, `crit` | `34.2%` |
| Archer | `power`, `precision`, `haste`, `potency`, `crit` | `39.4%` |

The pre-refactor model had no comparable template contribution: the share was effectively `0%` because final combat identity came straight from the five primary stats. This is the clearest measurable sign that attribute overloading has been reduced in practice rather than only renamed.

### 3. Base-class snapshots are healthier, but Warrior still pays more progression tax than the others

At level 1:

* **Warrior** gained better armor penetration and tenacity, plus slightly higher armor / physical damage than the legacy sheet.
* **Cleric** gained the strongest jump in magic damage and magical durability, and now carries real penetration / tenacity stats instead of only raw `INT` / `WIS`.
* **Archer** kept its precision edge, but no longer gets that identity entirely from `DEX`; the class template now contributes a large fraction of the package.

The remaining concern is not that Archer still owns precision; it is that Warrior-inclusive parties still underperform around progression spikes compared with Cleric + Archer pairings.

## Pressure Review Against Issue #55

### What improved

#### Parry asymmetry is no longer the leading systemic problem

The current runtime now allows heroes to parry melee enemy attacks while still preventing ranged physical attacks from being parried. That removes the earlier one-sided situation where parry mostly taxed Warriors without giving heroes equivalent defensive value.

#### The Floor 10 boss is no longer a near-automatic dead end for every duo

Deterministic seeded win-rate snapshot:

| Scenario | Legacy finding from `#55` | Current snapshot |
| --- | --- | --- |
| Floor 10, level 5 solo Warrior / Cleric / Archer | effectively `0%` | still `0%` across all three solo classes |
| Floor 10, level 5 duo | near `0%` | Warrior + Cleric `25%`, Cleric + Archer `33.3%` |

That is a real improvement, even if it is not yet comfortable. The slot-3 unlock moving to Floor 8 matters: the player can now reach the third-slot purchase gate before the Floor 10 boss rather than after it.

#### Early slot pressure is currently acceptable

| Scenario | Current snapshot |
| --- | --- |
| Floor 3 slot-2 gate, level 1 Warrior solo | `91.7%` |
| Floor 3 slot-2 gate, level 1 Cleric solo | `100%` |
| Floor 3 slot-2 gate, level 1 Archer solo | `91.7%` |
| Floor 8 slot-3 gate, level 4 Warrior + Cleric | `50%` |
| Floor 8 slot-3 gate, level 4 Cleric + Archer | `66.7%` |

Floor 8 is not free, but it is at least a plausible bridge into the third slot rather than a hard lock.

### What still looks risky

#### Floor 18 is the new clearest slot wall

| Scenario | Current snapshot |
| --- | --- |
| Floor 18 slot-4 gate, level 10 Warrior + Cleric + Archer | `0%` |

This lines up with the encounter-size rules: Floor 18 is a standard floor with **4 enemies**, but the player is still capped at **3 heroes** until after beating it. That reproduces the same structural pacing problem that earlier tuning tried to remove from the Floor 10 / slot-3 gate.

#### Floor 20 looks reasonable only if the player first overlevels past the Floor 18 wall

| Scenario | Current snapshot |
| --- | --- |
| Floor 20 boss, level 11 full trio | `16.7%` |
| Floor 20 boss, level 12 full trio | `75%` |

That suggests the boss itself is not the main long-term issue. The more dangerous pressure point is the Floor 18 slot gate that comes immediately beforehand.

#### Floor 28 repeats the same structural problem for slot 5

| Scenario | Current snapshot |
| --- | --- |
| Floor 28 slot-5 gate, level 13 Warrior + Cleric + Cleric + Archer | `0%` |

Floor 28 is another standard floor where encounter count has already grown beyond current capacity. Even before checking Floor 30, the slot-5 gate appears structurally overtuned.

#### Physical-frontline progress still lags magical / support-heavy pairings

At the two-hero checkpoints, Cleric + Archer outperforms Warrior + Cleric in the current seeded runs:

* Floor 8: `66.7%` vs `50%`
* Floor 10: `33.3%` vs `25%`

That is much better than the old “DEX solves everything” profile, but it still suggests Warrior-centered progression is paying extra tax at spike floors.

## Overall Assessment

The post-refactor combat identity model is healthier than the old baseline.

### Clear wins

* attribute overloading is materially reduced
* matched attributes now preserve class identity instead of collapsing most sheets together
* explicit template layers now contribute roughly a third to two-fifths of each class's signature combat package
* early progression pressure is better aligned with the slot-2 and slot-3 unlock path
* the old Floor 10 duo wall softened from “near impossible” to “dangerous but plausible”

### Remaining balance risks

* Floor 18 is now the largest progression wall because the player must beat a 4-enemy standard floor before unlocking hero capacity 4
* Floor 28 appears to repeat that same problem for the 5th slot
* Warrior-inclusive parties still lag caster / support-heavy pairings at spike floors
* solo boss progression remains intentionally harsh, but that means milestone tuning still depends heavily on duo / trio pacing staying healthy

## Recommended Follow-up Issues

1. **Retune slot-4 progression pressure**
   * either move the capacity-4 unlock earlier than Floor 18
   * or soften Floor 18 encounter pressure for 3-hero parties

2. **Retune slot-5 progression pressure**
   * revisit the Floor 28 gate before treating Floor 30 boss numbers as the primary problem

3. **Re-check Warrior spike-floor pacing**
   * focus on Warrior-inclusive duo / trio throughput and survivability rather than broad class reworks

These are focused tuning follow-ups, not a reason to revert the structural refactor. The model direction looks correct; the next work should target milestone pacing and Warrior-facing spike pressure.
