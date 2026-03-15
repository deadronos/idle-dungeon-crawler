# 008 - Hero Class Templates, Growth Packages, and Resource Models

**Date:** 2026-03-15
**Status:** Accepted

## Context

[007 - Layered Combat Model](007-layered-combat-model.md) established that class templates should answer how a character fights. Before this change, current hero identity was still split across multiple code branches:

* base attributes in hero construction
* level-up growth in combat reward logic
* resource setup in hero creation, wipe recovery, and per-tick updates
* combat action selection in simulation branches

That made current classes harder to reason about and left future classes with no single source of truth.

## Decision

Hero classes are now defined through explicit class templates. Each template owns:

* display metadata
* base attributes
* level-up growth package
* resource model
* baseline combat package
* current action-package identifier and passive hooks

The first implementation covers the shipped hero classes: `Warrior`, `Cleric`, and `Archer`.

### Template Shape

Each hero template includes:

* **Base attributes:** the level-1 starting identity package
* **Growth package:** the attribute increments applied on each level-up
* **Resource model:** resource type, starting state, maximum-resource formula inputs, per-tick regeneration, and any resource triggers such as on-hit or on-attack gains
* **Combat profile:** current basic-action identity, crit multiplier, physical damage source attribute, and baseline combat-rating tendencies
* **Action package:** the current package id plus the data needed for the package's shipped special actions or support actions

### Current Hero Packages

* **Warrior:** STR/VIT-heavy bruiser package with Rage-based burst and resource gains tied to combat participation
* **Cleric:** INT/WIS-heavy support package with Mana regeneration, triage healing, Bless/Regen support, and Light spell pressure
* **Archer:** DEX-heavy ranged package with fast Cunning regeneration and crit-oriented burst shots

### Scope Boundaries

This change does not make every future class completely declarative. Current class templates centralize identity and route the existing simulation through package ids, but additional action-package logic may still be added when a genuinely new class behavior is introduced.

That tradeoff is intentional for the first pass:

* adding another class with an existing package shape should mostly be data definition
* adding a truly new package shape may still require new simulation logic

### Relationship to Follow-up Work

This decision is the implementation follow-through for issue `#69`.

* `#69` centralizes current class identity into explicit templates
* `#70` will use those templates as one of the layered stat sources when combat ratings stop being mostly raw attribute products

## Consequences

* **Easier:** Current hero identity now has a single source of truth, which reduces drift between creation, leveling, resource behavior, and combat actions.
* **Easier:** Future classes can reuse the same template structure instead of duplicating hardcoded branches across unrelated systems.
* **Difficult:** The first pass still uses package-id-driven combat logic rather than a fully declarative skill engine, so template data and simulation behavior must stay aligned as new packages are introduced.
