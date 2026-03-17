import { ProgressBar } from "@/components/game-ui/primitives";
import { Card } from "@/components/ui/card";
import type { Entity } from "@/game/entity";
import { getEnemyArchetypeLabel } from "@/game/entity";
import { getHeroBuildProfile, type HeroBuildState } from "@/game/heroBuilds";
import type { CombatEvent } from "@/game/store/types";
import { formatNumber } from "@/utils/format";
import {
    formatPercent,
    formatRatioPercent,
    getEntityHealthBarColorClass,
    getEntityResourceBarColorClass,
    ratioToClampedPercent,
} from "@/components/game-ui/helpers";

import { CombatEventStack } from "./CombatEventStack";
import { EntityTooltip } from "./EntityTooltip";
import { RetireHeroDialog } from "./RetireHeroDialog";
import { StatusBadgeList } from "./StatusBadgeList";

interface EntityCardProps {
    entity: Entity;
    buildState: HeroBuildState;
    combatEvents: CombatEvent[];
    alignRight?: boolean;
    onRetire: (entityId: string) => void;
}

export const EntityCard = ({
    entity,
    buildState,
    combatEvents,
    alignRight,
    onRetire,
}: EntityCardProps) => {
    const buildProfile = getHeroBuildProfile(entity, buildState);
    const hpRatio = entity.maxHp.lte(0) ? 0 : entity.currentHp.dividedBy(entity.maxHp).toNumber();
    const resourceRatio =
        entity.maxResource.lte(0) ? 0 : entity.currentResource.dividedBy(entity.maxResource).toNumber();
    const expRatio = entity.expToNext.gt(0) ? entity.exp.dividedBy(entity.expToNext).toNumber() : 0;
    const tooltipId = `${entity.id}-stats-tooltip`;

    return (
        <Card
            className={`shrink-0 snap-start overflow-visible border-slate-700/60 bg-slate-800/40 transition-all ${entity.currentHp.lte(0) ? "opacity-50 grayscale" : "hover:border-slate-500 shadow-md"}`}
        >
            <div className="p-3 space-y-2.5">
                <div className={`flex justify-between items-center ${alignRight ? "flex-row-reverse" : ""}`}>
                    <div>
                        <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">
                            {entity.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em]">
                            {entity.isEnemy && getEnemyArchetypeLabel(entity)
                                ? `${entity.class} • ${getEnemyArchetypeLabel(entity)}`
                                : entity.class}
                        </p>
                        {!entity.isEnemy && buildProfile.passive ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                                Passive:{" "}
                                <span className="font-semibold text-slate-200">
                                    {buildProfile.passive.name}
                                </span>
                            </p>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400 text-sm">Lv {entity.level}</span>
                        <RetireHeroDialog entity={entity} onRetire={onRetire} />
                    </div>
                </div>

                <div
                    className="relative group w-full h-16 sm:h-[4.5rem] flex justify-center items-center px-14"
                    tabIndex={0}
                    aria-describedby={tooltipId}
                >
                    {!entity.isEnemy ? (
                        <div
                            data-testid={`build-badges-${entity.id}`}
                            className="pointer-events-none absolute right-0 top-0 z-10 flex max-w-[40%] flex-wrap justify-end gap-1"
                        >
                            <span className="rounded-full border border-violet-400/25 bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100 shadow-md backdrop-blur-sm">
                                {buildProfile.talents.reduce(
                                    (total, talent) => total + talent.currentRank,
                                    0,
                                )}
                                R
                            </span>
                            <span className="rounded-full border border-sky-400/25 bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100 shadow-md backdrop-blur-sm">
                                {buildProfile.equippedItems.length}G
                            </span>
                        </div>
                    ) : null}
                    <StatusBadgeList entity={entity} />
                    <img src={entity.image} alt={entity.name} className="h-full object-contain drop-shadow-md" />
                    <CombatEventStack entityId={entity.id} combatEvents={combatEvents} />
                    <EntityTooltip
                        entity={entity}
                        tooltipId={tooltipId}
                        buildState={buildState}
                        buildProfile={buildProfile}
                    />
                    {entity.activeSkill && (
                        <span className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/40 bg-slate-950/90 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-amber-200 shadow-lg">
                            {entity.activeSkill}
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <ProgressBar
                        label="HP"
                        value={`${formatNumber(entity.currentHp)} / ${formatNumber(entity.maxHp)}`}
                        percent={ratioToClampedPercent(hpRatio)}
                        colorClassName={getEntityHealthBarColorClass(entity)}
                        captionPosition="overlay"
                        barClassName="h-4 min-h-4 rounded border border-slate-900 bg-slate-950/60"
                        captionClassName="text-[10px] sm:text-xs"
                        fillClassName="absolute inset-y-0 left-0 duration-200 ease-out"
                    />

                    <ProgressBar
                        label="Resource"
                        value={`${formatNumber(entity.currentResource)} / ${formatNumber(entity.maxResource)}`}
                        percent={ratioToClampedPercent(resourceRatio)}
                        colorClassName={getEntityResourceBarColorClass(entity)}
                        captionPosition="overlay"
                        barClassName="h-3.5 min-h-3.5 rounded border border-slate-900 bg-slate-950/60"
                        captionClassName="text-[9px] sm:text-[10px]"
                        fillClassName="absolute inset-y-0 left-0 duration-200 ease-out"
                    />

                    <ProgressBar
                        label="Action Readiness"
                        value={formatPercent(Math.floor(entity.actionProgress))}
                        percent={entity.actionProgress}
                        colorClassName="bg-amber-400"
                        barClassName="h-1.5 min-h-1.5 rounded border border-slate-800 bg-slate-900"
                        captionClassName="text-[9px] text-slate-400 font-semibold"
                        fillClassName="absolute inset-y-0 left-0 duration-75 ease-linear"
                    />
                </div>

                {!entity.isEnemy && (
                    <div className="pt-1 border-t border-slate-700/50">
                        <ProgressBar
                            label="Experience"
                            value={formatRatioPercent(expRatio)}
                            percent={ratioToClampedPercent(expRatio)}
                            colorClassName="bg-indigo-500"
                            barClassName="h-1.5 w-full"
                            trackClassName="bg-slate-900"
                            captionClassName="mb-1 text-[9px] text-slate-400 font-semibold"
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
