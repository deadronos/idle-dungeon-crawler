import React from 'react';
import { useGameStore } from '../game/store/gameStore';

export const CombatLog: React.FC = () => {
    const combatLog = useGameStore((state) => state.combatLog);

    return (
        <div className="w-full max-w-[600px] h-[180px] bg-gradient-to-t from-slate-900/90 to-transparent mt-auto rounded-2xl p-4 flex flex-col justify-end pointer-events-none shrink-0">
            <h3 className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest mb-2 text-center font-bold font-sans drop-shadow-md">Combat Log</h3>
            <div className="flex flex-col-reverse gap-1 overflow-hidden">
                {combatLog.map((msg, i) => (
                    <div key={i} className="text-[11px] sm:text-[13px] text-center font-mono text-slate-200 drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]" style={{ opacity: 1 - (i * 0.1) }}>
                        {msg}
                    </div>
                ))}
            </div>
        </div>
    );
};
