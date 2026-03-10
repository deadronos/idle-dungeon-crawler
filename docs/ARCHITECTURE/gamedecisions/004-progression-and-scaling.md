# 004 - Progression, Leveling, and Scaling

**Date:** 2026-03-10
**Status:** Accepted

## Context

Idle games require near-infinite progression paths to maintain engagement. As the player's party delves deeper into the dungeon floors, enemy power must smoothly increase to provide friction over time. We need established rules for how experience is granted, how heroes allocate stat points, and how dungeon difficulties escalate.

## Decision

We established formal scaling mechanisms for both the player party's growth and the opposing enemy dungeon encounters.

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
* **Archer:** +2 DEX, +1 STR, +1 VIT, +1 INT, +1 WIS, (and a 50% chance for an extra +1 DEX)

### Persistent Gold Upgrades

Gold can be invested into persistent party-wide upgrades before a wipe occurs. The current implementation supports both stat upgrades and long-term party growth through the **Upgrade Shop**.

* **Battle Drills:** Increases all hero damage by `10%` per level.
* **Fortification:** Increases all hero armor by `10%` per level.
* **Party Slot Expansion:** Active party capacity starts at `1` and can be permanently increased to `5` by clearing milestone floors and then purchasing the next slot in the shop.
  * Capacity `2`: clear Floor `3`, then pay `60` Gold
  * Capacity `3`: clear Floor `10`, then pay `180` Gold
  * Capacity `4`: clear Floor `20`, then pay `500` Gold
  * Capacity `5`: clear Floor `35`, then pay `1200` Gold
* **Recruitment:** After an empty slot is available, the player can recruit a new active hero in the shop and choose that hero's class. Duplicate classes are allowed. Recruit costs scale with current party size:
  * Party size `1` → recruit cost `30` Gold
  * Party size `2` → recruit cost `90` Gold
  * Party size `3` → recruit cost `220` Gold
  * Party size `4` → recruit cost `550` Gold

These upgrades persist through wipes, but unspent Gold is still lost on party defeat. They are purchased from a dedicated **Upgrade Shop** section rather than directly inside the dungeon combat view so the player can deliberately switch between fighting and progression planning.

### Enemy Scaling

Dungeon generation spawns between `1` and the current active party size in enemies per floor, capped at `5` total enemies. The floor still acts as the pacing gate, with encounter size increasing gradually as floors rise.
Instead of tracking separate enemy classes, standard monsters scale their internal attributes directly based on the floor number (represented as `level` internally during generation):

* `VIT: 5 + (Level * 2)`
* `STR & DEX: 5 + (Level * 1.5)`
* `INT & WIS: 2 + Level`

**Boss Encounters:**
Every 10th floor is flagged as a Boss floor. The generated enemy on this floor has their final calculated VIT multiplied by `3` and their STR multiplied by `2`, forming massive spikes in required damage and durability to overcome.

### Party Wipe & Hard Reset

If all party members reach 0 HP, a wipe is triggered. The party is fully healed, but they are forcibly returned to Floor 1, and the collected Gold is reset to `0`. Levels, purchased persistent upgrades, the highest cleared floor, unlocked party slots, and recruited heroes are retained, forming the core "Idle Loop" where the low floors become exponentially faster to clear due to accumulated power.

## Consequences

* **Easier:** Auto-allocation of attributes on level-up prevents the user from being interrupted in an idle game. The wipe loop guarantees eventual success just through passive farming.
* **Difficult:** Because enemy VIT and STR scale linearly per level/floor, and the EXP requirement scales exponentially (1.5x each level), there will still be a mathematical "wall" where the enemies eventually out-scale the heroes' raw level-up stats. Persistent upgrades soften this, but additional progression layers (more upgrade paths, loot, or prestige currencies) will still be needed for long-term scaling.
