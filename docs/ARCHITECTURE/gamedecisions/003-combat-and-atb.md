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
* **Speed Bonus:** Dexterity provides a speed bonus calculation: `+ (DEX * 0.06)` per tick.

When an entity's `actionProgress` reaches or exceeds `100`, they consume their bar (reset to `0`) and perform an action.

### Turn Resolution (Auto-Attack)

Currently, action resolution uses a lightweight class-aware ruleset:

1. **Target Selection:** Heroes still choose a random living target from the opposing side. Enemy archetypes bias target selection toward a specific role, such as the healthiest frontliner, the lowest-HP hero, or the hero with the weakest elemental resistance.
2. **Class Skill Check:**
   * Clerics first check for a badly injured ally and, if sufficient Mana is available, cast a heal instead of attacking (Mend costs **35 Mana**).
   * Warriors spend Rage on `Rage Strike` once they have enough stored resource (40 Rage for a 2× damage attack; `Rage Strike` cannot be parried; warriors gain 8 Rage after resolving an attack and 5 Rage when hit).
   * Archers spend Cunning on `Piercing Shot` once they have enough stored resource (35 Cunning for 1.6× damage and +15% crit chance).
   * Resource regeneration is handled per tick: clerics regain `WIS * 0.5` Mana, archers regain `0.75` Cunning, and warriors generate Rage only through combat triggers. Warriors start runs with 0 Rage, while clerics and archers begin with full resource pools.
   * Enemy `Support` units first try to heal a wounded ally with `Mend Ally`. If no ally is under meaningful pressure, they cast `Ward Ally` on an unwarded companion before falling back to `Suppressing Hex`.
3. **Action Metadata:** Every damaging action declares a `deliveryType` (`melee`, `ranged`, or `spell`) and a `damageElement` (`physical`, `fire`, `water`, `earth`, `air`, `light`, `shadow`). Standard enemy archetype actions now include `Crushing Blow` (`melee + physical`), `Harrying Shot` (`ranged + physical`), elemental `Bolt` spells, `Suppressing Hex` (`spell + shadow`), `Overlord Strike` (`melee + physical`), and `Ruin Bolt` (`spell + elemental`). Archer basics remain `ranged + physical` and Cleric `Smite` remains `spell + light`. This keeps future attacks extensible without hand-written resolution logic per skill and avoids silently classifying all enemies as ranged attackers.
4. **Hit Resolution:**
   * Most physical attacks use a contested hit formula based on the attacker's `Accuracy Rating` and the defender's `Evasion Rating`.
   * Spells use a magic-biased variant that still compares `Accuracy` versus `Evasion`, but also layers in a smaller `INT` versus `WIS` pressure term before clamping the final hit chance.
   * If the hit roll fails, the action is surfaced as a `dodge` event in the log/UI.
5. **Parry Check:**
   * `Parry` applies only to `melee + physical` attacks.
   * Ranged physical attacks such as `Piercing Shot` can still miss or be dodged, but they cannot be parried by default.
   * If a parry succeeds, the hit is fully negated.
6. **Damage Roll:**
   * Clerics use their `Magic Damage` stat when attacking.
   * Warriors and Archers use their `Physical Damage` stat.
7. **Critical Hit Check:** The unit's `Crit Chance` (base 5%, boosted by DEX) is rolled. If successful, damage is multiplied.
   * Archers have a `2.0x` Crit Multiplier.
   * All other classes have a `1.5x` Crit Multiplier.
8. **Mitigation:** The final incoming damage is reduced based on the action's specific `DamageElement` tag. If the element is `physical`, damage is reduced with a diminishing-return armor curve: `rawDamage * (100 / (100 + armor * 2))`. If the element is magical (e.g. `light`, `fire`), damage is reduced by a percentage equal to the target's corresponding elemental resistance (minimum 1 damage).
9. **Protection Effects:** `Ward Ally` is a lightweight support-only protection effect. It reduces the next damaging hit against the warded target by `35%`, then expires immediately. This gives enemy support units an ally-protection hook without introducing a full buff/debuff framework yet.
10. **Resource Triggers:** Warrior Rage generation now happens after any resolved Warrior attack action, including dodges or parries, plus whenever a Warrior takes damage. This keeps Rage tied to combat participation without requiring every melee swing to connect.

Cleric `Smite` is the first shipped non-physical attack in this system and is tagged as `light`, so it already respects Light resistance. Additional elemental attacks can reuse the same mitigation path in future expansions.

### Enemy Archetypes

