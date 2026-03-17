import type { CombatEvent } from "../store/types";

import { GAME_TICK_RATE } from "./constants";

export const SKILL_BANNER_TICKS = GAME_TICK_RATE;
export const COMBAT_EVENT_TICKS = Math.round(GAME_TICK_RATE * 1.4);

let combatEventSequence = 0;

export const createCombatEvent = (event: Omit<CombatEvent, "id">): CombatEvent => {
    combatEventSequence += 1;

    return {
        ...event,
        id: `combat-event-${combatEventSequence}`,
    };
};

export const decrementCombatEvents = (events: CombatEvent[]) => {
    return events
        .map((event) => ({ ...event, ttlTicks: event.ttlTicks - 1 }))
        .filter((event) => event.ttlTicks > 0);
};
