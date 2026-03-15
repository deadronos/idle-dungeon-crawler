# 011 - Future Class Extensibility Proof: Rogue Spec

**Date:** 2026-03-15
**Status:** Snapshot

## Context

[007 - Layered Combat Model](007-layered-combat-model.md), [008 - Hero Class Templates, Growth Packages, and Resource Models](008-hero-class-templates.md), and [009 - Differentiation MVP: Class Passives, Talents, Equipment, and Build Surfacing](009-differentiation-mvp-talents-equipment-and-build-surfacing.md) moved class identity into explicit layers above the five core attributes.

The remaining question from umbrella issue `#65` was whether that structure can host a believable future class without collapsing back into "which primary stat scales harder" or requiring a broad runtime rewrite before class work even begins.

This note uses a non-shipped **Rogue** as the proof exercise.

## Proof Exercise

The Rogue is a good architectural test because it should feel distinct for more than raw `DEX`:

* fast tempo and initiative pressure
* burst windows through a named opener rather than only basic attacks
* opportunistic crit / penetration lean
* light-armor, finesse-weapon equipment preferences

That identity should come from the existing layers:

> final combat stats = core attributes + class template + talents + equipment + temporary effects

## Rogue Spec Against the Current Model

### 1. Core Attribute Lean

The Rogue can stay broad and readable at the attribute layer:

* **Primary:** `DEX`
* **Secondary:** `WIS`
* **Tertiary:** `VIT`
* **De-emphasized:** `STR`, `INT`

Example template direction:

* **Base attributes:** `VIT 7 / STR 4 / DEX 11 / INT 4 / WIS 6`
* **Growth:** `VIT +1 / STR +1 / DEX +2 / INT +1 / WIS +1`

This keeps attributes responsible for the character's physical quickness and baseline fragility, not for the full shape of Rogue combat identity.

### 2. Baseline Role Ratings

The current combat-rating vocabulary can already describe the Rogue cleanly:

* **`precision`:** clean opener reliability
* **`haste`:** first-strike and turn-cycling pressure
* **`crit`:** burst payoff
* **`potency`:** bypass / dirty-fighting pressure
* **light `power`:** enough weapon threat to keep melee hits relevant
* **lower `guard` / moderate `resolve`:** evasive skirmisher instead of bruiser

Example rating-bias package:

* `power +3`
* `precision +8`
* `haste +7`
* `potency +6`
* `crit +7`

This is already meaningfully different from Archer. Archer stays the ranged precision class, while Rogue would spend those same ratings on melee burst timing and opportunistic pressure.

### 3. Resource / Template Direction

The current template model is already sufficient for a first Rogue pass:

* **Resource model:** reuse **Cunning**
* **Starts full:** yes
* **Regeneration:** flat regeneration is acceptable for a first skirmisher pass
* **Physical damage source attribute:** `DEX`
* **Basic action:** melee physical strike
* **Crit multiplier:** elevated, similar to or slightly above Archer

That means a first Rogue does **not** need a new primary stat, a new combat-rating family, or a new resource system just to exist.

### 4. Passive / Talent Direction

The current shared build layer can express the first Rogue package without inventing a second parallel system.

#### Candidate passive

**`Opportunist`**

* always-on `crit +2`, `potency +2`
* extra resource on resolved attack to keep burst windows cycling

That fits the existing passive/build-effect model directly through rating bonuses plus `resourceOnResolvedAttackBonus`.

#### Candidate talent directions

* **`Ambush`:** improve the class burst action through `specialAttackDamageMultiplierBonus` and a small `specialAttackCostDelta`
* **`Footwork`:** add `haste`, `precision`, and a little `guard` for a safer skirmisher line

These choices already fit the current talent schema because the build layer can modify:

* rating bonuses
* burst-action cost
* burst-action damage
* burst-action crit pressure

The first Rogue therefore gains class identity from template + passive + talent interaction, not from attributes alone.

