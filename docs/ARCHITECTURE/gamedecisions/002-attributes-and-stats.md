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

The following outputs are accepted as layered-rating-facing in the long-term model and are now routed through those ratings in the current runtime:

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

## Current Runtime Baseline

The live game now derives most combat-facing outputs through a small layered-rating pass instead of treating the five primary attributes as the direct owner of every final combat number.

At runtime, each entity first computes the accepted MVP secondary ratings from attributes plus a lightweight template or archetype bias package:

* **`power`:** `(sourceAttribute * sourceMultiplier * 0.8) + (STR * 0.25) + (VIT * 0.15) + powerBias`
* **`spellPower`:** `(INT * 1.25) + (WIS * 0.55) + spellPowerBias`
* **`precision`:** `(DEX * 0.6) + (INT * 0.35) + (WIS * 0.15) + precisionBias`
* **`haste`:** `(DEX * 0.45) + (VIT * 0.15) + (WIS * 0.1) + hasteBias`
* **`guard`:** `(VIT * 0.8) + (STR * 0.55) + (DEX * 0.1) + guardBias`
* **`resolve`:** `(WIS * 0.85) + (VIT * 0.3) + (INT * 0.35) + resolveBias`
* **`potency`:** `(INT * 0.45) + (WIS * 0.35) + (DEX * 0.15) + potencyBias`
* **`crit`:** `(DEX * 0.35) + (WIS * 0.15) + (INT * 0.1) + critBias`

For heroes, the bias package comes from the class template. For enemies, it comes from the current archetype package.

### Current Derived Stat Formulas

When a unit is created or levels up, the current runtime derives the following final combat stats from those ratings:

* **Max Health (HP):** `50 + (VIT * 10)`
* **Armor:** `(STR * 0.45) + (VIT * 0.25) + (guard * 0.4)`
* **Physical Damage:** `10 + (power * 0.8) + (crit * 0.15)`
* **Magic Damage:** `5 + (spellPower * 0.75) + (potency * 0.15)`
* **Accuracy Rating:** `50 + (precision * 1.2) + (crit * 0.1)`
* **Evasion Rating:** `35 + (haste * 0.8) + (resolve * 0.25)`
* **Parry Rating:** `(guard * 0.8) + (precision * 0.2)`
* **Armor Penetration:** `(power * 0.5) + (guard * 0.12)`
* **Elemental Penetration:** `(spellPower * 0.22) + (potency * 0.4) + (precision * 0.08)`
* **Tenacity:** `(resolve * 0.65) + (guard * 0.2)`

### Current Class Resource Baselines

Classes still use class-specific secondary resources:

* **Warrior (Rage):** fixed maximum of `100`; starts at `0`; gains `8` Rage after resolving an attack action and `5` Rage when taking damage
* **Cleric (Mana):** maximum `50 + (INT * 5)`; starts full; regenerates `WIS * 0.5` per action tick
* **Archer (Cunning):** maximum `50 + (INT * 5)`; starts full; regenerates `0.75` per action tick

These are still acceptable as attribute-facing baselines. The layered model does not require replacing them before the template-driven class identity defined in [008 - Hero Class Templates, Growth Packages, and Resource Models](008-hero-class-templates.md).

### Current Hard Caps and Bounds

To keep the live game stable under idle scaling, the runtime currently applies the following caps and bounded formulas:

* **Critical Hit Chance:** base `5%`, gains `+0.55%` per `crit`, hard capped at `100%`
* **Critical Hit Damage:** class crit multiplier plus `min(0.2, crit * 0.01)`
* **Elemental Resistances:** `2% + (resolve * 0.8%)`, hard capped at `75%`
* **Physical / Ranged Hit Chance:** `clamp(72%, 97%, 82% + (attacker.Accuracy - defender.Evasion) * 0.2%)`
* **Spell Hit Chance:** `clamp(74%, 96%, 82% + (attacker.Accuracy - defender.Evasion) * 0.16% + (attacker.INT - defender.WIS) * 0.08%)`
* **Parry Chance:** melee-physical only, `clamp(0%, 25%, 4% + (defender.Parry - attacker.Accuracy * 0.3) * 0.25%)`
* **Penetration Reduction:** `min(60%, penetration / (penetration + 60))`
* **Tenacity Reduction:** `min(60%, tenacity / (tenacity + 80))`
* **Status Application Chance:** `clamp(15%, 75%, baseChance + (attacker.ElementalPenetration - defender.Tenacity) * 0.3%)`

These numbers intentionally match the current runtime, including the spell-hit clamp of `74%` to `96%` and the parry cap of `25%`.

## Combat Role Implications

The current runtime now routes those results through layered ratings while keeping the broad class intent intact:

* **Warrior:** keeps the strongest baseline `guard` tendency through VIT/STR-heavy starts and growth
* **Cleric:** keeps the strongest baseline `spellPower` and `resolve` tendency through INT/WIS-heavy starts and growth
* **Archer:** keeps the strongest baseline `precision`, `haste`, and `crit` tendency through DEX-heavy starts and growth
* **Monsters:** continue to inherit a shared baseline attribute model, while future templates and archetype packages carry more of the differentiated combat identity

This keeps broad class readability while opening space for later template, talent, and equipment systems to own more of the final combat package.

## Consequences

* **Easier:** The five primary attributes stay readable for players and designers because they remain broad identity stats instead of expanding into a giant new primary-stat roster.
* **Easier:** Follow-up issues can move overloaded outputs into layered ratings without first redefining how heroes are created or how enemies are scaled.
* **Difficult:** Docs and code now need to stay aligned at the coefficient level because class-template biases and rating formulas both materially shape combat identity.
