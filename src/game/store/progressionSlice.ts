import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "../upgrades";
import { createRecruitHero } from "../entity";
import { prependCombatMessages, recalculateParty } from "../engine/simulation";
import { getNextPartySlotUnlock as getNextSlotUnlock, getRecruitCost as calculateRecruitCost } from "../partyProgression";
import type { GameState, GameStateCreator, ProgressionActions, ProgressionSlice } from "./types";

export const selectProgressionState = (state: GameState): ProgressionSlice => ({
    metaUpgrades: state.metaUpgrades,
    partyCapacity: state.partyCapacity,
    maxPartySize: state.maxPartySize,
    highestFloorCleared: state.highestFloorCleared,
});

export const createProgressionSlice = (
    initialState: ProgressionSlice,
): GameStateCreator<ProgressionSlice & ProgressionActions> => {
    return (set, get) => ({
        ...initialState,
        getTrainingUpgradeCost: () => {
            return calculateTrainingUpgradeCost(get().metaUpgrades.training);
        },
        buyTrainingUpgrade: () => {
            set((state) => {
                const cost = calculateTrainingUpgradeCost(state.metaUpgrades.training);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const nextUpgrades = { ...state.metaUpgrades, training: state.metaUpgrades.training + 1 };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: nextUpgrades,
                    party: recalculateParty(state.party, nextUpgrades),
                    combatLog: prependCombatMessages(state.combatLog, `Battle Drills improved to Lv ${nextUpgrades.training}.`),
                };
            });
        },
        getFortificationUpgradeCost: () => {
            return calculateFortificationUpgradeCost(get().metaUpgrades.fortification);
        },
        buyFortificationUpgrade: () => {
            set((state) => {
                const cost = calculateFortificationUpgradeCost(state.metaUpgrades.fortification);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const nextUpgrades = { ...state.metaUpgrades, fortification: state.metaUpgrades.fortification + 1 };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: nextUpgrades,
                    party: recalculateParty(state.party, nextUpgrades),
                    combatLog: prependCombatMessages(state.combatLog, `Fortification improved to Lv ${nextUpgrades.fortification}.`),
                };
            });
        },
        getNextPartySlotUnlock: () => {
            return getNextSlotUnlock(get().partyCapacity);
        },
        unlockPartySlot: () => {
            set((state) => {
                const nextUnlock = getNextSlotUnlock(state.partyCapacity);
                if (!nextUnlock) {
                    return {};
                }

                if (state.highestFloorCleared < nextUnlock.milestoneFloor) {
                    return {};
                }

                if (state.gold.lt(nextUnlock.cost)) {
                    return {};
                }

                return {
                    gold: state.gold.minus(nextUnlock.cost),
                    partyCapacity: nextUnlock.capacity,
                    combatLog: prependCombatMessages(state.combatLog, `Party capacity expanded to ${nextUnlock.capacity}.`),
                };
            });
        },
        getRecruitCost: () => {
            return calculateRecruitCost(get().party.length);
        },
        recruitHero: (heroClass) => {
            set((state) => {
                if (state.party.length >= state.partyCapacity) {
                    return {};
                }

                const cost = calculateRecruitCost(state.party.length);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const recruit = createRecruitHero(heroClass, state.party, state.metaUpgrades);

                return {
                    gold: state.gold.minus(cost),
                    party: [...state.party, recruit],
                    combatLog: prependCombatMessages(state.combatLog, `${recruit.name} the ${heroClass} joined the party.`),
                };
            });
        },
    });
};