Enemy variety is now expressed through a lightweight `enemyArchetype` layer rather than a separate enemy-class roster. Standard monsters remain floor-scaled `Monster` entities underneath, but encounter generation can assign one of these combat roles:

* **Bruiser:** high HP and armor, slower melee pressure, prefers the hero with the highest current HP, and attacks with `Crushing Blow`.
* **Skirmisher:** high DEX / ACC / EVA, ranged pressure, prefers the hero with the lowest current HP, and attacks with `Harrying Shot`.
* **Caster:** high INT / WIS, elemental spell pressure, prefers the hero with the weakest resistance to its generated element, and attacks with `<Element> Bolt`.
* **Support:** triage healer and protector. It heals wounded allies with `Mend Ally`, otherwise uses `Ward Ally`, and only falls back to `Suppressing Hex` when neither support action is valuable.
* **Boss:** a bespoke boss-only package layered on top of floor scaling. Bosses open with `Overlord Strike` against the healthiest hero, then switch to elemental `Ruin Bolt` pressure once they drop below `60%` HP.

Caster and Boss elemental tags are assigned deterministically when the encounter is generated so the system stays easy to test and tune while still cycling through all six magical elements over time.

### Chance Formulas

The first deeper-combat pass uses bounded formulas to stay stable under long-term idle scaling:

* **Physical / Ranged Hit Chance:** `clamp(72%, 97%, 82% + (attacker.Accuracy - defender.Evasion) * 0.2%)`
* **Spell Hit Chance:** `clamp(74%, 96%, 82% + (attacker.Accuracy - defender.Evasion) * 0.16% + (attacker.INT - defender.WIS) * 0.08%)`
* **Parry Chance:** `clamp(0%, 25%, 4% + (defender.Parry - attacker.Accuracy * 0.3) * 0.25%)`

### Combat Readability

Whenever an entity resolves an action, the UI displays a short-lived skill banner near that unit's portrait (for example, `Casting Mend` or `Casting Rage Strike`) so the player can read combat intent at a glance without relying only on the combat log.

The dungeon UI now also renders transient floating combat events near unit portraits for key outcomes such as damage, healing, `Dodge`, `Parry`, `CRIT`, and defeat. This keeps the fast ATB loop readable without bloating the permanent card layout.

### UI Readability Conventions

To support higher-entity encounters (up to five party members and five enemies), the roster presentation follows a few conventions:

* **Living-first ordering:** living entities are listed before defeated ones so the actionable combat state is always near the top of each roster.
* **Compact bars with preserved scanability:** HP, resource, and action-readiness bars remain visible at reduced card density to avoid panel collapse at larger party sizes.
* **Subtle role labels:** enemy roster cards and the encounter stage surface the current archetype in small uppercase labels so the player can read combat roles without adding a new panel or badge-heavy layout.
* **On-demand derived detail:** secondary stat details (VIT/STR/DEX/INT/WIS) plus combat-facing ratings (`ACC`, `EVA`, `PAR`) and elemental resistances are available via portrait hover/focus tooltip rather than being permanently rendered in every card.
* **Scrollable roster columns:** party and enemy panels remain independently scrollable when total unit count exceeds available viewport height.
* **Anchored combat log:** the middle-column log remains pinned to the bottom of the dungeon view while the encounter showcase keeps a stable footprint, so rapid kills or floor transitions do not cause the log panel to jump upward.
* **Adjustable log depth:** players can still choose how much recent combat history to expose by expanding the log or dragging its resize handle upward for more visible entries.
* **Event-focused filtering:** the `Events` tab highlights crits, dodges, parries, defeats, and similar high-signal outcomes so the player can skim the fight without reading every basic attack line.

### State Updates

The combat loop now advances through a provider-backed `zustand` store action (`stepSimulation`) while the combat math itself lives in pure engine helpers under `src/game/engine/`. This keeps ATB bars and regenerating resources visually in sync without forcing unrelated UI panels to subscribe to every tick. For the architectural rationale behind the migration, see [002 - State Management Evolution](../technicaldecisions/002-state-management-evolution.md).

## Consequences

* **Easier:** Combat is more readable and less deterministic. The same core attributes now support both raw throughput and hit-resolution gameplay without introducing a separate stat sheet, and enemy variety can increase without building a full parallel class roster.
* **Difficult:** Because hit chance, dodge pressure, parry, elemental resistance, and now archetype targeting all scale from shared attributes, balance drift becomes easier to introduce at high levels. Future combat additions should prefer bounded formulas and explicit caps rather than open-ended avoidance stacking.
