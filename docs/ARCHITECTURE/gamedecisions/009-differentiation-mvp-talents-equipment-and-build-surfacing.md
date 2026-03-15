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
3. **Heroes can equip up to four low-friction items from a stocked armory**

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
* talents are permanent once learned in the current save
* heroes earn talent points at **level 2** and **level 4**
* talent points are stored per hero in `talentProgression.talentPointsByHeroId`
* learned talents are stored per hero in `talentProgression.unlockedTalentIdsByHeroId`

The current shipped talents stay focused on combat ratings and existing action packages:

* **Warrior:** `Unyielding`, `Rampage`
* **Cleric:** `Sunfire`, `Shepherd`
* **Archer:** `Deadeye`, `Quickdraw`

This is a build-pick MVP, not a branching tree, respec system, or long-form meta progression layer.

### Equipment MVP

Equipment also stays intentionally narrow:

* every hero has **4** slots: `weapon`, `armor`, `charm`, `trinket`
* the armory is stocked with a curated fixed inventory rather than random loot drops
* weapons may be class-restricted; other slots are generally flexible
* item effects primarily add targeted combat-rating bonuses, with a small number of action or resource nudges
* one item can only be equipped by one hero at a time

Equipment ownership is persisted in the existing `equipmentProgression` container:

* `inventoryItemIds` stores which stocked item ids exist in the save
* `equippedItemIdsByHeroId` stores each hero's equipped item ids

For the MVP, inventory management is intentionally low-friction: players choose from a stable stocked catalog instead of farming, sorting, or selling drops.

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

* **Party -> character sheet tabs (`Talents` and `Equipment`):** the interaction surface for learning talents and equipping gear
* **Dungeon roster tooltip and card metadata:** the read surface for combat ratings, passive identity, learned talents, and equipped items

The roster tooltip now exposes:

* MVP combat ratings
* existing derived combat detail (`ACC`, `EVA`, `PAR`, `APEN`, `EPEN`, `TEN`)
* passive summary
* learned talents
* equipped items
* resistances and statuses

This keeps the build-management UI deliberate in the dedicated Party section while preserving in-combat readability.

## Consequences

* **Easier:** the layered-combat model is now playable instead of only aspirational.
* **Easier:** build identity lives in explicit definitions rather than scattered combat exceptions.
* **Easier:** save-compatible progression roots that were added earlier now have meaningful gameplay ownership.
* **Difficult:** later additions should extend this shared build layer instead of bypassing it with one-off combat branches or sprawling item systems.
