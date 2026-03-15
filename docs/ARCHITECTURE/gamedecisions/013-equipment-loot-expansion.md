# 013 - Equipment Loot Expansion

**Date:** 2026-03-15
**Status:** Accepted

## Context

[009 - Differentiation MVP: Class Passives, Talents, Equipment, and Build Surfacing](009-differentiation-mvp-talents-equipment-and-build-surfacing.md) made equipment playable, but the first pass saturated too quickly:

* the armory started fully frontloaded
* duplicate-class parties could not reasonably share class-defining gear
* midgame pressure before Floors `18` and `28` needed more progression headroom
* future class planning wanted affinity metadata without a sprawling item spreadsheet

Issue `#90` expands that MVP into a progression layer that still fits the idle-game loop.

## Decision

Equipment now uses a persistent loot-and-stash model with tight scope:

* heroes still equip **4** slots: `weapon`, `armor`, `charm`, `trinket`
* gear drops as concrete item instances instead of being pre-stocked in a global catalog
* each item instance stores `definitionId`, `tier`, `rank`, sell value, and affinity tags
* milestone floors unlock stronger equipment tiers
* tiers widen the available rank range instead of introducing affix-heavy item generation
* bag overflow auto-sells for gold rather than blocking the run
* bag capacity grows through a small gold-purchased progression track inside the Party equipment UI

This keeps equipment readable while giving the dungeon climb a real reward loop.

## Loot Rules

The live drop model is intentionally compact:

* standard-floor victories drop **1** item
* boss-floor victories drop **2** items
* drop weighting favors the active party's class affinities, but universal items remain in the pool
* named class relics are allowed to drop multiple times
* milestone unlocks define the current top tier and rank band:
  * Tier `1`: start unlocked, Rank `1`
  * Tier `2`: clear Floor `3`, Rank `1-2`
  * Tier `3`: clear Floor `8`, Rank `2-3`
  * Tier `4`: clear Floor `16`, Rank `3-4`
  * Tier `5`: clear Floor `26`, Rank `4-5`

Boss drops bias toward the top rank in the currently unlocked tier.

## Persistence and UI

The canonical save shape for equipment is now:

* `inventoryItems`
* `equippedItemInstanceIdsByHeroId`
* `highestUnlockedEquipmentTier`
* `inventoryCapacityLevel`
* `inventoryCapacity`
* `nextInstanceSequence`

Legacy saves are migrated by converting old definition-id ownership into concrete rank-1 item instances.

The Party character sheet remains the primary equipment surface. The equipment tab now shows:

* equipped item tier/rank badges
* stash usage versus bag capacity
* bag-upgrade controls
* direct sell actions for unequipped gear

No separate top-level inventory page is introduced in this pass.

## Consequences

* **Easier:** equipment now contributes to ongoing progression instead of peaking at unlock time.
* **Easier:** duplicate-class parties can gear multiple heroes through repeated drops.
* **Easier:** future classes have affinity metadata available immediately.
* **Difficult:** later itemization work should preserve readability and avoid drifting into affix soup, bag micromanagement, or economy sprawl unless a new decision record explicitly widens scope.
