import { recalculateParty } from "./engine/simulation";
import type { GameState } from "./store/types";

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
