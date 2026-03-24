// Re-export ATB constants from combatFormulas for centralized management
// This maintains backward compatibility while avoiding duplicate constants
export { ATB_CONFIG as default } from "./combatFormulas";

// Game timing constants (not related to combat formulas)
export const GAME_TICK_RATE = 20;
export const GAME_TICK_MS = 1000 / GAME_TICK_RATE;

// Re-export specific ATB values for existing consumers
// DEPRECATED: Use ATB_CONFIG from combatFormulas instead
export const ATB_RATE = 2;
export const HASTE_ATB_RATE = 0.08;
