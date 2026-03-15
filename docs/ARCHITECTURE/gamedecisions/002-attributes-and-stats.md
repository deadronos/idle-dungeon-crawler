# 002 - Attributes and Derived Stats

**Date:** 2026-03-10
**Status:** Accepted

## Context

As defined in [001 - Player Classes and Party System](001-player-classes.md), units in our game have a shared pool of core attributes that establish class identity and support simple enemy generation. That baseline worked, but the combat model gradually pushed too much long-term combat identity into the same five numbers.

As of the layered combat pass documented in [007 - Layered Combat Model](007-layered-combat-model.md), these primary attributes remain foundational, but they are no longer the intended long-term owner of every combat output. This record now documents:

* the broad identity role of the five primary attributes
* the current live runtime formulas that still ship today
* which outputs stay primarily attribute-facing versus which outputs are accepted as layered-rating-facing going forward

## Decision

We keep five core attributes as the foundation for hero identity, class flavor, and baseline scaling:

* **Constitution (VIT):** Governs health, survivability, and the physical sturdiness baseline.
* **Strength (STR):** Measures physical force and contributes to melee-facing offense and durability.
* **Dexterity (DEX):** Reflects agility, coordination, and baseline action speed.
* **Intelligence (INT):** Governs magical throughput and caster resource baselines.
* **Wisdom (WIS):** Governs magical steadiness, resistance baselines, and support-oriented sustain.

The layered-model rule is:

> Attributes answer **what kind of character is this?**
> Templates, talents, equipment, and temporary effects answer **how does this character fight?**

### Starting Attribute Templates

Each hero class begins with a predefined spread of core attributes. These values still matter because they establish the class baseline before level-up growth and later layered systems apply:

* **Warrior:** VIT 10, STR 10, DEX 5, INT 3, WIS 3
* **Cleric:** VIT 7, STR 4, DEX 4, INT 8, WIS 10
* **Archer:** VIT 6, STR 5, DEX 12, INT 4, WIS 4

Monsters use a simple base of 5 in each attribute before floor scaling and archetype bias are applied. This keeps encounter generation cheap, deterministic, and readable.

### What Stays Attribute-Facing

The following outputs remain broadly primary-attribute-facing even as the combat model layers additional sources on top:

* baseline HP and durability tendency
* baseline physical versus magical leaning
* baseline resource pools and regeneration tendencies
* class identity at hero creation
* level-up growth direction

These are the places where direct primary-stat influence remains desirable because they reinforce broad role identity without overloading minute-by-minute combat behavior.

### What Moves to Layered Combat Ratings

The following outputs are accepted as layered-rating-facing in the long-term model, even where the current runtime still derives them mostly from attributes:

* raw damage packages
* hit reliability
* ATB speed pressure
* crit chance and crit bonus pressure
* parry-facing defense
* penetration and bypass pressure
* magical resistance packages
* tenacity/status resistance
* status application pressure

The MVP layered ratings for that transition are defined in [007 - Layered Combat Model](007-layered-combat-model.md): `power`, `spellPower`, `precision`, `haste`, `guard`, `resolve`, `potency`, and `crit`.

## Transitional Runtime Baseline

The live game still calculates most combat-facing outputs directly from the five primary attributes. Those formulas remain the canonical current runtime until implementation issue `#70` moves the code to layered stat sourcing.

### Current Derived Stat Formulas

When a unit is created or levels up, the current runtime derives the following baseline stats:

* **Max Health (HP):** `50 + (VIT * 10)`
* **Armor:** `(STR * 1) + (VIT * 0.5)`
* **Physical Damage (melee):** `10 + (STR * 1.5)`
* **Physical Damage (archer basics):** `10 + (DEX * 1.5)`
* **Magic Damage:** `5 + (INT * 2.0)`
* **Accuracy Rating:** `50 + (DEX * 1.5) + (INT * 1.0)`
* **Evasion Rating:** `35 + (DEX * 1.0) + (WIS * 1.0)`
* **Parry Rating:** `(STR * 1.75) + (DEX * 0.25)`
* **Armor Penetration:** `(STR * 1.0) + (DEX * 0.5)`
* **Elemental Penetration:** `(INT * 1.0) + (WIS * 0.5)`
* **Tenacity:** `(VIT * 0.75) + (WIS * 1.0)`

### Current Class Resource Baselines

Classes still use class-specific secondary resources:

* **Warrior (Rage):** fixed maximum of `100`; starts at `0`; gains `8` Rage after resolving an attack action and `5` Rage when taking damage
* **Cleric (Mana):** maximum `50 + (INT * 5)`; starts full; regenerates `WIS * 0.5` per action tick
* **Archer (Cunning):** maximum `50 + (INT * 5)`; starts full; regenerates `0.75` per action tick

These are still acceptable as attribute-facing baselines. The layered model does not require replacing them before the class-template work in `#69`.

### Current Hard Caps and Bounds

To keep the live game stable under idle scaling, the runtime currently applies the following caps and bounded formulas:

* **Critical Hit Chance:** base `5%`, gains `+0.5%` per DEX, hard capped at `100%`
* **Elemental Resistances:** `+1%` per WIS, hard capped at `75%`
* **Physical / Ranged Hit Chance:** `clamp(72%, 97%, 82% + (attacker.Accuracy - defender.Evasion) * 0.2%)`
* **Spell Hit Chance:** `clamp(74%, 96%, 82% + (attacker.Accuracy - defender.Evasion) * 0.16% + (attacker.INT - defender.WIS) * 0.08%)`
* **Parry Chance:** melee-physical only, `clamp(0%, 25%, 4% + (defender.Parry - attacker.Accuracy * 0.3) * 0.25%)`
* **Penetration Reduction:** `min(60%, penetration / (penetration + 60))`
* **Tenacity Reduction:** `min(60%, tenacity / (tenacity + 80))`
* **Status Application Chance:** `clamp(15%, 75%, baseChance + (attacker.ElementalPenetration - defender.Tenacity) * 0.3%)`

These numbers intentionally match the current runtime, including the spell-hit clamp of `74%` to `96%` and the parry cap of `25%`.

## Combat Role Implications

While the runtime still routes many results directly through attributes, the accepted design intent is now:

* **Warrior:** keeps the strongest baseline `guard` tendency through VIT/STR-heavy starts and growth
* **Cleric:** keeps the strongest baseline `spellPower` and `resolve` tendency through INT/WIS-heavy starts and growth
* **Archer:** keeps the strongest baseline `precision`, `haste`, and `crit` tendency through DEX-heavy starts and growth
* **Monsters:** continue to inherit a shared baseline attribute model, while future templates and archetype packages carry more of the differentiated combat identity

This keeps broad class readability while opening space for later template, talent, and equipment systems to own more of the final combat package.

## Consequences

* **Easier:** The five primary attributes stay readable for players and designers because they remain broad identity stats instead of expanding into a giant new primary-stat roster.
* **Easier:** Follow-up issues can move overloaded outputs into layered ratings without first redefining how heroes are created or how enemies are scaled.
* **Difficult:** During the transition period, the docs must distinguish between the accepted long-term ownership model and the current live runtime formulas so we do not accidentally treat temporary math as permanent design.
