import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../game/store/gameStore';
import { Button } from './ui/button';

type LogTab = 'log' | 'events';

const notablePattern = /crit|critical|kill|slain|defeat|level|skill|boss|loot|drop/i;

export const CombatLog: React.FC = () => {
  const combatLog = useGameStore((state) => state.combatLog);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<LogTab>('log');

  const notableEvents = useMemo(
    () => combatLog.filter((entry) => notablePattern.test(entry)),
    [combatLog],
  );

  const visibleEntries = tab === 'log' ? combatLog : notableEvents;
  const preview = expanded ? visibleEntries.slice(0, 8) : visibleEntries.slice(0, 4);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 lg:p-4 shrink-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/70 p-1">
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded ${tab === 'log' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Log
          </button>
          <button
            type="button"
            onClick={() => setTab('events')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded ${tab === 'events' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Events
          </button>
        </div>
        <Button variant="ghost" size="xs" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      <div className={`flex flex-col-reverse gap-1 overflow-hidden transition-all ${expanded ? 'h-[170px]' : 'h-[86px]'}`}>
        {preview.length > 0 ? preview.map((msg, i) => {
          const fade = Math.max(0.25, 1 - (i * 0.16));
          const isNotable = notablePattern.test(msg);
          return (
            <div
              key={`${msg}-${i}`}
              className={`text-[11px] sm:text-[12px] font-mono px-2 py-1 rounded ${isNotable ? 'text-amber-100 bg-amber-500/10 border border-amber-300/20' : 'text-slate-300'}`}
              style={{ opacity: fade }}
            >
              {msg}
            </div>
          );
        }) : (
          <div className="text-xs text-slate-500 px-2 py-1">No {tab === 'events' ? 'notable events' : 'combat entries'} yet.</div>
        )}
      </div>
    </div>
  );
};
