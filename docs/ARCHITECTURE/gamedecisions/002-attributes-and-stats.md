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

Monsters use a simple base of 5 in each attribute, which is then scaled by floor level during encounter generation. Enemy archetypes now apply a second pass of role-specific stat bias on top of that baseline so bruisers, skirmishers, casters, supports, and bosses can all inherit the same formulas without needing a separate stat system. Documenting the starting templates helps designers understand baseline differences between classes.

### Derived Stat Formulas
When a unit is created or levels up, their total attributes are summed and used to calculate derived stats:

*   **Max Health (HP):** `50 + (VIT * 10)`
*   **Armor (Physical Defense):** `(STR * 1) + (VIT * 0.5)`
*   **Physical Damage (Melee):** `10 + (STR * 1.5)`
*   **Ranged Damage (Archers):** `10 + (DEX * 1.5)`
*   **Magic Damage:** `5 + (INT * 2.0)`
*   **Accuracy Rating:** `50 + (DEX * 1.5) + (INT * 1)`
*   **Evasion Rating:** `35 + (DEX * 1.0) + (WIS * 1)`
*   **Parry Rating:** `(STR * 1.75) + (DEX * 0.25)`
*   **Armor Penetration:** `(STR * 1.0) + (DEX * 0.5)`
*   **Elemental Penetration:** `(INT * 1.0) + (WIS * 0.5)`
*   **Tenacity:** `(VIT * 0.75) + (WIS * 1.0)`

These additional ratings are intentionally coupled to the same five core attributes instead of introducing a sixth or seventh combat stat. `DEX` now contributes to both offensive precision and defensive footwork, `STR` helps melee defense through parry, and `WIS` helps magical awareness and avoidance pressure.

The newer long-term scaling ratings follow the same philosophy: `STR` and `DEX` feed physical mitigation bypass, `INT` and `WIS` feed magical mitigation bypass, and `VIT` plus `WIS` provide a bounded anti-spike defense through `Tenacity`.

### Classes & Secondary Resources
Classes use secondary resources to cast powerful abilities (future-proofing) or sustain basic actions:
*   **Warrior (Rage):** Fixed maximum of `100`. Starts at `0`. Generates `8` Rage after resolving an attack action and `5` Rage when taking damage.
*   **Cleric (Mana):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates passively based on Wisdom (`WIS * 0.5` per action tick).
*   **Archer (Cunning):** Maximum is `50 + (INT * 5)`. Starts full. Regenerates at a fixed flat rate (`0.75` per action tick).

### Hard Caps
To prevent infinite scaling breaking the game logic:
*   **Critical Hit Chance:** Scales at `+0.5% per DEX`. Base is `5%`. Hard capped at `100% (1.0)`.
*   **Elemental Resistances:** Affects Fire, Water, Earth, Air, Light, and Shadow. Scales at `+1% per WIS`. Hard capped at `75% (0.75)`.
*   **Physical / Ranged Hit Chance:** Uses `Accuracy Rating` vs `Evasion Rating`, then clamps to a floor of `72%` and a ceiling of `97%`.
*   **Spell Hit Chance:** Uses a magic-biased contest of `Accuracy + INT` versus `Evasion + WIS`, then clamps to `75%` to `98%`.
*   **Parry Chance:** Applies only to `melee + physical` attacks and is capped at `30%`.
*   **Penetration Reduction:** Both `Armor Penetration` and `Elemental Penetration` convert through `min(60%, penetration / (penetration + 60))`, so mitigation bypass scales with diminishing returns and cannot erase more than 60% of the target's armor or resistance.
*   **Tenacity Reduction:** `Tenacity` converts through `min(60%, tenacity / (tenacity + 80))`, so it can only reduce a portion of incoming critical bonus damage.
*   **Status Application Chance:** Elemental status riders use `clamp(15%, 75%, baseChance + (attacker.ElementalPenetration - defender.Tenacity) * 0.3%)`, so high penetration helps elemental pressure while Tenacity is the first resistance hook against ongoing combat conditions.

### Combat Role Implications
The new derived ratings reinforce class roles without adding bespoke per-class rules:

* **Warrior:** naturally develops the highest `Parry Rating` thanks to STR-heavy growth and retains a sturdier melee identity now that DEX contributes less to avoidance stacking.
* **Cleric:** gains steadier spell reliability from INT while WIS continues to scale elemental resistance and magical defense.
* **Archer:** still receives the strongest `Accuracy` and `Evasion` growth through DEX, but the lighter DEX weighting reduces all-in-one stat stacking and keeps the class focused on agility rather than passive durability.
* **Monsters:** inherit the same formulas, which keeps enemy combat behavior scalable without a separate balance table for hit logic. Archetype bias changes which attributes are emphasized, but not how those attributes convert into combat stats.
* **Tenacity:** now does two jobs: it still dampens incoming crit spikes, and it also resists elemental status pressure such as `Burn`, `Slow`, `Weaken`, `Hex`, and `Blind`. It remains bounded, so it softens those systems without shutting them off entirely.

### Elemental Status Hooks
The first shipped reusable status-effect framework still derives its pressure from the same five attributes rather than introducing a new ailment stat:

* **Fire -> Burn:** a timed damage-over-time effect. Burn potency is snapshot from the applier's spell power when the effect lands.
* **Water -> Slow:** temporarily reduces ATB gain by a bounded percentage.
* **Earth -> Weaken:** temporarily reduces outgoing damage by a bounded percentage.
* **Shadow -> Hex:** temporarily reduces all incoming healing on the target, giving Shadow a sustain-pressure identity instead of raw damage-over-time.
* **Light -> Blind:** temporarily reduces `Accuracy Rating` by `15`, letting Light pressure both physical and spell reliability through the existing hit formulas.

Light also introduces the first cleanse-style interaction through Cleric `Bless`, which removes one debuff from the target ally (prioritizing `Hex`) while applying or refreshing `Regen`. These status effects deliberately reuse `Elemental Penetration` on the attacker side and `Tenacity` on the defender side. That keeps status pressure aligned with the existing magical combat stats instead of adding a sixth defensive axis.

## Consequences
*   **Easier:** Designing items or buffs that grant `+X STR`, `+X DEX`, or `+X WIS` is clearer because those attributes now affect both raw throughput and hit-resolution outcomes.
*   **Difficult:** Because the same attributes now scale multiple combat layers, balance drift is easier to introduce. Penetration and Tenacity help long-term scaling stay interesting, but future status systems still need to avoid turning `WIS` plus `Tenacity` into an all-purpose answer package.
