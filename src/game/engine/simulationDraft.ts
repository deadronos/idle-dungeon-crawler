import type { HeroBuildState } from "../heroBuilds";
import type { GameState } from "../store/types";

import { cloneEntity } from "./encounter";

export type ImmediateSimulationOutcome = "running" | "paused" | "victory" | "party-wipe";

const hasActiveSkillBanners = (entities: GameState["party"] | GameState["enemies"]) => entities.some((entity) => entity.activeSkillTicks > 0);
const hasLivingEntities = (entities: GameState["party"] | GameState["enemies"]) => entities.some((entity) => entity.currentHp.gt(0));

export const hasPendingSimulationVisuals = (state: Pick<GameState, "combatEvents" | "party" | "enemies">) => {
    return state.combatEvents.length > 0 || hasActiveSkillBanners(state.party) || hasActiveSkillBanners(state.enemies);
};

export const getImmediateSimulationOutcome = (
    state: Pick<GameState, "party" | "enemies" | "autoFight">,
): ImmediateSimulationOutcome => {
    if (!hasLivingEntities(state.party)) {
        return "party-wipe";
    }

    if (!hasLivingEntities(state.enemies)) {
        return "victory";
    }

    if (!state.autoFight) {
        return "paused";
    }

    return "running";
};

export const createSimulationBuildState = (
    state: Pick<GameState, "talentProgression" | "equipmentProgression">,
): HeroBuildState => ({
    talentProgression: state.talentProgression,
    equipmentProgression: state.equipmentProgression,
});

export const createSimulationDraft = (state: GameState): GameState => ({
    ...state,
    party: state.party.map(cloneEntity),
    enemies: state.enemies.map(cloneEntity),
    gold: state.gold,
    combatLog: [...state.combatLog],
    combatEvents: state.combatEvents.map((event) => ({ ...event })),
    metaUpgrades: { ...state.metaUpgrades },
    talentProgression: {
        talentRanksByHeroId: Object.fromEntries(
            Object.entries(state.talentProgression.talentRanksByHeroId).map(([heroId, talentRanks]) => [heroId, { ...talentRanks }]),
        ),
        talentPointsByHeroId: { ...state.talentProgression.talentPointsByHeroId },
    },
    equipmentProgression: {
        inventoryItems: state.equipmentProgression.inventoryItems.map((item) => ({ ...item, affinityTags: [...item.affinityTags] })),
        equippedItemInstanceIdsByHeroId: Object.fromEntries(
            Object.entries(state.equipmentProgression.equippedItemInstanceIdsByHeroId).map(([heroId, itemIds]) => [heroId, [...itemIds]]),
        ),
        highestUnlockedEquipmentTier: state.equipmentProgression.highestUnlockedEquipmentTier,
        inventoryCapacityLevel: state.equipmentProgression.inventoryCapacityLevel,
        inventoryCapacity: state.equipmentProgression.inventoryCapacity,
        nextInstanceSequence: state.equipmentProgression.nextInstanceSequence,
    },
});
