import { prependCombatMessages } from "./combatLog";
import { getTalentDefinition, synchronizeTalentProgression } from "./heroBuilds";
import { getRecalculatedParty } from "./progressionRules.shared";
import type { GameState } from "./store/types";

export const getTalentUnlockState = (state: GameState, heroId: string, talentId: string): Partial<GameState> | null => {
    const hero = state.party.find((partyMember) => partyMember.id === heroId);
    const talentDefinition = getTalentDefinition(talentId);

    if (!hero || !talentDefinition || talentDefinition.heroClass !== hero.class) {
        return null;
    }

    const heroTalentRanks = state.talentProgression.talentRanksByHeroId[heroId] ?? {};
    const currentRank = heroTalentRanks[talentId] ?? 0;
    const availablePoints = state.talentProgression.talentPointsByHeroId[heroId] ?? 0;
    if (availablePoints <= 0 || currentRank >= (talentDefinition.maxRank ?? 3)) {
        return null;
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
        party: getRecalculatedParty({ state, party: state.party, talentProgression }),
        combatLog: prependCombatMessages(
            state.combatLog,
            currentRank === 0
                ? `${hero.name} learned ${talentDefinition.name} (Rank ${nextRank}).`
                : `${hero.name} upgraded ${talentDefinition.name} to Rank ${nextRank}.`,
        ),
    };
};
