import { getFortificationUpgradeCost as calculateFortificationUpgradeCost, getTrainingUpgradeCost as calculateTrainingUpgradeCost } from "../upgrades";
import { createRecruitHero } from "../entity";
import type { HeroClass } from "../entity";
import { canSellInventoryItem, getNextInventoryCapacityUpgrade } from "../equipmentProgression";
import {
    findEquipableInventoryItem,
    resolveEquipmentItem,
    getEquipmentInstance,
    getEquipmentOwnerId,
    getTalentDefinition,
    synchronizeEquipmentProgression,
    synchronizeTalentProgression,
    type HeroBuildState,
} from "../heroBuilds";
import { prependCombatMessages, recalculateParty } from "../engine/simulation";
import { getNextPartySlotUnlock as getNextSlotUnlock, getRecruitCost as calculateRecruitCost } from "../partyProgression";
import type { GameState, GameStateCreator, PrestigeUpgrades, ProgressionActions, ProgressionSlice } from "./types";

export const PRESTIGE_BASE_COSTS: Record<keyof PrestigeUpgrades, number> = {
    costReducer: 10,
    hpMultiplier: 15,
    gameSpeed: 25,
    xpMultiplier: 10,
};

export const selectProgressionState = (state: GameState): ProgressionSlice => ({
    metaUpgrades: state.metaUpgrades,
    partyCapacity: state.partyCapacity,
    maxPartySize: state.maxPartySize,
    highestFloorCleared: state.highestFloorCleared,
    heroSouls: state.heroSouls,
    prestigeUpgrades: state.prestigeUpgrades,
    talentProgression: state.talentProgression,
    equipmentProgression: state.equipmentProgression,
});

