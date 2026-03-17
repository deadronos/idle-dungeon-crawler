import { createRecruitHero, type HeroClass } from "./entity";
import { prependCombatMessages } from "./combatLog";
import { canUnlockPartySlot, getNextPartySlotUnlock, getRecruitCost as calculateRecruitCost } from "./partyProgression";
import { synchronizeEquipmentProgression, synchronizeTalentProgression } from "./heroBuilds";
import { buildRecalculatedProgressionState } from "./progressionRules.shared";
import type { GameState } from "./store/types";

export const getPartySlotUnlockState = (state: GameState): Partial<GameState> | null => {
    const nextUnlock = getNextPartySlotUnlock(state.partyCapacity);
    if (!nextUnlock || !canUnlockPartySlot(state.partyCapacity, state.highestFloorCleared) || state.gold.lt(nextUnlock.cost)) {
        return null;
    }

    return {
        gold: state.gold.minus(nextUnlock.cost),
        partyCapacity: nextUnlock.capacity,
        combatLog: prependCombatMessages(state.combatLog, `Party capacity expanded to ${nextUnlock.capacity}.`),
    };
};

export const getRecruitHeroState = (state: GameState, heroClass: HeroClass): Partial<GameState> | null => {
    const cost = calculateRecruitCost(state.party.length);
    if (state.gold.lt(cost) || state.party.length >= state.partyCapacity) {
        return null;
    }

    const newHero = createRecruitHero(heroClass, state.party, state.metaUpgrades, state.prestigeUpgrades);
    const party = [...state.party, newHero];
    const talentProgression = synchronizeTalentProgression(party, state.talentProgression);
    const equipmentProgression = synchronizeEquipmentProgression(party, state.equipmentProgression);

    return {
        gold: state.gold.minus(cost),
        talentProgression,
        equipmentProgression,
        ...buildRecalculatedProgressionState({
            state,
            party,
            talentProgression,
            equipmentProgression,
            combatLogMessages: [`${newHero.name} the ${heroClass} joined the party!`],
        }),
    };
};

export const getRetireHeroState = (state: GameState, heroId: string): Partial<GameState> | null => {
    const heroIndex = state.party.findIndex((hero) => hero.id === heroId);
    if (heroIndex === -1 || heroId === "hero_1") {
        return null;
    }

    const hero = state.party[heroIndex];
    const heroSoulsAwarded = Math.floor(hero.level / 5) * 10;
    const party = [...state.party];
    party.splice(heroIndex, 1);
    const talentProgression = synchronizeTalentProgression(party, state.talentProgression);
    const equipmentProgression = synchronizeEquipmentProgression(party, state.equipmentProgression);

    return {
        talentProgression,
        equipmentProgression,
        ...buildRecalculatedProgressionState({
            state,
            party,
            talentProgression,
            equipmentProgression,
            combatLogMessages:
                heroSoulsAwarded > 0
                    ? [`${hero.name} was retired in exchange for ${heroSoulsAwarded} Hero Souls.`]
                    : [`${hero.name} was dismissed.`],
        }),
        heroSouls: state.heroSouls.plus(heroSoulsAwarded),
    };
};

export const getRetirementHeroSoulReward = (heroLevel: number) => Math.floor(heroLevel / 5) * 10;
