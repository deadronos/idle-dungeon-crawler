import React from 'react';
import type { Entity } from '../game/entity';
import { formatNumber } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    title: string;
    entities: Entity[];
    alignRight?: boolean;
}

export const EntityRoster: React.FC<Props> = ({ title, entities, alignRight }) => {
    return (
        <Card className={`w-full lg:w-[350px] shrink-0 bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-xl flex flex-col h-full overflow-hidden ${alignRight ? 'text-right' : 'text-left'}`}>
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
                                <span className="font-black text-amber-400 text-sm">Lv {entity.level}</span>
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
