# 003 - Combat Loop and ATB Mechanics

**Date:** 2026-03-10
**Status:** Accepted

## Context

With the introduction of the Party System ([001 - Player Classes and Party System](001-player-classes.md)), a real-time clicking system became unwieldy for controlling multiple heroes simultaneously. We needed an autonomous combat engine that could resolve fights without player input while still taking individual character speed into account.

## Decision

We implemented an Active Time Battle (ATB) system to manage turn order and action sequencing.

As of [007 - Layered Combat Model](007-layered-combat-model.md), this record serves two jobs:

* document the current live runtime combat flow
* define which parts of that flow are now owned by layered combat ratings instead of raw attributes alone

### Game Tick and ATB Scaling

To ensure smooth visual progression of action bars on the UI, the Game Loop operates at **20 ticks per second** (`GAME_TICK_RATE = 20`).

Every tick, all living entities (both party heroes and enemies) increase their `actionProgress` (0 to 100).

If `Autofight` is disabled, the simulation pauses in place: ATB does not fill, actions do not resolve, and the current encounter remains visible until the player re-enables automatic fighting or changes floors manually.

`Autoadvance` is a separate control. When enabled, the party moves to the next floor after winning an encounter. When disabled, the party immediately starts a fresh encounter on the same floor, allowing the player to continuously farm a target floor without climbing past it.

* **Base ATB Rate:** `2.0` per tick.
* **Speed Bonus:** layered `haste` provides a speed bonus calculation: `+ (haste * 0.08)` per tick.
* **Status Timing:** reusable timed effects decrement once per game tick, while periodic effects such as Burn resolve once per second (`20` ticks).

`haste` is derived from attributes plus template or archetype bias, so DEX still matters, but it no longer owns action speed by itself.

When an entity's `actionProgress` reaches or exceeds `100`, they consume their bar (reset to `0`) and perform an action.

### Turn Resolution (Auto-Attack)

Currently, action resolution uses a lightweight class-aware ruleset:

1. **Target Selection:** Heroes still choose a random living target from the opposing side. Enemy archetypes bias target selection toward a specific role, such as the healthiest frontliner, the lowest-HP hero, or the hero with the weakest elemental resistance.
2. **Class Skill Check:**
   * Clerics first check for a badly injured ally and, if sufficient Mana is available, cast a heal instead of attacking (Mend costs **35 Mana**). If no ally needs healing, the Cleric checks for a party member without `Regen` and, if sufficient Mana is available, casts `Bless` to apply a regeneration buff (**25 Mana**). If neither support action is available or affordable, the Cleric falls back to `Smite`.
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
7. **Critical Hit Check:** The unit's `Crit Chance` (base `5%`, boosted by layered `crit`) is rolled. If successful, damage is multiplied.
   * The current runtime adds `+0.55%` crit chance per `crit` rating.
   * Crit damage starts from the class template multiplier and gains a small layered bonus through `min(0.2, crit * 0.01)`.
8. **Mitigation:** The final incoming damage is reduced based on the action's specific `DamageElement` tag. If the element is `physical`, the attacker's `Armor Penetration` first converts through `min(60%, penetration / (penetration + 60))` and reduces the target's effective armor by that proportion, then damage is reduced with the existing diminishing-return armor curve: `rawDamage * (100 / (100 + effectiveArmor * 2))`. If the element is magical (e.g. `light`, `fire`), the attacker's `Elemental Penetration` uses the same bounded conversion to reduce the target's effective elemental resistance before the percentage-based resistance reduction is applied. Minimum damage remains `1`.
9. **Status Application:** After a damaging elemental hit lands and deals damage, the engine may apply a timed status rider. The current element-to-status mappings are `fire -> Burn`, `water -> Slow`, `earth -> Weaken`, `shadow -> Hex`, and `light -> Blind`. Application uses `clamp(15%, 75%, baseChance + (attacker.ElementalPenetration - defender.Tenacity) * 0.3%)`, so elemental pressure stays bounded and shares the same offensive/defensive stats as spell damage.
10. **Protection Effects:** `Ward Ally` remains a lightweight support-only protection effect. It reduces the next damaging hit against the warded target by `35%`, then expires immediately. It still lives outside the timed-status framework because it is a single-hit shield, not a duration-based condition.
11. **Resource Triggers:** Warrior Rage generation now happens after any resolved Warrior attack action, including dodges or parries, plus whenever a Warrior takes damage. This keeps Rage tied to combat participation without requiring every melee swing to connect.
12. **Tenacity:** If the action crits, the defender's `Tenacity` dampens only the bonus portion of the crit multiplier through `min(60%, tenacity / (tenacity + 80))`. The same stat also resists elemental status application through the bounded status formula above. Tenacity still does not change crit chance and cannot hard-immunize units against statuses.

