import { RatingGrid } from "@/components/game-ui/primitives";
import {
    getCombatRatingStatItems,
    getDerivedDetailStatItems,
    getResistanceStatItems,
} from "@/components/game-ui/viewModels";
import type { Entity } from "@/game/entity";
import { getStatusEffectName } from "@/game/entity";
import type { HeroBuildProfile, HeroBuildState } from "@/game/heroBuilds";

interface EntityTooltipProps {
    entity: Entity;
    tooltipId: string;
    buildState: HeroBuildState;
    buildProfile: HeroBuildProfile;
}

export const EntityTooltip = ({
    entity,
    tooltipId,
    buildState,
    buildProfile,
}: EntityTooltipProps) => (
    <div
        id={tooltipId}
        role="tooltip"
        className="absolute z-30 pointer-events-none w-[min(19rem,calc(100%-0.5rem))] opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-full group-hover:opacity-100 group-focus-within:translate-y-full group-focus-within:opacity-100 rounded-xl border border-slate-600/90 bg-slate-950/97 px-3 py-2.5 text-[10px] text-slate-200 shadow-2xl shadow-black/60 -bottom-1 left-1/2 -translate-x-1/2 translate-y-[calc(100%+0.25rem)]"
    >
        <div className="space-y-2">
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-violet-200/85">
                    Combat Ratings
                </p>
                <RatingGrid
                    items={getCombatRatingStatItems(entity, buildState)}
                    columns={2}
                    className="mt-2"
                    itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-200/85">
                    Derived Detail
                </p>
                <RatingGrid
                    items={getDerivedDetailStatItems(entity)}
                    columns={2}
                    className="mt-2"
                    itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                />
            </div>
            {!entity.isEnemy && buildProfile.passive ? (
                <div className="border-t border-slate-800/80 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-200/80">
                        Build
                    </p>
                    <div className="mt-2 space-y-1">
                        <div className="rounded-md bg-slate-900/70 px-2 py-1">
                            <p className="text-slate-400">Passive</p>
                            <p className="font-bold text-slate-50">{buildProfile.passive.name}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">
                                {buildProfile.passive.description}
                            </p>
                        </div>
                        <div className="rounded-md bg-slate-900/70 px-2 py-1">
                            <p className="text-slate-400">Talents</p>
                            <p className="font-bold text-slate-50">
                                {buildProfile.talents.length > 0
                                    ? buildProfile.talents
                                          .map(
                                              (talent) =>
                                                  `${talent.name} R${talent.currentRank}/${talent.maxRank}`,
                                          )
                                          .join(", ")
                                    : "No talents learned"}
                            </p>
                        </div>
                        <div className="rounded-md bg-slate-900/70 px-2 py-1">
                            <p className="text-slate-400">Equipment</p>
                            <p className="font-bold text-slate-50">
                                {buildProfile.equippedItems.length > 0
                                    ? buildProfile.equippedItems.map((item) => item.name).join(", ")
                                    : "No gear equipped"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="border-t border-slate-800/80 pt-2">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/80">
                    Resistances
                </p>
                <RatingGrid
                    items={getResistanceStatItems(entity)}
                    columns={2}
                    className="mt-2"
                    itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                />
            </div>
            {entity.statusEffects.length > 0 && (
                <div className="border-t border-slate-800/80 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-300/70">
                        Statuses
                    </p>
                    <dl className="mt-2 grid grid-cols-1 gap-y-1">
                        {entity.statusEffects.map((statusEffect) => (
                            <div
                                key={`${entity.id}-${statusEffect.key}-tooltip`}
                                className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-1"
                            >
                                <dt
                                    className={
                                        statusEffect.polarity === "buff"
                                            ? "text-emerald-300"
                                            : "text-rose-300"
                                    }
                                >
                                    {getStatusEffectName(statusEffect.key)}
                                </dt>
                                <dd
                                    className={`font-mono font-bold ${statusEffect.polarity === "buff" ? "text-emerald-100" : "text-slate-50"}`}
                                >
                                    {statusEffect.stacks > 1
                                        ? `x${statusEffect.stacks}`
                                        : `${Math.ceil(statusEffect.remainingTicks / 20)}s`}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
        </div>
    </div>
);
