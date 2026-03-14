import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../game/store/gameStore';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type LogTab = 'log' | 'events';

const notablePattern = /crit|critical|kill|slain|defeat|level|skill|boss|loot|drop|dodge|parry|resist|burn|slow|weaken|afflicted|fades/i;
const BODY_HEIGHT_CLASSES = ['h-[86px]', 'h-[114px]', 'h-[142px]', 'h-[170px]', 'h-[198px]', 'h-[226px]', 'h-[254px]'] as const;
const PREVIEW_COUNTS = [4, 4, 5, 6, 7, 8, 9] as const;
const ENTRY_OPACITY_CLASSES = ['opacity-100', 'opacity-85', 'opacity-70', 'opacity-55', 'opacity-40', 'opacity-30'] as const;
const DEFAULT_BODY_HEIGHT_INDEX = 0;
const EXPANDED_BODY_HEIGHT_INDEX = 3;
const BODY_HEIGHT_STEP = 28;

interface CombatLogProps {
  className?: string;
}

export const CombatLog: React.FC<CombatLogProps> = ({ className }) => {
  const combatLog = useGameStore((state) => state.combatLog);
  const [bodyHeightIndex, setBodyHeightIndex] = useState(DEFAULT_BODY_HEIGHT_INDEX);
  const [tab, setTab] = useState<LogTab>('log');

  const notableEvents = useMemo(
    () => combatLog.filter((entry) => notablePattern.test(entry)),
    [combatLog],
  );

  const visibleEntries = tab === 'log' ? combatLog : notableEvents;
  const preview = visibleEntries.slice(0, PREVIEW_COUNTS[bodyHeightIndex]);
  const expanded = bodyHeightIndex >= EXPANDED_BODY_HEIGHT_INDEX;

  const clampBodyHeightIndex = (heightIndex: number) => Math.max(0, Math.min(BODY_HEIGHT_CLASSES.length - 1, heightIndex));

  const handleResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeightIndex = bodyHeightIndex;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const heightIndexOffset = Math.round((startY - moveEvent.clientY) / BODY_HEIGHT_STEP);
      setBodyHeightIndex(clampBodyHeightIndex(startHeightIndex + heightIndexOffset));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const toggleExpanded = () => {
    setBodyHeightIndex((currentHeightIndex) => (currentHeightIndex >= EXPANDED_BODY_HEIGHT_INDEX ? DEFAULT_BODY_HEIGHT_INDEX : EXPANDED_BODY_HEIGHT_INDEX));
  };

  return (
    <div
      data-testid="combat-log"
      className={cn('w-full shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 lg:p-4', className)}
    >
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
        <Button variant="ghost" size="xs" onClick={toggleExpanded}>
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      <button
        type="button"
        aria-label="Resize combat log"
        onPointerDown={handleResizeStart}
        className="mb-2 flex w-full cursor-row-resize items-center justify-center rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 transition hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60"
      >
        <span className="h-1.5 w-16 rounded-full bg-slate-700 transition-colors hover:bg-slate-500" aria-hidden="true" />
      </button>

      <div className={cn('flex flex-col-reverse gap-1 overflow-hidden transition-[height] duration-150 ease-out', BODY_HEIGHT_CLASSES[bodyHeightIndex])}>
        {preview.length > 0 ? preview.map((msg, i) => {
          const isNotable = notablePattern.test(msg);
          return (
            <div
              key={`${msg}-${i}`}
              className={cn(
                'text-[11px] sm:text-[12px] font-mono px-2 py-1 rounded',
                ENTRY_OPACITY_CLASSES[Math.min(i, ENTRY_OPACITY_CLASSES.length - 1)],
                isNotable ? 'border border-amber-300/20 bg-amber-500/10 text-amber-100' : 'text-slate-300',
              )}
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
