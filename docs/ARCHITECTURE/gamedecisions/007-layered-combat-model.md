# 007 - Layered Combat Model

**Date:** 2026-03-15
**Status:** Accepted

## Context

The current combat model still routes too much offensive, defensive, and status identity through the same five primary attributes. That has been workable for an early prototype, but it creates three growing problems:

* `DEX` and `WIS` each carry too many combat responsibilities at once
* current and future class identity risks collapsing into "which primary stat pipe is bigger"
* new systems such as talents and equipment would have no clean place to add targeted differentiation

Umbrella issue `#65` establishes the broader direction: keep the five core attributes, but move more final combat identity into layered secondary ratings, class templates, talents, equipment, and temporary effects.

## Decision

We accept a layered combat model with this rule:

> final combat stats = core attributes + class template + talents + equipment + temporary effects

This rule defines ownership, not just arithmetic. Core attributes stay broad and foundational. Later layers are responsible for the final shape of how a unit actually fights.

### Design Rule

**Attributes answer _what kind of character is this?_**

**Class templates, talents, equipment, and temporary effects answer _how does this character fight?_**

### MVP Secondary Ratings

The first layered pass standardizes the following combat-facing ratings:

* **`power`:** physical attack output and other non-spell damage scaling
* **`spellPower`:** spell damage, healing throughput, and other magic-side output scaling
* **`precision`:** offensive hit reliability and pressure against defensive avoidance
* **`haste`:** action speed and ATB pressure
* **`guard`:** physical durability package, especially armor-facing and parry-facing defense
* **`resolve`:** magical and mental durability package, especially resistance and tenacity-facing defense
* **`potency`:** bypass and status-pressure package, especially penetration and status application pressure
* **`crit`:** crit chance and crit bonus pressure

This is the accepted MVP vocabulary. Follow-up issues should reuse these names instead of inventing additional combat-facing ratings unless the MVP proves insufficient.

### Ownership Boundaries

The layered model changes which systems own final combat results:

* **Hit reliability** belongs primarily to `precision`
* **ATB speed** belongs primarily to `haste`
* **Crit chance and crit bonus pressure** belong primarily to `crit`
* **Physical mitigation and melee parry defense** belong primarily to `guard`
* **Magical resistance packages and tenacity-facing defense** belong primarily to `resolve`
* **Penetration and elemental status application pressure** belong primarily to `potency`
* **Damage and healing throughput** belong primarily to `power` and `spellPower`

Primary attributes still contribute to these ratings, but they should no longer be treated as the sole or dominant long-term source.

### What Stays Broadly Attribute-Facing

The layered pass does **not** remove the role of the five primary attributes. They remain the correct primary owner for:

* class baseline identity
* broad durability and resource tendencies
* baseline physical versus magical leaning
* level-up growth direction
* simple enemy generation inputs

### Bounded Formula Shapes to Preserve

Follow-up implementation issues should keep the existing bounded style of combat formulas even when the rating sources change:

* hit formulas stay contested and clamped
* parry stays limited to melee + physical defense and remains clamped
* penetration stays diminishing-return and capped
* tenacity stays diminishing-return and capped
* status application stays bounded and opposed rather than becoming an all-or-nothing immunity system

This keeps the combat model idle-readable and reduces runaway scaling risk.

### Current Runtime Baseline

Implementation issue `#70` now derives combat-facing outputs through the MVP layered ratings documented here. Attributes still seed those ratings, but the runtime now also applies template or archetype bias packages before converting them into final hit, speed, crit, penetration, resistance, and status-facing numbers. Existing formulas documented in [002 - Attributes and Derived Stats](002-attributes-and-stats.md) and [003 - Combat Loop and ATB Mechanics](003-combat-and-atb.md) are the canonical live baseline.

### Follow-up Issue Boundaries

This decision intentionally sets boundaries for the rest of the foundation work:

* **`#68`** defines the accepted model, names, ownership, and bounded formula direction
* **`#69`** defines class-template data modeling for base stats, growth, resources, and action packages, implemented in [008 - Hero Class Templates, Growth Packages, and Resource Models](008-hero-class-templates.md)
* **`#70`** refactors runtime derived stat sourcing and tunes coefficient-level formulas against the accepted model
* **`#71`** adds explicit versioned save migrations so new progression/combat fields remain backward-compatible

## Consequences

* **Easier:** Future classes gain a cleaner design space because class identity can live in templates and layered ratings instead of mostly in raw attribute emphasis.
* **Easier:** Talents and equipment now have a clear destination for targeted build differentiation without forcing a new set of primary attributes.
* **Easier:** The current runtime could transition incrementally because this record locked ownership and boundaries before coefficient-level refactors happened.
* **Difficult:** The system now has a stronger conceptual distinction between foundation stats and combat ratings, so docs and code must stay aligned as future tuning continues.
