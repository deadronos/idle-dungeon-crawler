# 006 - Hero Retirement & Prestige Mechanics

**Date:** 2026-03-10
**Status:** Accepted

## Context

As the player progresses deeper into the dungeon and recruits more heroes, Gold remains the short- and mid-run currency for repeatable upgrades such as `Battle Drills` and `Fortification`, plus roster-growth purchases in the shop. To provide a deeper, long-term progression system without resetting the entire game state (a "soft wipe"), we introduced the **Hero Retirement** mechanic.

## Decision

Players can now permanently retire recruited heroes in exchange for a premium currency: **Hero Souls**. These souls are spent at the **Altar of Souls** (the prestige shop) for account-wide, permanent meta-upgrades that persist forever and modify the core mathematical scaling of the game.

### Retirement Rules

1. **Minimum Level to earn Souls:** While any non-starter hero can be dismissed, they must be at least Level 5 to yield any Hero Souls upon retirement.
2. **Anchor Protection:** The starter hero (`hero_1`) cannot be retired under any circumstance. The player must always have at least one character to continue progressing or farming gold.
3. **Reward Formula:** Souls reward scales with the level of the retired hero: `floor(Hero Level / 5) * 10`.
   - *Example:* Level 5 grants 10 souls; Level 10 grants 20 souls.

### Altar of Souls (Prestige Upgrades)

The Altar provides upgrades that alter fundamental game mechanics, not just flat stat boosts (which gold already covers).

1. **Greed (Gold Cost Reducer)**
   - *Effect:* Reduces the exponential growth rate of the repeatable Gold-based stat upgrades (`Battle Drills`, `Fortification`).
   - *Mechanic:* The cost formula dynamically subtracts `(level * 0.01)` from each upgrade's distinct base growth rate, down to a minimum rate of `1.05`. Each level of Greed makes those upgrades significantly cheaper over time.

2. **Vitality (HP Multiplier)**
   - *Effect:* Increases the base HP scaling per point of VIT.
   - *Mechanic:* Base HP calculation changes from `50 + (vit * 10)` to `50 + (vit * (10 + level))`. This provides massive late-game survivability.

3. **Haste (Game Speed Booster)**
   - *Effect:* Increases the global game tick speed multiplier.
   - *Mechanic:* Every level provides a +10% `hasteBonus` to the overall `actionProgress` accumulation rate, making heroes attack and cast spells faster across the board.

4. **Insight (XP Multiplier)**
   - *Effect:* Increases experience gained from all defeated enemies.
   - *Mechanic:* Each level grants a flat +60% multiplier to the base experience calculation (`baseExp * (1 + level * 0.6)`). This now acts as both a replacement catch-up mechanic and a first-region pacing lever so late first-region levels remain reachable without touching Haste or other more runaway-sensitive prestige knobs.

## Consequences

- **Positive:** Introduces a compelling choice (sacrificing a high-level hero) for long-term power. It provides a prestige system without the friction of a total progress wipe.
- **Negative:** The player must re-grind a new hero from Level 1 after a retirement, requiring careful UI communication (via a confirmation dialog) so players don't accidentally ruin their active party composition.
