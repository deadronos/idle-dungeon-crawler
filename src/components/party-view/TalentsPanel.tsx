import type React from "react";

import {
    getHeroBuildProfile,
    getTalentDefinitionsForClass,
    getTalentPointsForHero,
    getTalentRankForHero,
    getTotalTalentRankCapacity,
    getSpentTalentRanksForHero,
} from "@/game/heroBuilds";
import type { Entity, HeroClass } from "@/game/entity";
import type { EquipmentProgressionState, TalentProgressionState } from "@/game/store/types";
import { Button } from "@/components/ui/button";

export const TalentsPanel: React.FC<{
    hero: Entity;
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
    unlockTalent: (heroId: string, talentId: string) => void;
}> = ({ hero, talentProgression, equipmentProgression, unlockTalent }) => {
    const heroClass = hero.class as HeroClass;
    const availableTalents = getTalentDefinitionsForClass(heroClass);
    const buildProfile = getHeroBuildProfile(hero, {
        talentProgression,
        equipmentProgression,
    });
    const talentPoints = getTalentPointsForHero(hero.id, talentProgression);
    const spentRanks = getSpentTalentRanksForHero(hero.id, talentProgression);
    const totalRankCapacity = getTotalTalentRankCapacity(heroClass);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {spentRanks}/{totalRankCapacity} ranks
                </span>
                <span className="rounded-full border border-violet-400/30 bg-violet-950/30 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-violet-200">
                    {talentPoints} pts
                </span>
            </div>

            <div className="space-y-2">
                {availableTalents.map((talent) => {
                    const currentRank = getTalentRankForHero(hero.id, talent.id, talentProgression);
                    const maxRank = talent.maxRank ?? 3;
                    const isUnlocked = currentRank > 0;
                    const isMaxed = currentRank >= maxRank;
                    return (
                        <div
                            key={talent.id}
                            className={`rounded-xl border p-3 ${
                                isUnlocked
                                    ? "border-emerald-400/40 bg-emerald-500/10"
                                    : "border-slate-700/60 bg-slate-900/70"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-100">{talent.name}</p>
                                        <span className="rounded-full border border-slate-600/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                            Rank {currentRank}/{maxRank}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {talent.description}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant={isUnlocked ? "secondary" : "upgrade"}
                                    disabled={isMaxed || talentPoints <= 0}
                                    onClick={() => unlockTalent(hero.id, talent.id)}
                                    className="shrink-0"
                                >
                                    {isMaxed ? "Maxed" : currentRank === 0 ? "Learn" : "Upgrade"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {buildProfile.passive && (
                <p className="pt-1 text-[10px] text-slate-500">
                    <span className="font-bold text-slate-400">Passive:</span>{" "}
                    {buildProfile.passive.name} — {buildProfile.passive.description}
                </p>
            )}
        </div>
    );
};