Cleric `Smite` is the first shipped non-physical attack in this system and is tagged as `light`, so it now matters through both Light resistance and the `Blind` rider. Additional elemental attacks can reuse the same mitigation path in future expansions.

### Timed Status Effects

The combat engine now supports a reusable timed-effect payload on every entity rather than hard-coding status logic into individual classes or enemy archetypes. Each active effect stores a key, polarity, source id, remaining duration, stack count, stack cap, and effect-specific potency.

The current set of shipped effects covers both debuffs (negative pressure) and buffs (positive support):

**Debuffs:**

* **Burn (`fire`):** `45%` base application chance, `4s` duration, ticks once per second, and deals `15%` of the source's magic damage per tick. Burn stacks up to `2`, and reapplication refreshes the duration.
* **Slow (`water`):** `35%` base application chance, `3s` duration, and reduces ATB gain by `20%`. It does not stack; stronger reapplications refresh duration.
* **Weaken (`earth`):** `35%` base application chance, `4s` duration, and reduces outgoing physical and magic damage by `15%`. It does not stack; stronger reapplications refresh duration.
* **Hex (`shadow`):** `35%` base application chance, `3s` duration, and reduces all incoming healing to the target by `30%`. It does not stack; reapplication refreshes duration and takes the higher potency. Applied as a status rider on any shadow-element damaging hit (including enemy Support's `Suppressing Hex`).
* **Blind (`light`):** `35%` base application chance, `3s` duration, and reduces the target's `Accuracy Rating` by `15`, softening both physical and spell hit chance without creating hard lockouts. It does not stack; stronger reapplications refresh duration.

**Buffs:**

* **Regen:** `4s` duration, ticks once per second, and restores a flat HP amount derived from the casting Cleric's magic damage (`magicDamage × 15%`). Does not stack; a second Bless from the same or stronger caster refreshes duration and adopts the higher potency. Applied by Cleric `Bless` (see below).

**Light-side cleanse interaction:**

* Cleric `Bless` now doubles as the first cleanse-style support action. When choosing a target, it prioritizes an ally carrying a removable debuff and removes **one** debuff on cast while still applying or refreshing `Regen`.
* Cleanse currently prioritizes `Hex` when present, preserving a clear Light-versus-Shadow counterplay hook without invalidating all status play.

**Stacking and overwrite rules:**

* Effects with `maxStacks = 1` (Slow, Weaken, Hex, Blind, Regen) never stack. Reapplication always refreshes the remaining duration and adopts the higher potency.
* Burn (maxStacks = 2) increments stacks up to the cap on reapplication and always refreshes duration. The highest-potency source is adopted when multiple stacks are active.
* Buffs (`polarity: "buff"`) and debuffs (`polarity: "debuff"`) can coexist on the same entity simultaneously.

Active statuses are part of encounter state and therefore persist through save/export/import when the run is saved mid-fight. They are cleared when a new encounter is generated so temporary combat conditions do not leak across floors.

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
* **Penetration Reduction:** `min(60%, penetration / (penetration + 60))`
* **Tenacity Reduction:** `min(60%, tenacity / (tenacity + 80))`

These formulas are the current runtime baseline and remain intentionally bounded after the layered-stat sourcing refactor.

### Accepted Layered Ownership

The layered combat pass does not replace the ATB combat loop itself. It changes which systems own the final combat numbers that feed the loop:

* **`precision`:** owns hit reliability pressure. Physical and spell hit formulas remain contested and clamped, but future offensive hit strength should flow primarily through `precision` rather than raw DEX or INT alone.
* **`haste`:** owns long-term action-speed pressure. The runtime now routes ATB gain through `haste`, with DEX remaining only one contributor to that final rating.
* **`crit`:** owns crit chance and crit bonus pressure. Crits remain bounded and continue to be softened defensively rather than removed outright.
* **`guard`:** owns physical durability packages, especially armor-facing mitigation and parry-facing melee defense.
* **`resolve`:** owns magical durability packages, including elemental resistance baselines and tenacity-facing anti-spike / anti-status resistance.
* **`potency`:** owns bypass and application pressure, especially penetration and elemental status application pressure.
* **`power` / `spellPower`:** own the outgoing damage packages that feed the mitigation pipeline, with `spellPower` also owning healing throughput.

Implementation issue `#70` preserves the same readability and boundedness while moving these systems away from mostly direct primary-stat products.

### Combat Readability

Whenever an entity resolves an action, the UI displays a short-lived skill banner near that unit's portrait (for example, `Casting Mend` or `Casting Rage Strike`) so the player can read combat intent at a glance without relying only on the combat log.

The dungeon UI now also renders transient floating combat events near unit portraits for key outcomes such as damage, healing, `Dodge`, `Parry`, `CRIT`, defeat, plus status application, tick, cleanse, and expiry. This keeps the fast ATB loop readable without bloating the permanent card layout.

### UI Readability Conventions

To support higher-entity encounters (up to five party members and five enemies), the roster presentation follows a few conventions:

* **Living-first ordering:** living entities are listed before defeated ones so the actionable combat state is always near the top of each roster.
* **Compact bars with preserved scanability:** HP, resource, and action-readiness bars remain visible at reduced card density to avoid panel collapse at larger party sizes.
* **Persistent status chips:** active timed effects render as short uppercase chips such as `BRN x2`, `SLW`, `WKN`, `RGN`, `HEX`, or `BLD` so the player can read ongoing pressure and support at a glance without waiting for the combat log. Buff chips (`RGN`) render in emerald green; debuff chips (`BRN`, `SLW`, `WKN`, `HEX`, `BLD`) render in red so polarity is immediately readable even when buffs and debuffs coexist on the same entity.
* **Subtle role labels:** enemy roster cards and the encounter stage surface the current archetype in small uppercase labels so the player can read combat roles without adding a new panel or badge-heavy layout.
* **On-demand derived detail:** secondary stat details (VIT/STR/DEX/INT/WIS) plus combat-facing ratings (`ACC`, `EVA`, `PAR`, `APEN`, `EPEN`, `TEN`), elemental resistances, and active statuses are available via portrait hover/focus tooltip rather than being permanently rendered in every card.
* **Scrollable roster columns:** party and enemy panels remain independently scrollable when total unit count exceeds available viewport height.
* **Anchored combat log:** the middle-column log remains pinned to the bottom of the dungeon view while the encounter showcase keeps a stable footprint, so rapid kills or floor transitions do not cause the log panel to jump upward.
* **Adjustable log depth:** players can still choose how much recent combat history to expose by expanding the log or dragging its resize handle upward for more visible entries.
* **Event-focused filtering:** the `Events` tab highlights crits, dodges, parries, defeats, and similar high-signal outcomes so the player can skim the fight without reading every basic attack line.

### State Updates

The combat loop now advances through a provider-backed `zustand` store action (`stepSimulation`) while the combat math itself lives in pure engine helpers under `src/game/engine/`. This keeps ATB bars and regenerating resources visually in sync without forcing unrelated UI panels to subscribe to every tick. For the architectural rationale behind the migration, see [002 - State Management Evolution](../technicaldecisions/002-state-management-evolution.md).

## Consequences

* **Easier:** Combat remains readable and less deterministic, while the accepted layered model now gives later issues a clear place to move hit, speed, crit, mitigation, and status ownership without redesigning the ATB loop itself.
* **Difficult:** Future combat additions should continue to prefer bounded formulas and explicit caps rather than open-ended avoidance stacking, stun chains, or mitigation bypass that fully invalidates earlier systems.
