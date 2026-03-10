# 004 - Progression, Leveling, and Scaling

**Date:** 2026-03-10
**Status:** Accepted

## Context
Idle games require near-infinite progression paths to maintain engagement. As the player's party delves deeper into the dungeon floors, enemy power must smoothly increase to provide friction over time. We need established rules for how experience is granted, how heroes allocate stat points, and how dungeon difficulties escalate.

## Decision
We established formal scaling mechanisms for both the player party's growth and the opposing enemy dungeon encounters.

### Player Experience and Leveling
When an enemy is defeated, Experience Points (EXP) and Gold are granted to all living party members. Dead party members receive zero.

*   **EXP Reward per enemy:** `(Floor * 10) + Enemy VIT`
*   **Gold Reward per enemy:** `Floor * 2`

**Level Requirement Formula:**
The EXP required to reach the next level grows exponentially:
`Required EXP = floor( 100 * (1.5 ^ (Current Level - 1)) )`

When an EXP threshold is reached, the hero levels up, deducting the required amount, and receiving fixed stat allocations automatically.
*   **Warrior:** +2 STR, +2 VIT, +1 DEX, +1 INT, +1 WIS
*   **Cleric:** +2 INT, +2 WIS, +1 STR, +1 VIT, +1 DEX
*   **Archer:** +2 DEX, +1 STR, +1 VIT, +1 INT, +1 WIS, (and a 50% chance for an extra +1 DEX)

### Enemy Scaling
Dungeon generation spawns between 1 to 3 enemies per floor (scaling gently up to 3 as floors increase up to Floor 15).
Instead of tracking separate enemy classes, standard monsters scale their internal attributes directly based on the floor number (represented as `level` internally during generation):

*   `VIT: 5 + (Level * 2)`
*   `STR & DEX: 5 + (Level * 1.5)`
*   `INT & WIS: 2 + Level`

**Boss Encounters:**
Every 10th floor is flagged as a Boss floor. The generated enemy on this floor has their final calculated VIT multiplied by `3` and their STR multiplied by `2`, forming massive spikes in required damage and durability to overcome.

### Party Wipe & Hard Reset
If all party members reach 0 HP, a wipe is triggered. The party is fully healed, but they are forcibly returned to Floor 1, and the collected Gold is reset to `0`. Levels and equipment are retained, forming the core "Idle Loop" where the low floors become exponentially faster to clear due to accumulated power.

## Consequences
*   **Easier:** Auto-allocation of attributes on level-up prevents the user from being interrupted in an idle game. The wipe loop guarantees eventual success just through passive farming.
*   **Difficult:** Because enemy VIT and STR scale linearly per level/floor, and the EXP requirement scales exponentially (1.5x each level), there will be a mathematical "wall" where the enemies out-scale the heroes' raw level-up stats, necessitating external prestige/meta-progression systems (such as using Gold for persistent upgrades or introducing RNG loot) to bridge the gap in late-game floors.