export const createProgressionSlice = (
    initialState: ProgressionSlice,
): GameStateCreator<ProgressionSlice & ProgressionActions> => {
    const getBuildState = (state: Pick<GameState, "talentProgression" | "equipmentProgression">): HeroBuildState => ({
        talentProgression: state.talentProgression,
        equipmentProgression: state.equipmentProgression,
    });

    return (set, get) => ({
        ...initialState,
        getTrainingUpgradeCost: () => {
            const state = get();
            return calculateTrainingUpgradeCost(state.metaUpgrades.training, state.prestigeUpgrades.costReducer);
        },
        buyTrainingUpgrade: () => {
            set((state) => {
                const cost = calculateTrainingUpgradeCost(state.metaUpgrades.training, state.prestigeUpgrades.costReducer);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const newUpgrades = {
                    ...state.metaUpgrades,
                    training: state.metaUpgrades.training + 1,
                };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: newUpgrades,
                    party: recalculateParty(state.party, newUpgrades, state.prestigeUpgrades, getBuildState(state)),
                };
            });
        },
        getFortificationUpgradeCost: () => {
            const state = get();
            return calculateFortificationUpgradeCost(state.metaUpgrades.fortification, state.prestigeUpgrades.costReducer);
        },
        buyFortificationUpgrade: () => {
            set((state) => {
                const cost = calculateFortificationUpgradeCost(state.metaUpgrades.fortification, state.prestigeUpgrades.costReducer);
                if (state.gold.lt(cost)) {
                    return {};
                }

                const nextUpgrades = { ...state.metaUpgrades, fortification: state.metaUpgrades.fortification + 1 };

                return {
                    gold: state.gold.minus(cost),
                    metaUpgrades: nextUpgrades,
                    party: recalculateParty(state.party, nextUpgrades, state.prestigeUpgrades, getBuildState(state)),
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
        getInventoryCapacityUpgradeCost: () => {
            return getNextInventoryCapacityUpgrade(get().equipmentProgression.inventoryCapacityLevel)?.cost ?? null;
        },
        recruitHero: (heroClass) => {
            set((state) => {
                const cost = calculateRecruitCost(state.party.length);
                if (state.gold.lt(cost) || state.party.length >= state.partyCapacity) {
                    return {};
                }

                const newHero = createRecruitHero(heroClass, state.party, state.metaUpgrades, state.prestigeUpgrades);
                const nextParty = [...state.party, newHero];
                const talentProgression = synchronizeTalentProgression(nextParty, state.talentProgression);
                const equipmentProgression = synchronizeEquipmentProgression(nextParty, state.equipmentProgression);

                return {
                    gold: state.gold.minus(cost),
                    party: recalculateParty(nextParty, state.metaUpgrades, state.prestigeUpgrades, {
                        talentProgression,
                        equipmentProgression,
                    }),
                    talentProgression,
                    equipmentProgression,
                    combatLog: prependCombatMessages(state.combatLog, `${newHero.name} the ${heroClass} joined the party!`),
                };
            });
        },
        retireHero: (heroId: string) => {
            set((state) => {
                const heroIndex = state.party.findIndex((h) => h.id === heroId);
                if (heroIndex === -1 || heroId === "hero_1") {
                    return {}; // Cannot retire starter hero or hero not found
                }

                const hero = state.party[heroIndex];
                
                // floor(Level / 5) * 10 Souls
                const soulsAwarded = Math.floor(hero.level / 5) * 10;
                
                const newParty = [...state.party];
                newParty.splice(heroIndex, 1);
                const talentProgression = synchronizeTalentProgression(newParty, state.talentProgression);
                const equipmentProgression = synchronizeEquipmentProgression(newParty, state.equipmentProgression);

                return {
                    party: recalculateParty(newParty, state.metaUpgrades, state.prestigeUpgrades, {
                        talentProgression,
                        equipmentProgression,
                    }),
                    talentProgression,
                    equipmentProgression,
                    heroSouls: state.heroSouls.plus(soulsAwarded),
                    combatLog: prependCombatMessages(
                        state.combatLog,
                        soulsAwarded > 0
                            ? `${hero.name} was retired in exchange for ${soulsAwarded} Hero Souls.`
                            : `${hero.name} was dismissed.`
                    ),
                };
            });
        },
        unlockTalent: (heroId: string, talentId: string) => {
            set((state) => {
                const hero = state.party.find((partyMember) => partyMember.id === heroId);
                const talentDefinition = getTalentDefinition(talentId);

                if (!hero || !talentDefinition || talentDefinition.heroClass !== hero.class) {
                    return {};
                }

                const heroTalentRanks = state.talentProgression.talentRanksByHeroId[heroId] ?? {};
                const currentRank = heroTalentRanks[talentId] ?? 0;
                const availablePoints = state.talentProgression.talentPointsByHeroId[heroId] ?? 0;
                if (availablePoints <= 0 || currentRank >= (talentDefinition.maxRank ?? 3)) {
                    return {};
                }

                const nextRank = currentRank + 1;

                const talentProgression = synchronizeTalentProgression(state.party, {
                    talentRanksByHeroId: {
                        ...state.talentProgression.talentRanksByHeroId,
                        [heroId]: {
                            ...heroTalentRanks,
                            [talentId]: nextRank,
                        },
                    },
                    talentPointsByHeroId: {
                        ...state.talentProgression.talentPointsByHeroId,
                        [heroId]: availablePoints - 1,
                    },
                });

                return {
                    talentProgression,
                    party: recalculateParty(state.party, state.metaUpgrades, state.prestigeUpgrades, {
                        talentProgression,
                        equipmentProgression: state.equipmentProgression,
                    }),
                    combatLog: prependCombatMessages(
                        state.combatLog,
                        currentRank === 0
                            ? `${hero.name} learned ${talentDefinition.name} (Rank ${nextRank}).`
                            : `${hero.name} upgraded ${talentDefinition.name} to Rank ${nextRank}.`,
                    ),
                };
            });
        },
        equipItem: (heroId: string, itemId: string) => {
            set((state) => {
                const hero = state.party.find((partyMember) => partyMember.id === heroId);
                if (!hero || hero.isEnemy) {
                    return {};
                }
                const heroClass = hero.class as HeroClass;
                const item = findEquipableInventoryItem(itemId, heroClass, state.equipmentProgression);
                if (!item) {
                    return {};
                }

                const ownerId = getEquipmentOwnerId(item.id, state.equipmentProgression);
                if (ownerId && ownerId !== heroId) {
                    return {};
                }

                const currentItemIds = state.equipmentProgression.equippedItemInstanceIdsByHeroId[heroId] ?? [];
                const nextItemIds = currentItemIds
                    .filter((equippedItemId) => getEquipmentInstance(equippedItemId, state.equipmentProgression)?.slot !== item.slot)
                    .concat(item.id);

                const equipmentProgression = synchronizeEquipmentProgression(state.party, {
                    ...state.equipmentProgression,
                    equippedItemInstanceIdsByHeroId: {
                        ...state.equipmentProgression.equippedItemInstanceIdsByHeroId,
                        [heroId]: nextItemIds,
                    },
                });

                return {
                    equipmentProgression,
                    party: recalculateParty(state.party, state.metaUpgrades, state.prestigeUpgrades, {
                        talentProgression: state.talentProgression,
                        equipmentProgression,
                    }),
                    combatLog: prependCombatMessages(state.combatLog, `${hero.name} equipped ${item.name}.`),
                };
            });
        },
        unequipItem: (heroId, slot) => {
            set((state) => {
                const hero = state.party.find((partyMember) => partyMember.id === heroId);
                if (!hero) {
                    return {};
                }

                const currentItemIds = state.equipmentProgression.equippedItemInstanceIdsByHeroId[heroId] ?? [];
                const nextItemIds = currentItemIds.filter((itemId) => getEquipmentInstance(itemId, state.equipmentProgression)?.slot !== slot);
                if (nextItemIds.length === currentItemIds.length) {
                    return {};
                }

                const equipmentProgression = synchronizeEquipmentProgression(state.party, {
                    ...state.equipmentProgression,
                    equippedItemInstanceIdsByHeroId: {
                        ...state.equipmentProgression.equippedItemInstanceIdsByHeroId,
                        [heroId]: nextItemIds,
                    },
                });

                return {
                    equipmentProgression,
                    party: recalculateParty(state.party, state.metaUpgrades, state.prestigeUpgrades, {
                        talentProgression: state.talentProgression,
                        equipmentProgression,
                    }),
                    combatLog: prependCombatMessages(state.combatLog, `${hero.name} cleared their ${slot} slot.`),
                };
            });
        },
        buyInventoryCapacityUpgrade: () => {
            set((state) => {
                const nextUpgrade = getNextInventoryCapacityUpgrade(state.equipmentProgression.inventoryCapacityLevel);
                if (!nextUpgrade || state.highestFloorCleared < nextUpgrade.milestoneFloor || state.gold.lt(nextUpgrade.cost)) {
                    return {};
                }

                const equipmentProgression = synchronizeEquipmentProgression(state.party, {
                    ...state.equipmentProgression,
                    inventoryCapacityLevel: nextUpgrade.level,
                    inventoryCapacity: nextUpgrade.capacity,
                });

                return {
                    gold: state.gold.minus(nextUpgrade.cost),
                    equipmentProgression,
                    combatLog: prependCombatMessages(state.combatLog, `Inventory capacity expanded to ${nextUpgrade.capacity}.`),
                };
            });
        },
        sellInventoryItem: (itemInstanceId: string) => {
            set((state) => {
                if (!canSellInventoryItem(itemInstanceId, state.equipmentProgression)) {
                    return {};
                }

                const item = getEquipmentInstance(itemInstanceId, state.equipmentProgression);
                if (!item) {
                    return {};
                }
                const resolvedItem = resolveEquipmentItem(item);

                const equipmentProgression = synchronizeEquipmentProgression(state.party, {
                    ...state.equipmentProgression,
                    inventoryItems: state.equipmentProgression.inventoryItems.filter((inventoryItem) => inventoryItem.instanceId !== itemInstanceId),
                });

                return {
                    gold: state.gold.plus(item.sellValue),
                    equipmentProgression,
                    combatLog: prependCombatMessages(
                        state.combatLog,
                        `Sold ${resolvedItem?.name ?? item.definitionId} for ${item.sellValue} gold.`,
                    ),
                };
            });
        },
        getPrestigeUpgradeCost: (upgradeId: keyof PrestigeUpgrades) => {
            const currentLevel = get().prestigeUpgrades[upgradeId];
            return Math.floor(PRESTIGE_BASE_COSTS[upgradeId] * Math.pow(1.5, currentLevel));
        },
        buyPrestigeUpgrade: (upgradeId: keyof PrestigeUpgrades) => {
            set((state) => {
                const currentLevel = state.prestigeUpgrades[upgradeId];
                const cost = Math.floor(PRESTIGE_BASE_COSTS[upgradeId] * Math.pow(1.5, currentLevel));
                
                if (state.heroSouls.lt(cost)) {
                    return {};
                }

                const names: Record<keyof PrestigeUpgrades, string> = {
                    costReducer: "Greed (Gold Cost Reducer)",
                    hpMultiplier: "Vitality (HP Multiplier)",
                    gameSpeed: "Haste (Game Speed Booster)",
                    xpMultiplier: "Insight (XP Multiplier)",
                };

                const newPrestigeUpgrades = {
                    ...state.prestigeUpgrades,
                    [upgradeId]: currentLevel + 1,
                };

                return {
                    heroSouls: state.heroSouls.minus(cost),
                    prestigeUpgrades: newPrestigeUpgrades,
                    party: recalculateParty(state.party, state.metaUpgrades, newPrestigeUpgrades, getBuildState(state)),
                    combatLog: prependCombatMessages(state.combatLog, `Altar of Souls: Purchased ${names[upgradeId]} Lv ${currentLevel + 1}.`),
                };
            });
        },
    });
};
