# 004 - Progression, Leveling, and Scaling

**Date:** 2026-03-10
**Status:** Accepted

## Context

Idle games require near-infinite progression paths to maintain engagement. As the player's party delves deeper into the dungeon floors, enemy power must smoothly increase to provide friction over time. We need established rules for how experience is granted, how heroes allocate stat points, and how dungeon difficulties escalate.

## Decision

We established formal scaling mechanisms for both the player party's growth and the opposing enemy dungeon encounters.

As of [007 - Layered Combat Model](007-layered-combat-model.md), progression also carries a structural rule for how combat identity should grow over time:

> final combat stats = core attributes + class template + talents + equipment + temporary effects

This record keeps the current live progression formulas, but future progression systems should add differentiation through those later layers instead of repeatedly expanding the direct workload of `VIT`, `STR`, `DEX`, `INT`, and `WIS`.

### Player Experience and Leveling

When an enemy is defeated, Experience Points (EXP) and Gold are granted to all living party members. Dead party members receive zero.

* **EXP Reward per enemy:** `(Floor * 10) + Enemy VIT`
* **Gold Reward per enemy:** `(Floor * 2) + 5`

**Level Requirement Formula:**
The EXP required to reach the next level grows exponentially:
`Required EXP = floor( 100 * (1.5 ^ (Current Level - 1)) )`

When an EXP threshold is reached, the hero levels up, deducting the required amount, and receiving fixed stat allocations automatically.

* **Warrior:** +2 STR, +2 VIT, +1 DEX, +1 INT, +1 WIS
* **Cleric:** +2 INT, +2 WIS, +1 STR, +1 VIT, +1 DEX
* **Archer:** +2 DEX, +1 STR, +1 VIT, +1 INT, +1 WIS

These growth packages remain the live runtime baseline, but the source of truth for them now lives in [008 - Hero Class Templates, Growth Packages, and Resource Models](008-hero-class-templates.md).

### Layered Progression Sources

Progression should now be understood in layers:

* **Core attributes:** broad identity and baseline scaling
* **Class templates:** baseline combat package, growth profile, and resource model
* **Talents / passives:** compact specialization hooks that change how a class fights without requiring a giant tree
* **Equipment:** low-friction build differentiation that adds targeted combat ratings without turning the game into inventory management
* **Temporary effects:** encounter-specific buffs, debuffs, wards, and similar combat-state modifiers

This keeps progression extensible without creating a wall of new primary stats or requiring manual per-level stat allocation.

### Current Differentiation MVP Baseline

[009 - Differentiation MVP: Class Passives, Talents, Equipment, and Build Surfacing](009-differentiation-mvp-talents-equipment-and-build-surfacing.md) is the current live follow-through for those later progression layers.

The current shipped baseline is intentionally compact:

* each class still has **2** fixed talent picks rather than a full tree
* each talent now has **3** ranks, so the current per-class cap is **6 total talent ranks**
* heroes gain talent points on each **even level**, currently capping once all class talent ranks are filled (levels `2`, `4`, `6`, `8`, `10`, and `12` for the shipped classes)
* heroes equip up to **4** items (`weapon`, `armor`, `charm`, `trinket`)
* equipment now comes from a persistent stash of dropped gear with milestone-gated tiers, simple ranks, and auto-sold overflow

This keeps the first build-differentiation pass readable and easy to tune while still making the layered model playable deeper into the midgame.

### Persistent Gold Upgrades

Gold can be invested into persistent party-wide upgrades before a wipe occurs. The current implementation supports both stat upgrades and long-term party growth through the **Upgrade Shop**.

* **Battle Drills:** Increases all hero damage by `10%` per level.
* **Fortification:** Increases all hero armor by `10%` per level.
* **Party Slot Expansion:** Active party capacity starts at `1` and can be permanently increased to `5` by clearing milestone floors and then purchasing the next slot in the shop.
  * Capacity `2`: clear Floor `3`, then pay `60` Gold
  * Capacity `3`: clear Floor `8`, then pay `180` Gold
  * Capacity `4`: clear Floor `18`, then pay `500` Gold
  * Capacity `5`: clear Floor `28`, then pay `1200` Gold
* **Recruitment:** After an empty slot is available, the player can recruit a new active hero in the shop and choose that hero's class. Duplicate classes are allowed. Recruit costs scale with current party size:
  * Party size `1` → recruit cost `30` Gold
  * Party size `2` → recruit cost `90` Gold
  * Party size `3` → recruit cost `220` Gold
  * Party size `4` → recruit cost `550` Gold

