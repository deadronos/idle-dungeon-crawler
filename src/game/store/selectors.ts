import type { GameStore } from "./types";

export const selectPartyHeroes = (state: GameStore) =>
    state.party.filter((entity) => !entity.isEnemy);

export const selectPartyViewState = (state: GameStore) => ({
    talentProgression: state.talentProgression,
    equipmentProgression: state.equipmentProgression,
    unlockTalent: state.unlockTalent,
    equipItem: state.equipItem,
    unequipItem: state.unequipItem,
    sellInventoryItem: state.sellInventoryItem,
    buyInventoryCapacityUpgrade: state.buyInventoryCapacityUpgrade,
    highestFloorCleared: state.highestFloorCleared,
    gold: state.gold,
});

export const selectEntityRosterState = (state: GameStore) => ({
    combatEvents: state.combatEvents,
    talentProgression: state.talentProgression,
    equipmentProgression: state.equipmentProgression,
    retireHero: state.retireHero,
});