### 5. Equipment Affinities

The current equipment layer can already support likely Rogue preferences:

* **Weapon affinity:** daggers, short blades, or other Rogue-only finesse weapons
* **Armor affinity:** light leathers favoring `haste`, `precision`, and `crit`
* **Charm / trinket affinity:** dirty-fighting or execution pieces leaning into `potency`, `crit`, or burst-cost reduction

The important proof is that these are not just cosmetic tags. The current equipment effect model can already reinforce the Rogue plan through the same shared rating and burst-action hooks used by shipped classes.

## What This Exercise Proves Cleanly

The current architecture already gives a future class a clean home for:

* broad attribute lean
* baseline combat identity through template rating biases
* always-on passive identity
* compact talent differentiation
* equipment-facing build reinforcement

That is enough to prove the project is **not** limited to "Warrior / Cleric / Archer, but with different stat spreads."

## Gaps Found Early

The proof exercise also exposed the remaining extension points that are still narrow or partly hardcoded.

### 1. New action packages still need explicit runtime support

`src/game/classTemplates.ts` restricts `HeroActionPackageId` to the shipped ids, and `src/game/engine/simulation.ts` still switches on those ids for non-basic actions.

Implication:

* a Rogue with a named burst action such as **Backstab** is still a small, localized runtime addition
* the rest of the class identity can stay data-driven

This is acceptable for now, but future class work should keep new behavior isolated to package execution instead of leaking back into attributes or unrelated systems.

### 2. `passiveHooks` are descriptive today, not executable hooks

Templates already carry `actionPackage.passiveHooks`, but the current runtime does not consume those strings directly.

Implication:

* they are useful documentation and intent markers
* they are not yet a true declarative extension surface for combat logic

If later class work wants package logic to become more data-driven, this field is the natural place to formalize that.

### 3. Equipment affinity metadata now exists, but soft-affinity depth is still shallow

The current equipment model now supports:

* class-restricted items
* repeated item drops with tier/rank scaling
* affinity tags on item families and item instances

What it still does **not** model deeply:

* richer weighting across more specific weapon families
* affinity-aware drop tuning for future classes beyond the current light tag set
* stronger soft-affinity rules such as "Rogue strongly prefers haste leathers" without hard-locking other gear

That keeps Rogue implementation unblocked, but the affinity layer should grow if future classes need sharper item-family identity than the current tags provide.

### 4. Status-heavy or utility-heavy Rogue variants would need more hooks

A first burst Rogue fits now. A later poison / stealth / self-buff Rogue would likely want:

* richer status-delivery hooks from passives or talents
* self-buff or stance support beyond today's narrow heal / bless / burst action package shapes

This is the same architectural boundary that would affect Mage- or Necromancer-style future classes. The layered identity model is ready; the action-execution surface is the part that still needs incremental expansion.

## Test Hooks for a Future Rogue Implementation

No shipped gameplay change is required for this proof note, but a real Rogue implementation should add focused tests for:

1. **Template derivation coverage**
   * Rogue template ratings and derived stats differ meaningfully from Archer on matched attributes
2. **Action-package execution**
   * Rogue burst action spends resource, uses the expected damage path, and respects melee/parry rules
3. **Build-layer composition**
   * passive + talent + equipment bonuses stack through `getHeroBuildProfile` and `getCombatRatings`
4. **Roster/UI surfacing**
   * Rogue passive, talents, and equipment display correctly in Party character-sheet tabs and roster details
5. **Balance harness snapshots**
   * add Rogue milestone snapshots only once the class is actually shipped

## Outcome

The proof succeeds.

The current combat identity architecture can already describe a believable future class through:

* template-defined broad stats and combat lean
* layered rating biases
* passives
* talents
* equipment hooks

The main remaining work for genuinely new classes is no longer "invent a new stat model." It is the smaller and more appropriate problem of extending action-package execution when a class needs behavior that current burst/heal/bless branches do not already cover.
