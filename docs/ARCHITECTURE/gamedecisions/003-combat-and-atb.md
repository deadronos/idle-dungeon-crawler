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

If `Autofight` is disabled, the simulation pauses in place: ATB does not fill, actions do not resolve, and the current encounter remains visible until the player re-enables automatic fighting or changes floors manually.

`Autoadvance` is a separate control. When enabled, the party moves to the next floor after winning an encounter. When disabled, the party immediately starts a fresh encounter on the same floor, allowing the player to continuously farm a target floor without climbing past it.

* **Base ATB Rate:** `2.0` per tick.
* **Speed Bonus:** Dexterity provides a speed bonus calculation: `+ (DEX * 0.1)` per tick.

When an entity's `actionProgress` reaches or exceeds `100`, they consume their bar (reset to `0`) and perform an action.

### Turn Resolution (Auto-Attack)

Currently, action resolution uses a lightweight class-aware ruleset:

1. **Target Selection:** The acting unit selects a random living target from the opposing side.
2. **Class Skill Check:**
   * Clerics first check for a badly injured ally and, if sufficient Mana is available, cast a heal instead of attacking (Mend costs **35 Mana**).
   * Warriors spend Rage on `Rage Strike` once they have enough stored resource (50 Rage for a 2× damage attack; warriors gain 10 Rage when hitting and 5 Rage when hit).
   * Archers spend Cunning on `Piercing Shot` once they have enough stored resource (25 Cunning for 1.6× damage and +25% crit chance).
   * Resource regeneration is handled per tick: clerics regain `WIS * 0.5` Mana, archers regain `2` Cunning, and warriors generate Rage only through combat triggers. Warriors start runs with 0 Rage, while clerics and archers begin with full resource pools.
3. **Damage Roll:**
   * Clerics use their `Magic Damage` stat when attacking.
   * Warriors and Archers use their `Physical Damage` stat.
4. **Critical Hit Check:** The unit's `Crit Chance` (base 5%, boosted by DEX) is rolled. If successful, damage is multiplied.
   * Archers have a `2.0x` Crit Multiplier.
   * All other classes have a `1.5x` Crit Multiplier.

5. **Mitigation:** The final incoming damage is reduced based on the action's specific `DamageElement` tag. If the element is `physical`, damage is reduced by subtracting the target's `Armor` value. If the element is magical (e.g. `light`, `fire`), damage is reduced by a percentage equal to the target's corresponding elemental resistance (minimum 1 damage).
6. **Resource Triggers:** If a Warrior gives or receives a hit, they generate Rage.

Cleric `Smite` is the first shipped non-physical attack in this system and is tagged as `light`, so it already respects Light resistance. Additional elemental attacks can reuse the same mitigation path in future expansions.

### Combat Readability

Whenever an entity resolves an action, the UI displays a short-lived skill banner near that unit's portrait (for example, `Casting Mend` or `Casting Rage Strike`) so the player can read combat intent at a glance without relying only on the combat log.

### UI Readability Conventions

To support higher-entity encounters (up to five party members and five enemies), the roster presentation follows a few conventions:

- **Living-first ordering:** living entities are listed before defeated ones so the actionable combat state is always near the top of each roster.
- **Compact bars with preserved scanability:** HP, resource, and action-readiness bars remain visible at reduced card density to avoid panel collapse at larger party sizes.
- **On-demand derived detail:** secondary stat details (VIT/STR/DEX/INT/WIS) are available via portrait hover/focus tooltip rather than being permanently rendered in every card.
- **Scrollable roster columns:** party and enemy panels remain independently scrollable when total unit count exceeds available viewport height.

### State Updates

The combat loop now advances through a provider-backed `zustand` store action (`stepSimulation`) while the combat math itself lives in pure engine helpers under `src/game/engine/`. This keeps ATB bars and regenerating resources visually in sync without forcing unrelated UI panels to subscribe to every tick. For the architectural rationale behind the migration, see [002 - State Management Evolution](../technicaldecisions/002-state-management-evolution.md).

## Consequences

* **Easier:** Dexterity intrinsically scales combat effectiveness by directly increasing the frequency of attacks in real-time, alongside its buffs to Crit Chance.
* **Difficult:** Enemy target selection is still purely random. Without threat mechanics (taunt, aggro), squishy heroes like Archers and Clerics have the same probability of being targeted as tank-focused Warriors, meaning defensive stat allocation is required across the entire party row.
