import React from 'react';
import { Skull } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { getHeroBuildProfile } from '../game/heroBuilds';
import { getEnemyArchetypeLabel, getStatusEffectBadge, getStatusEffectName } from '../game/entity';
import type { Entity } from '../game/entity';
import type { CombatEvent } from '../game/store/types';
import { useGameStore } from '../game/store/gameStore';
import { selectEntityRosterState } from '../game/store/selectors';
import { formatNumber } from '../utils/format';
import {
  formatPercent,
  formatRatioPercent,
  getEntityHealthBarColorClass,
  getEntityResourceBarColorClass,
  ratioToClampedPercent,
} from '@/components/game-ui/helpers';
import { ProgressBar, RatingGrid, StatusChip } from '@/components/game-ui/primitives';
import {
  getCombatRatingStatItems,
  getDerivedDetailStatItems,
  getResistanceStatItems,
} from '@/components/game-ui/viewModels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  title: string;
  entities: Entity[];
  alignRight?: boolean;
  className?: string;
}

const combatEventClassName = (event: CombatEvent) => {
  switch (event.kind) {
    case 'damage':
      return event.isCrit ? 'border-amber-300/60 bg-amber-500/20 text-amber-100' : 'border-red-400/50 bg-red-500/20 text-red-100';
    case 'heal':
      return 'border-emerald-300/60 bg-emerald-500/20 text-emerald-100';
    case 'dodge':
      return 'border-sky-300/60 bg-sky-500/20 text-sky-100';
    case 'parry':
      return 'border-slate-200/60 bg-slate-200/20 text-slate-50';
    case 'crit':
      return 'border-amber-300/60 bg-amber-500/20 text-amber-100';
    case 'defeat':
      return 'border-slate-400/60 bg-slate-700/40 text-slate-100';
    case 'skill':
      return 'border-violet-300/50 bg-violet-500/15 text-violet-100';
    case 'status':
      if (event.statusPhase === 'tick') {
        return 'border-orange-300/50 bg-orange-500/15 text-orange-100';
      }
      if (event.statusPhase === 'cleanse') {
        return 'border-emerald-300/50 bg-emerald-500/15 text-emerald-100';
      }
      if (event.statusPhase === 'expire') {
        return 'border-slate-300/40 bg-slate-500/15 text-slate-100';
      }
      return 'border-cyan-300/50 bg-cyan-500/15 text-cyan-100';
    default:
      return 'border-slate-300/30 bg-slate-900/70 text-slate-100';
  }
};

