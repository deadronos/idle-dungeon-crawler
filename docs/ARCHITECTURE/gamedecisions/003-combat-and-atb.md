# 003 - Combat Loop and ATB Mechanics

**Date:** 2026-03-10
**Status:** Accepted

## Context

With the introduction of the Party System ([001 - Player Classes and Party System](001-player-classes.md)), a real-time clicking system became unwieldy for controlling multiple heroes simultaneously. We needed an autonomous combat engine that could resolve fights without player input while still taking individual character speed into account.

## Decision

We implemented an Active Time Battle (ATB) system to manage turn order and action sequencing.

### Game Tick and ATB Scaling

To ensure smooth visual progression of action bars on the UI, the Game Loop operates at **20 ticks per second** (`GAME_TICK_RATE = 20`).

Every tick, all living entities (both party heroes and enemies) increase their `actionProgress` (0 to 100).

* **Base ATB Rate:** `2.0` per tick.
* **Speed Bonus:** Dexterity provides a speed bonus calculation: `+ (DEX * 0.1)` per tick.

When an entity's `actionProgress` reaches or exceeds `100`, they consume their bar (reset to `0`) and perform an action.

### Turn Resolution (Auto-Attack)

Currently, action resolution relies on basic logic:

1. **Target Selection:** The acting unit selects a random living target from the opposing side.
2. **Damage Roll:**
   * Clerics use their `Magic Damage` stat.
   * Warriors and Archers use their `Physical Damage` stat.
3. **Critical Hit Check:** The unit's `Crit Chance` (base 5%, boosted by DEX) is rolled. If successful, damage is multiplied.
   * Archers have a `2.0x` Crit Multiplier.
   * All other classes have a `1.5x` Crit Multiplier.
4. **Mitigation:** The final incoming damage is reduced by subtracting the target's `Armor` value (minimum 1 damage).
   * *Note: Elemental resistances are currently defined in the attributes but not yet applied to basic attacks.*
5. **Resource Triggers:** If a Warrior gives or receives a hit, they generate Rage.

### State Updates

The current React implementation commits updated game state every tick so ATB bars and regenerating resources remain visually in sync with the simulation. This is acceptable for the current prototype scale, but it also means the state container is doing more render work than the original design intended. For the next architecture step, see [002 - State Management Evolution](../technicaldecisions/002-state-management-evolution.md).

## Consequences

* **Easier:** Dexterity intrinsically scales combat effectiveness by directly increasing the frequency of attacks in real-time, alongside its buffs to Crit Chance.
* **Difficult:** The target selection is purely random. Without threat mechanics (taunt, aggro), squishy heroes like Archers and Clerics have the same probability of being targeted as tank-focused Warriors, meaning defensive stat allocation is required across the entire party row.
