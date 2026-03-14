import React from 'react';
import { Skull } from 'lucide-react';

import type { Entity } from '../game/entity';
import type { CombatEvent } from '../game/store/types';
import { useGame, useGameStore } from '../game/store/gameStore';
import { formatNumber } from '../utils/format';
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

interface TooltipStat {
  label: string;
  value: string;
}

const hpColorFor = (entity: Entity) => {
  const ratio = entity.currentHp.dividedBy(entity.maxHp).toNumber();
  if (ratio <= 0.2) return 'bg-red-500';
  if (ratio <= 0.5) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const resourceColorFor = (entity: Entity) => {
  if (entity.class === 'Warrior') return 'bg-red-500';
  if (entity.class === 'Cleric') return 'bg-blue-500';
  if (entity.class === 'Archer') return 'bg-yellow-500';
  return 'bg-purple-500';
};

const formatTooltipValue = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1).replace(/\.0$/, "");
};

const attributeStatsFor = (entity: Entity): TooltipStat[] => [
  { label: "VIT", value: formatTooltipValue(entity.attributes.vit) },
  { label: "STR", value: formatTooltipValue(entity.attributes.str) },
  { label: "DEX", value: formatTooltipValue(entity.attributes.dex) },
  { label: "INT", value: formatTooltipValue(entity.attributes.int) },
  { label: "WIS", value: formatTooltipValue(entity.attributes.wis) },
  { label: "ACC", value: Math.round(entity.accuracyRating).toString() },
  { label: "EVA", value: Math.round(entity.evasionRating).toString() },
  { label: "PAR", value: Math.round(entity.parryRating).toString() },
];

const resistanceStatsFor = (entity: Entity): TooltipStat[] => [
  { label: "Fire", value: `${Math.round(entity.resistances.fire * 100)}%` },
  { label: "Water", value: `${Math.round(entity.resistances.water * 100)}%` },
  { label: "Earth", value: `${Math.round(entity.resistances.earth * 100)}%` },
  { label: "Air", value: `${Math.round(entity.resistances.air * 100)}%` },
  { label: "Light", value: `${Math.round(entity.resistances.light * 100)}%` },
  { label: "Shadow", value: `${Math.round(entity.resistances.shadow * 100)}%` },
];

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
    default:
      return 'border-slate-300/30 bg-slate-900/70 text-slate-100';
  }
};

export const EntityRoster: React.FC<Props> = ({ title, entities, alignRight, className }) => {
  const { actions } = useGame();
  const combatEvents = useGameStore((state) => state.combatEvents);

  const sortedEntities = [...entities].sort((a, b) => Number(b.currentHp.gt(0)) - Number(a.currentHp.gt(0)));

  return (
    <Card className={`w-full lg:w-[360px] shrink-0 bg-slate-900/85 backdrop-blur-md border-slate-700/50 shadow-xl flex flex-col h-full min-h-0 overflow-hidden ${alignRight ? 'text-right' : 'text-left'} ${className ?? ''}`}>
      <CardHeader className="pb-3 border-b border-slate-800">
        <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-200">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 custom-scrollbar snap-y snap-proximity">
        {sortedEntities.map(entity => (
          <Card key={entity.id} className={`shrink-0 snap-start overflow-visible border-slate-700/60 bg-slate-800/80 transition-all ${entity.currentHp.lte(0) ? 'opacity-50 grayscale' : 'hover:border-slate-500 shadow-md'}`}>
            <div className="p-3 space-y-2.5">
              <div className={`flex justify-between items-center ${alignRight ? 'flex-row-reverse' : ''}`}>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">{entity.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em]">{entity.class}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-400 text-sm">Lv {entity.level}</span>
                  {!entity.isEnemy && entity.id !== "hero_1" && entity.level >= 5 && (
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
                            onClick={() => actions.retireHero(entity.id)}
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
                className="relative group w-full h-12 sm:h-14 flex justify-center items-center"
                tabIndex={0}
                aria-describedby={`${entity.id}-stats-tooltip`}
              >
                <img src={entity.image} alt={entity.name} className="h-full object-contain drop-shadow-md" />
                <div
                  data-testid={`combat-events-${entity.id}`}
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1"
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
                  className="absolute z-30 pointer-events-none w-[min(18rem,calc(100%-0.5rem))] opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-full group-hover:opacity-100 group-focus-within:translate-y-full group-focus-within:opacity-100 rounded-xl border border-slate-600/90 bg-slate-950/97 px-3 py-2.5 text-[10px] text-slate-200 shadow-2xl shadow-black/60 -bottom-1 left-1/2 -translate-x-1/2 translate-y-[calc(100%+0.25rem)]"
                >
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-200/85">Attributes</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        {attributeStatsFor(entity).map((stat) => (
                          <div key={stat.label} className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-1">
                            <dt className="text-slate-400">{stat.label}</dt>
                            <dd className="font-mono font-bold text-slate-50">{stat.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/80">Resistances</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        {resistanceStatsFor(entity).map((stat) => (
                          <div key={stat.label} className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-1">
                            <dt className="text-slate-400">{stat.label}</dt>
                            <dd className="font-mono font-bold text-slate-50">{stat.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
                {entity.activeSkill && (
                  <span className="absolute -top-2 rounded-full border border-amber-300/40 bg-slate-950/90 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-amber-200 shadow-lg">
                    {entity.activeSkill}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative h-4 min-h-4 bg-slate-950/60 rounded overflow-hidden border border-slate-900">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-200 ease-out ${hpColorFor(entity)}`}
                    style={{ width: `${Math.max(0, Math.min(100, entity.currentHp.dividedBy(entity.maxHp).times(100).toNumber()))}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-between px-2 text-[10px] sm:text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10">
                    <span>HP</span>
                    <span>{formatNumber(entity.currentHp)} / {formatNumber(entity.maxHp)}</span>
                  </span>
                </div>

                <div className="relative h-3.5 min-h-3.5 bg-slate-950/60 rounded overflow-hidden border border-slate-900">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-200 ease-out ${resourceColorFor(entity)}`}
                    style={{ width: `${Math.max(0, Math.min(100, entity.currentResource.dividedBy(entity.maxResource).times(100).toNumber()))}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-between px-2 text-[9px] sm:text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10">
                    <span>Resource</span>
                    <span>{formatNumber(entity.currentResource)} / {formatNumber(entity.maxResource)}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                    <span>Action Readiness</span>
                    <span>{Math.floor(entity.actionProgress)}%</span>
                  </div>
                  <div className="relative h-1.5 min-h-1.5 bg-slate-900 border border-slate-800 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-400 transition-all duration-75 ease-linear"
                      style={{ width: `${Math.min(100, entity.actionProgress)}%` }}
                    />
                  </div>
                </div>
              </div>

              {!entity.isEnemy && (
                <div className="pt-1 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    <span>Experience</span>
                    <span>{Math.floor(entity.exp.dividedBy(entity.expToNext).times(100).toNumber())}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, entity.exp.dividedBy(entity.expToNext).times(100).toNumber())}%` }} />
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
