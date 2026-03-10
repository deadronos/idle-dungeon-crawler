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

### Derived Stat Formulas
When a unit is created or levels up, their total attributes are summed and used to calculate derived stats:

*   **Max Health (HP):** `50 + (VIT * 10)`
*   **Armor (Physical Defense):** `(STR * 2) + (VIT * 1)`
*   **Physical Damage (Melee):** `10 + (STR * 1.5)`
*   **Ranged Damage (Archers):** `10 + (DEX * 1.5)`
*   **Magic Damage:** `5 + (INT * 2.0)`

### Classes & Secondary Resources
Classes use secondary resources to cast powerful abilities (future-proofing) or sustain basic actions:
*   **Warrior (Rage):** Fixed maximum of `100`. Starts at `0`. Generates `10` Rage when hitting an enemy, and `5` Rage when hit by an enemy.
*   **Cleric (Mana):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates passively based on Wisdom (`WIS * 0.5` per action tick).
*   **Archer (Cunning):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates at a fixed flat rate (`2` per action tick).

### Hard Caps
To prevent infinite scaling breaking the game logic:
*   **Critical Hit Chance:** Scales at `+0.5% per DEX`. Base is `5%`. Hard capped at `100% (1.0)`.
*   **Elemental Resistances:** Affects Fire, Water, Earth, Air, Light, and Shadow. Scales at `+1% per WIS`. Hard capped at `75% (0.75)`.

## Consequences
*   **Easier:** Designing items or buffs that grant `+X STR` is clearer since the direct impact on Armor and Physical Damage is known.
*   **Difficult:** Classes generally need one primary damage stat (STR, DEX, or INT) and one defensive stat (VIT or WIS) to be effective, leading to rigid "stat allocation" meta paths unless hybrid designs are introduced early on.
