import React from 'react';
import { Skull } from 'lucide-react';

import type { Entity } from '../game/entity';
import { useGame } from '../game/store/gameStore';
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

export const EntityRoster: React.FC<Props> = ({ title, entities, alignRight, className }) => {
    const { actions } = useGame();

    return (
        <Card className={`w-full lg:w-[350px] shrink-0 bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-xl flex flex-col h-full overflow-hidden ${alignRight ? 'text-right' : 'text-left'} ${className ?? ''}`}>
            <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-200">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {entities.map(entity => (
                    <Card key={entity.id} className={`overflow-hidden border-slate-700/60 bg-slate-800/80 transition-all ${entity.currentHp.lte(0) ? 'opacity-50 grayscale' : 'hover:border-slate-600 shadow-md'}`}>
                        <div className="p-3">
                            <div className={`flex justify-between items-center mb-1 ${alignRight ? 'flex-row-reverse' : ''}`}>
                                <h3 className="font-bold text-slate-100 text-base sm:text-lg">{entity.name}</h3>
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

                            <div className="relative w-full h-16 sm:h-20 flex justify-center items-center my-2">
                                <img src={entity.image} alt={entity.name} className="h-full object-contain drop-shadow-md" />
                                {entity.activeSkill && (
                                    <span className="absolute -top-2 rounded-full border border-amber-300/30 bg-slate-950/90 px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-amber-200 shadow-lg">
                                        {entity.activeSkill}
                                    </span>
                                )}
                            </div>

                            <div className="text-center text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                                {entity.class}
                            </div>

                            {/* HP Bar */}
                            <div className="relative h-4 mb-2 bg-slate-950/50 rounded overflow-hidden border border-slate-900">
                                <div
                                    className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-200 ease-out"
                                    style={{ width: `${Math.max(0, Math.min(100, entity.currentHp.dividedBy(entity.maxHp).times(100).toNumber()))}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10">
                                    {formatNumber(entity.currentHp)} / {formatNumber(entity.maxHp)}
                                </span>
                            </div>

                            {/* Resource Bar */}
                            <div className="relative h-4 mb-3 bg-slate-950/50 rounded overflow-hidden border border-slate-900">
                                <div
                                    className={`absolute inset-y-0 left-0 transition-all duration-200 ease-out ${entity.class === 'Warrior' ? 'bg-red-500' :
                                        entity.class === 'Cleric' ? 'bg-blue-500' :
                                            entity.class === 'Archer' ? 'bg-yellow-500' : 'bg-purple-500'
                                        }`}
                                    style={{ width: `${Math.max(0, Math.min(100, entity.currentResource.dividedBy(entity.maxResource).times(100).toNumber()))}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10">
                                    {formatNumber(entity.currentResource)} / {formatNumber(entity.maxResource)}
                                </span>
                            </div>

                            {/* ATB Bar */}
                            <div className="relative h-1.5 mb-1 bg-slate-900 border border-slate-800 rounded overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-amber-400 transition-all duration-75 ease-linear"
                                    style={{ width: `${Math.min(100, entity.actionProgress)}%` }}
                                />
                            </div>

                            {/* Experience and Stats */}
                            <div className="mt-3 pt-2 border-t border-slate-700/50">
                                {!entity.isEnemy && (
                                    <div className="h-1 w-full bg-slate-900 rounded overflow-hidden mb-2">
                                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, entity.exp.dividedBy(entity.expToNext).times(100).toNumber())}%` }} />
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-slate-400 font-mono text-center">
                                    <span>VIT:{entity.attributes.vit}</span>
                                    <span>STR:{entity.attributes.str}</span>
                                    <span>DEX:{entity.attributes.dex}</span>
                                    <span>INT:{entity.attributes.int}</span>
                                    <span>WIS:{entity.attributes.wis}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
};
