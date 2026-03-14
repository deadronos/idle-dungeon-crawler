# 002 - Attributes and Derived Stats

**Date:** 2026-03-10
**Status:** Accepted

## Context
As defined in [001 - Player Classes and Party System](001-player-classes.md), units in our game have various attributes that define their performance. Initially, the scaling and formula definitions were tightly coupled with the implementation and not officially documented, leading to confusion on how much 1 point of Strength was actually worth compared to 1 point of Vitality.

## Decision
We formally document the core attributes and the formulas used to calculate a unit's derived combat stats. We use a base starting point for each derived stat to ensure level 1 entities are viable before attribute scaling applies.

### Core Attributes
The game uses five primary attributes:
*   **Constitution (VIT):** Governs physical health and base durability.
*   **Strength (STR):** Measures physical power and heavily influences physical resistance (armor).
*   **Dexterity (DEX):** Determines precision and speed. Increases critical hit chance, ranged damage, and slightly boosts action speed.
*   **Intelligence (INT):** Dictates magical prowess, influencing magic damage and maximum magical resource pools.
*   **Wisdom (WIS):** Reflects spiritual/mental defense, increasing elemental resistances and cleric mana regeneration.

### Starting Attribute Templates
Each hero class begins with a predefined spread of attributes to reinforce its role. These base values are applied when a new hero is created and before any level‑up allocations:

* **Warrior:** VIT 10, STR 10, DEX 5, INT 3, WIS 3
* **Cleric:** VIT 7, STR 4, DEX 4, INT 8, WIS 10
* **Archer:** VIT 6, STR 5, DEX 12, INT 4, WIS 4

Monsters use a simple base of 5 in each attribute, which is then scaled by floor level during encounter generation.  Documenting the starting templates helps designers understand baseline differences between classes.

### Derived Stat Formulas
When a unit is created or levels up, their total attributes are summed and used to calculate derived stats:

*   **Max Health (HP):** `50 + (VIT * 10)`
*   **Armor (Physical Defense):** `(STR * 1) + (VIT * 0.5)`
*   **Physical Damage (Melee):** `10 + (STR * 1.5)`
*   **Ranged Damage (Archers):** `10 + (DEX * 1.5)`
*   **Magic Damage:** `5 + (INT * 2.0)`
*   **Accuracy Rating:** `50 + (DEX * 2) + (INT * 1)`
*   **Evasion Rating:** `35 + (DEX * 1.5) + (WIS * 1)`
*   **Parry Rating:** `(STR * 1.5) + (DEX * 0.75)`

These additional ratings are intentionally coupled to the same five core attributes instead of introducing a sixth or seventh combat stat. `DEX` now contributes to both offensive precision and defensive footwork, `STR` helps melee defense through parry, and `WIS` helps magical awareness and avoidance pressure.

### Classes & Secondary Resources
Classes use secondary resources to cast powerful abilities (future-proofing) or sustain basic actions:
*   **Warrior (Rage):** Fixed maximum of `100`. Starts at `0`. Generates `10` Rage when hitting an enemy, and `5` Rage when hit by an enemy.
*   **Cleric (Mana):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates passively based on Wisdom (`WIS * 0.5` per action tick).
*   **Archer (Cunning):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates at a fixed flat rate (`2` per action tick).

### Hard Caps
To prevent infinite scaling breaking the game logic:
*   **Critical Hit Chance:** Scales at `+0.5% per DEX`. Base is `5%`. Hard capped at `100% (1.0)`.
*   **Elemental Resistances:** Affects Fire, Water, Earth, Air, Light, and Shadow. Scales at `+1% per WIS`. Hard capped at `75% (0.75)`.
*   **Physical / Ranged Hit Chance:** Uses `Accuracy Rating` vs `Evasion Rating`, then clamps to a floor of `72%` and a ceiling of `97%`.
*   **Spell Hit Chance:** Uses a magic-biased contest of `Accuracy + INT` versus `Evasion + WIS`, then clamps to `75%` to `98%`.
*   **Parry Chance:** Applies only to `melee + physical` attacks and is capped at `30%`.

### Combat Role Implications
The new derived ratings reinforce class roles without adding bespoke per-class rules:

* **Warrior:** naturally develops the highest `Parry Rating` thanks to STR-heavy growth and remains the most reliable melee bruiser.
* **Cleric:** gains steadier spell reliability from INT while WIS continues to scale elemental resistance and magical defense.
* **Archer:** receives the strongest `Accuracy` and `Evasion` growth through DEX, making the class agile rather than parry-oriented.
* **Monsters:** inherit the same formulas, which keeps enemy combat behavior scalable without a separate balance table for hit logic.

## Consequences
*   **Easier:** Designing items or buffs that grant `+X STR`, `+X DEX`, or `+X WIS` is clearer because those attributes now affect both raw throughput and hit-resolution outcomes.
*   **Difficult:** Because the same attributes now scale multiple combat layers, balance drift is easier to introduce. Future penetration, status, or tenacity systems should be tuned carefully so DEX- or WIS-stacking does not crowd out other builds.