These upgrades persist through wipes, but unspent Gold is still lost on party defeat. They are purchased from a dedicated **Upgrade Shop** section rather than directly inside the dungeon combat view so the player can deliberately switch between fighting and progression planning.

Gold upgrades remain intentionally broad. They are not the primary answer for future class specialization, which should come from templates, talents, equipment, and temporary combat effects instead.

### Enemy Scaling

Dungeon generation scales enemy counts independently from player party size. On standard floors, encounters spawn `ceil(Floor / 5)` enemies, capped at `5` total enemies, so the dungeon still ramps upward in discrete bands as the player climbs. Unlocking or recruiting additional party members does not increase enemy count by itself.
Instead of tracking separate enemy classes, standard monsters scale their internal attributes directly based on the floor number (represented as `level` internally during generation), then receive a lightweight archetype bias:

* `VIT: 5 + (Level * 2)`
* `STR & DEX: 5 + (Level * 1.5)`
* `INT & WIS: 2 + Level`

Archetype composition is deterministic per encounter so the system stays easy to test and tune:

* Floors `1-4`: encounter pool is `Bruiser`, `Skirmisher`
* Floors `5-9`: add `Caster`
* Floors `11+` on standard floors: add at most one `Support`, always placed in the final encounter slot so the stage view does not default to a healer
* The offensive archetypes rotate by floor and encounter slot, so repeated climbs naturally cycle different stat and damage profiles without introducing a huge enemy roster

Archetypes bias both stats and behavior:

* **Bruiser:** higher `VIT` and `STR`, lower `DEX`, high-HP melee pressure
* **Skirmisher:** higher `DEX`, lighter durability, fast ranged pressure
* **Caster:** higher `INT` / `WIS`, lower `STR`, elemental spell pressure
* **Support:** higher `WIS` / `INT`, lighter direct pressure, triage healing and ally protection

**Boss Encounters:**
Every 10th floor is flagged as a Boss floor. Boss floors spawn exactly **one** enemy regardless of player party size, and that generated boss uses a dedicated `Boss` archetype layered on top of floor scaling. Bosses still receive the softened durability / strength multipliers (`VIT * 2`, `STR * 1.3`), but they also gain broader DEX / INT / WIS reinforcement and a deterministic elemental theme for their phase-two spell pressure. This keeps bosses meaningfully tougher than adjacent floors without recreating the old solo/duo progression wall at Floor `10` or pushing the same pacing problem forward to the later slot milestones.

### Between-Floor Recovery

After a victorious encounter, each **surviving** hero now recovers **25% of max HP** before the next encounter begins. This applies both when advancing and when repeating the current floor with `Autoadvance` disabled.

This keeps attrition relevant while avoiding a hard Cleric-only sustain requirement. It also creates a deliberate low-risk strategy: players can farm or repeat a safer floor to stabilize the party before attempting a harder checkpoint.

### Party Wipe & Hard Reset

If all party members reach 0 HP, a wipe is triggered. The party is fully healed, but they are forcibly returned to Floor 1, and the collected Gold is reset to `0`. Levels, purchased persistent upgrades, the highest cleared floor, unlocked party slots, and recruited heroes are retained, forming the core "Idle Loop" where the low floors become exponentially faster to clear due to accumulated power.

### Save-Safe Expansion Rule

Because future differentiation layers introduce new progression fields, additive systems in this area must remain migration-safe.

Issue `#71` implements the current persistence rule:

* save payloads are explicitly versioned
* older payloads are migrated forward step-by-step before runtime hydration
* additive progression layers default through named migration steps instead of ad hoc tolerant parsing
* placeholder progression state for talents and equipment is now part of the canonical save shape, even before those systems have full gameplay behavior

## Consequences

* **Easier:** Auto-allocation of attributes still prevents idle-flow interruption, while the new layered rule creates a cleaner place for later build differentiation systems to live.
* **Easier:** The wipe loop, slot unlocks, and prestige systems can keep functioning while later issues add template, talent, and equipment layers on top.
* **Difficult:** Because the runtime still uses attribute-heavy derived stat math today, the mathematical wall remains sensitive until `#70` redistributes more identity into layered ratings on top of the now-centralized class templates.
