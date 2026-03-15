import {
    GAME_TICK_MS,
    getPostVictoryFloorReplayState,
    getPostVictoryFloorTransitionState,
    getFloorTransitionState,
    getInitializedPartyState,
    getPartyWipeState,
    prependCombatMessages,
    simulateTick,
} from "../engine/simulation";
import { formatEquipmentTierRank, getHighestUnlockedEquipmentTier, grantVictoryLoot } from "../equipmentProgression";
import { getEquipmentDefinition } from "../heroBuilds";
import { getNextPartySlotUnlock } from "../partyProgression";
import { selectProgressionState } from "./progressionSlice";
import type { GameState, GameStateCreator, HotSimulationActions, HotSimulationSlice } from "./types";

export const selectHotSimulationState = (state: GameState): HotSimulationSlice => ({
    party: state.party,
    enemies: state.enemies,
    gold: state.gold,
    floor: state.floor,
    autoFight: state.autoFight,
    autoAdvance: state.autoAdvance,
    combatLog: state.combatLog,
    combatEvents: state.combatEvents,
});

export const createHotSimulationSlice = (
    initialState: HotSimulationSlice,
): GameStateCreator<HotSimulationSlice & HotSimulationActions> => {
    return (set, get) => ({
        ...initialState,
        toggleAutoFight: () => {
            set((state) => ({ autoFight: !state.autoFight }));
        },
        toggleAutoAdvance: () => {
            set((state) => ({ autoAdvance: !state.autoAdvance }));
        },
        nextFloor: () => {
            set((state) => getFloorTransitionState(state, state.floor + 1));
        },
        previousFloor: () => {
            const { floor } = get();
            if (floor <= 1) {
                return;
            }

            set((state) => getFloorTransitionState(state, state.floor - 1));
        },
        appendCombatLog: (message: string) => {
            set((state) => ({ combatLog: prependCombatMessages(state.combatLog, message) }));
        },
        addMessage: (message: string) => {
            get().appendCombatLog(message);
        },
        initializeParty: (party) => {
            set((state) => getInitializedPartyState(state, party));
        },
        handlePartyWipe: () => {
            set((state) => getPartyWipeState(state));
        },
        stepSimulation: (deltaMs = GAME_TICK_MS) => {
            const stepCount = Math.max(1, Math.floor(deltaMs / GAME_TICK_MS));

            let nextState: GameState = {
                ...selectHotSimulationState(get()),
                ...selectProgressionState(get()),
                activeSection: get().activeSection,
            };

            for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
                const result = simulateTick(nextState);
                nextState = result.state;

                if (result.outcome === "party-wipe") {
                    nextState = { ...nextState, ...getPartyWipeState(nextState) };
                    break;
                }

                if (result.outcome === "victory") {
                    const clearedFloor = nextState.floor;
                    const highestFloorCleared = Math.max(nextState.highestFloorCleared, clearedFloor);
                    const previousHighestTier = nextState.equipmentProgression.highestUnlockedEquipmentTier;

                    if (highestFloorCleared !== nextState.highestFloorCleared) {
                        const nextUnlock = getNextPartySlotUnlock(nextState.partyCapacity);
                        const hasUnlockedNextSlot = nextUnlock && highestFloorCleared >= nextUnlock.milestoneFloor;

                        nextState = {
                            ...nextState,
                            highestFloorCleared,
                            combatLog: hasUnlockedNextSlot
                                ? prependCombatMessages(nextState.combatLog, `A new party slot can now be unlocked in the shop.`)
                                : nextState.combatLog,
                        };
                    }

                    const lootResult = grantVictoryLoot(
                        nextState.equipmentProgression,
                        nextState.party,
                        clearedFloor,
                        highestFloorCleared,
                        { next: () => Math.random() },
                    );
                    const unlockedTier = getHighestUnlockedEquipmentTier(highestFloorCleared);
                    const lootMessages = [
                        unlockedTier > previousHighestTier ? `Armory tier ${unlockedTier} is now available.` : null,
                        ...lootResult.gainedItems.map((item) => {
                            const definition = getEquipmentDefinition(item.definitionId);
                            return definition ? `Found ${definition.name} ${formatEquipmentTierRank(item)}.` : null;
                        }),
                        ...lootResult.autoSoldItems.map((item) => {
                            const definition = getEquipmentDefinition(item.definitionId);
                            return definition ? `${definition.name} ${formatEquipmentTierRank(item)} auto-sold for ${item.sellValue} gold.` : null;
                        }),
                    ].filter((message): message is string => Boolean(message));

                    nextState = {
                        ...nextState,
                        gold: nextState.gold.plus(lootResult.autoSellGold),
                        equipmentProgression: lootResult.equipmentProgression,
                        combatLog: lootMessages.length > 0 ? prependCombatMessages(nextState.combatLog, ...lootMessages) : nextState.combatLog,
                    };

                    if (nextState.autoAdvance) {
                        nextState = { ...nextState, ...getPostVictoryFloorTransitionState(nextState, nextState.floor + 1) };
                    } else {
                        nextState = { ...nextState, ...getPostVictoryFloorReplayState(nextState) };
                    }
                    break;
                }
            }

            set(nextState);
        },
    });
};