export const EntityRoster: React.FC<Props> = ({ title, entities, alignRight, className }) => {
  const { combatEvents, talentProgression, equipmentProgression, retireHero } = useGameStore(
    useShallow(selectEntityRosterState),
  );
  const buildState = { talentProgression, equipmentProgression };

  const sortedEntities = [...entities].sort((a, b) => Number(b.currentHp.gt(0)) - Number(a.currentHp.gt(0)));

  return (
    <Card className={`w-full lg:w-[360px] shrink-0 bg-slate-900/15 border-slate-700/50 shadow-xl flex flex-col h-full min-h-0 overflow-hidden ${alignRight ? 'text-right' : 'text-left'} ${className ?? ''}`}>
      <CardHeader className="pb-3 border-b border-slate-800/50">
        <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-200">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 custom-scrollbar snap-y snap-proximity">
        {sortedEntities.map(entity => {
          const buildProfile = getHeroBuildProfile(entity, buildState);
          const hpRatio = entity.maxHp.lte(0) ? 0 : entity.currentHp.dividedBy(entity.maxHp).toNumber();
          const resourceRatio = entity.maxResource.lte(0) ? 0 : entity.currentResource.dividedBy(entity.maxResource).toNumber();
          const expRatio = entity.expToNext.gt(0) ? entity.exp.dividedBy(entity.expToNext).toNumber() : 0;

          return (
          <Card key={entity.id} className={`shrink-0 snap-start overflow-visible border-slate-700/60 bg-slate-800/40 transition-all ${entity.currentHp.lte(0) ? 'opacity-50 grayscale' : 'hover:border-slate-500 shadow-md'}`}>
            <div className="p-3 space-y-2.5">
              <div className={`flex justify-between items-center ${alignRight ? 'flex-row-reverse' : ''}`}>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">{entity.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em]">
                    {entity.isEnemy && getEnemyArchetypeLabel(entity)
                      ? `${entity.class} • ${getEnemyArchetypeLabel(entity)}`
                      : entity.class}
                  </p>
                  {!entity.isEnemy && buildProfile.passive ? (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Passive: <span className="font-semibold text-slate-200">{buildProfile.passive.name}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-400 text-sm">Lv {entity.level}</span>
                  {!entity.isEnemy && entity.id !== "hero_1" && entity.level >= 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        className="text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                        title={`Retire Hero for ${Math.floor(entity.level / 5) * 10} Souls`}
                      >
                        <Skull size={14} />
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-200 shadow-2xl shadow-black/50 sm:max-w-[425px]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Skull className="text-red-400" size={20} />
                            Retire {entity.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400 mt-2">
                            Are you sure you want to retire this hero? They will leave the party <strong className="text-slate-200">permanently</strong> in exchange for <strong className="text-fuchsia-400 font-bold">{Math.floor(entity.level / 5) * 10} Hero Souls</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => retireHero(entity.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider"
                          >
                            Retire Hero
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div
                className="relative group w-full h-16 sm:h-[4.5rem] flex justify-center items-center px-14"
                tabIndex={0}
                aria-describedby={`${entity.id}-stats-tooltip`}
              >
                {!entity.isEnemy ? (
                  <div
                    data-testid={`build-badges-${entity.id}`}
                    className="pointer-events-none absolute right-0 top-0 z-10 flex max-w-[40%] flex-wrap justify-end gap-1"
                  >
                    <span className="rounded-full border border-violet-400/25 bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100 shadow-md backdrop-blur-sm">
                      {buildProfile.talents.reduce((total, talent) => total + talent.currentRank, 0)}R
                    </span>
                    <span className="rounded-full border border-sky-400/25 bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100 shadow-md backdrop-blur-sm">
                      {buildProfile.equippedItems.length}G
                    </span>
                  </div>
                ) : null}
                {entity.statusEffects.length > 0 && (
                  <div
                    data-testid={`status-badges-${entity.id}`}
                    className="pointer-events-none absolute left-0 top-0 z-10 flex max-w-[45%] flex-wrap gap-1"
                  >
                    {entity.statusEffects.map((statusEffect) => (
                      <StatusChip
                        key={`${entity.id}-${statusEffect.key}`}
                        polarity={statusEffect.polarity}
                        label={getStatusEffectBadge(statusEffect)}
                      />
                    ))}
                  </div>
                )}
                <img src={entity.image} alt={entity.name} className="h-full object-contain drop-shadow-md" />
                <div
                  data-testid={`combat-events-${entity.id}`}
                  className="pointer-events-none absolute inset-x-0 top-1 z-20 flex flex-col items-center gap-1"
                >
                  {combatEvents
                    .filter((event) => event.targetId === entity.id || (event.sourceId === entity.id && event.kind === 'skill'))
                    .slice(-3)
                    .reverse()
                    .map((event) => (
                      <span
                        key={event.id}
                        className={`combat-event-float rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] shadow-lg ${combatEventClassName(event)}`}
                      >
                        {event.text}
                      </span>
                    ))}
                </div>
                <div
                  id={`${entity.id}-stats-tooltip`}
                  role="tooltip"
                  className="absolute z-30 pointer-events-none w-[min(19rem,calc(100%-0.5rem))] opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-full group-hover:opacity-100 group-focus-within:translate-y-full group-focus-within:opacity-100 rounded-xl border border-slate-600/90 bg-slate-950/97 px-3 py-2.5 text-[10px] text-slate-200 shadow-2xl shadow-black/60 -bottom-1 left-1/2 -translate-x-1/2 translate-y-[calc(100%+0.25rem)]"
                >
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-violet-200/85">Combat Ratings</p>
                      <RatingGrid
                        items={getCombatRatingStatItems(entity, buildState)}
                        columns={2}
                        className="mt-2"
                        itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-200/85">Derived Detail</p>
                      <RatingGrid
                        items={getDerivedDetailStatItems(entity)}
                        columns={2}
                        className="mt-2"
                        itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                      />
                    </div>
                    {!entity.isEnemy && buildProfile.passive ? (
                      <div className="border-t border-slate-800/80 pt-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-200/80">Build</p>
                        <div className="mt-2 space-y-1">
                          <div className="rounded-md bg-slate-900/70 px-2 py-1">
                            <p className="text-slate-400">Passive</p>
                            <p className="font-bold text-slate-50">{buildProfile.passive.name}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">{buildProfile.passive.description}</p>
                          </div>
                          <div className="rounded-md bg-slate-900/70 px-2 py-1">
                            <p className="text-slate-400">Talents</p>
                            <p className="font-bold text-slate-50">
                              {buildProfile.talents.length > 0
                                ? buildProfile.talents.map((talent) => `${talent.name} R${talent.currentRank}/${talent.maxRank}`).join(", ")
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
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/80">Resistances</p>
                      <RatingGrid
                        items={getResistanceStatItems(entity)}
                        columns={2}
                        className="mt-2"
                        itemClassName="rounded-md bg-slate-900/70 px-2 py-1"
                      />
                    </div>
                    {entity.statusEffects.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-300/70">Statuses</p>
                        <dl className="mt-2 grid grid-cols-1 gap-y-1">
                          {entity.statusEffects.map((statusEffect) => (
                            <div key={`${entity.id}-${statusEffect.key}-tooltip`} className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-1">
                              <dt className={statusEffect.polarity === 'buff' ? 'text-emerald-300' : 'text-rose-300'}>
                                {getStatusEffectName(statusEffect.key)}
                              </dt>
                              <dd className={`font-mono font-bold ${statusEffect.polarity === 'buff' ? 'text-emerald-100' : 'text-slate-50'}`}>
                                {statusEffect.stacks > 1 ? `x${statusEffect.stacks}` : `${Math.ceil(statusEffect.remainingTicks / 20)}s`}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
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
        )})}
      </CardContent>
    </Card>
  );
};
