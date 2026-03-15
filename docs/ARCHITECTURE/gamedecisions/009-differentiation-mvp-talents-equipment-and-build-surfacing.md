# 009 - Differentiation MVP: Class Passives, Talents, Equipment, and Build Surfacing

**Date:** 2026-03-15
**Status:** Accepted

## Context

[007 - Layered Combat Model](007-layered-combat-model.md) established that long-term combat identity should come from layers above the five core attributes:

> final combat stats = core attributes + class template + talents + equipment + temporary effects

The codebase already reserved persistence space for `talentProgression` and `equipmentProgression`, but the runtime still lacked the first playable build-differentiation loop:

* hero classes had baseline identity through templates, but no explicit always-on passive package
* players could not spend level-earned build choices
* equipment existed only as a placeholder save container
* the dungeon roster tooltip did not yet surface the full combat-facing build story

That left the layered model conceptually accepted but not yet playable.

## Decision

We ship a narrow differentiation MVP built around three connected rules:

1. **Every hero class has an explicit always-on class passive**
2. **Heroes gain a small number of talent picks instead of a large tree**
3. **Heroes can equip up to four low-friction items from a persistent gear stash**

These systems all feed the same shared hero-build layer before final combat stats are recalculated.

### Class Passives

Each shipped hero class now has a named passive package that is always active:

* **Warrior - `Battle Rhythm`:** extra frontline `guard` / `power` plus bonus Rage on resolved attacks
* **Cleric - `Sanctified Reserves`:** stronger `resolve` / `spellPower` plus improved Bless regeneration support
* **Archer - `Keen Eye`:** stronger `precision` / `crit` plus extra crit pressure on burst shots

These passives are intentionally compact. They are not a second class-template system; they are the first explicit build-facing hook layered on top of templates.

### Talent MVP

The talent system stays intentionally small:

* each shipped class has **2** fixed talent choices
* each shipped talent has a fixed **3-rank** cap
* talents are permanent in the current save, but later points reinforce an existing talent instead of requiring a larger tree
* heroes earn talent points on each **even level** until their class talent-rank cap is filled
* talent points are stored per hero in `talentProgression.talentPointsByHeroId`
* talent ranks are stored per hero in `talentProgression.talentRanksByHeroId`

The live rank cadence for the shipped classes is therefore:

* `2` talents per class
* `3` ranks per talent
* `6` total spendable talent points per hero
* current point gains at levels `2`, `4`, `6`, `8`, `10`, and `12`

Rank behavior stays intentionally readable:

* **Rank 1** carries the main class-facing identity hook
* **Ranks 2 and 3** add lighter numeric reinforcement, with small capped riders only where the action package needs it
* burst, healing, crit, and resource hooks scale more conservatively than broad rating bonuses

The current shipped talents stay focused on combat ratings and existing action packages:

* **Warrior:** `Unyielding`, `Rampage`
* **Cleric:** `Sunfire`, `Shepherd`
* **Archer:** `Deadeye`, `Quickdraw`

This remains a compact build layer, not a branching tree, respec system, or long-form meta progression layer.

### Equipment MVP

Issue `#90` extends the original fixed-catalog MVP into a still-readable loot model.

The live equipment layer stays intentionally narrow:

* every hero has **4** slots: `weapon`, `armor`, `charm`, `trinket`
* equipment is stored as concrete item instances rather than shared definition ids
* victories award a small number of dropped items instead of filling a large catalog up front
* milestone floors unlock stronger equipment tiers, and tiers widen the available rank band
* weapons may be class-restricted; other slots are generally flexible
* duplicate drops are allowed, including named class relics
* item effects primarily add targeted combat-rating bonuses, with a small number of action or resource nudges
* one item can only be equipped by one hero at a time

Equipment ownership is persisted in `equipmentProgression`:

* `inventoryItems` stores concrete dropped gear instances with `definitionId`, `tier`, `rank`, sell value, and affinity tags
* `equippedItemInstanceIdsByHeroId` stores each hero's equipped item-instance ids
* `highestUnlockedEquipmentTier` tracks the current armory drop ceiling
* `inventoryCapacityLevel` / `inventoryCapacity` track bag growth and overflow rules

Inventory management remains intentionally low-friction:

* bag overflow auto-sells instead of blocking progress
* bag size grows through a small gold-purchased upgrade track
* equipment is still managed inside the Party character sheet rather than through a separate inventory screen

### Shared Build Layer

Passives, talents, and equipment all feed a single build-profile helper before derived stats are recalculated.

The current build layer can modify:

* combat-rating bonuses (`power`, `spellPower`, `precision`, `haste`, `guard`, `resolve`, `potency`, `crit`)
* special-attack cost or damage tuning on existing Warrior / Archer burst actions
* Cleric heal / Bless support tuning
* resource gain or max-resource nudges

This keeps build differentiation aligned with the layered-combat direction instead of introducing a parallel stat stack.

### UI Surfacing

The MVP uses two complementary surfaces:

* **Party -> character sheet tabs (`Talents` and `Equipment`):** the interaction surface for learning or upgrading talents and equipping gear
* **Dungeon roster tooltip and card metadata:** the read surface for combat ratings, passive identity, ranked talents, and equipped items

The roster tooltip now exposes:

* MVP combat ratings
* existing derived combat detail (`ACC`, `EVA`, `PAR`, `APEN`, `EPEN`, `TEN`)
* passive summary
* ranked talents (`Rank X / 3`)
* equipped items
* resistances and statuses

This keeps the build-management UI deliberate in the dedicated Party section while preserving in-combat readability.

## Consequences

* **Easier:** the layered-combat model is now playable instead of only aspirational.
* **Easier:** build identity lives in explicit definitions rather than scattered combat exceptions.
* **Easier:** save-compatible progression roots that were added earlier now have meaningful gameplay ownership.
* **Difficult:** later additions should extend this shared build layer instead of bypassing it with one-off combat branches or sprawling item systems.
