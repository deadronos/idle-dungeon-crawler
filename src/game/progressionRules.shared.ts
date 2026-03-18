import { recalculateParty } from "./engine/simulation";
import { prependCombatMessages } from "./combatLog";
import type { Entity } from "./entity";
import type { GameState } from "./store/types";

const heroLookupCache = new WeakMap<Entity[], Map<string, Entity>>();

export const findHeroById = (party: Entity[], heroId: string): Entity | null => {
    let lookup = heroLookupCache.get(party);
    if (!lookup) {
        lookup = new Map(party.map((hero) => [hero.id, hero]));
        heroLookupCache.set(party, lookup);
    }
    return lookup.get(heroId) ?? null;
};

export const getRecalculatedParty = ({
    state,
    party,
    talentProgression = state.talentProgression,
    equipmentProgression = state.equipmentProgression,
    metaUpgrades = state.metaUpgrades,
    prestigeUpgrades = state.prestigeUpgrades,
}: {
    state: GameState;
    party: GameState["party"];
    talentProgression?: GameState["talentProgression"];
    equipmentProgression?: GameState["equipmentProgression"];
    metaUpgrades?: GameState["metaUpgrades"];
    prestigeUpgrades?: GameState["prestigeUpgrades"];
}) => recalculateParty(party, metaUpgrades, prestigeUpgrades, {
    talentProgression,
    equipmentProgression,
});

interface RecalculatedProgressionStateArgs {
    state: GameState;
    party: GameState["party"];
    talentProgression?: GameState["talentProgression"];
    equipmentProgression?: GameState["equipmentProgression"];
    metaUpgrades?: GameState["metaUpgrades"];
    prestigeUpgrades?: GameState["prestigeUpgrades"];
    combatLogMessages?: string[];
}

export const buildRecalculatedProgressionState = ({
    state,
    party,
    talentProgression = state.talentProgression,
    equipmentProgression = state.equipmentProgression,
    metaUpgrades = state.metaUpgrades,
    prestigeUpgrades = state.prestigeUpgrades,
    combatLogMessages = [],
}: RecalculatedProgressionStateArgs): Partial<GameState> => {
    const nextState: Partial<GameState> = {
        party: getRecalculatedParty({
            state,
            party,
            talentProgression,
            equipmentProgression,
            metaUpgrades,
            prestigeUpgrades,
        }),
    };

    if (combatLogMessages.length > 0) {
        nextState.combatLog = prependCombatMessages(state.combatLog, ...combatLogMessages);
    }

    return nextState;
};
