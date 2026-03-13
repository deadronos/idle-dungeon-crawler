import React from "react";
import { useGameStore } from "../game/store/gameStore";
import { EntityRoster } from "./EntityRoster";
import { CombatLog } from "./CombatLog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Swords, Zap } from "lucide-react";

export const MainGameView: React.FC = () => {
    const party = useGameStore((state) => state.party);
    const enemies = useGameStore((state) => state.enemies);
    const floor = useGameStore((state) => state.floor);
    const autoFight = useGameStore((state) => state.autoFight);
    const autoAdvance = useGameStore((state) => state.autoAdvance);
    const previousFloor = useGameStore((state) => state.previousFloor);
    const nextFloor = useGameStore((state) => state.nextFloor);
    const toggleAutoFight = useGameStore((state) => state.toggleAutoFight);
    const toggleAutoAdvance = useGameStore((state) => state.toggleAutoAdvance);

    const primaryEnemy = enemies.find((enemy) => enemy.currentHp.gt(0)) ?? enemies[0];

    const runStateLabel = autoAdvance
        ? "Auto-advance enabled"
        : autoFight
            ? "Run will stop after this floor"
            : "Manual control enabled";

    return (
        <div className="flex-2 flex flex-col items-center justify-center relative w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="flex w-full h-full min-h-0 p-4 lg:p-8 gap-6 lg:gap-8 justify-between items-stretch flex-wrap lg:flex-nowrap overflow-y-auto lg:overflow-y-hidden">
                <EntityRoster title="The Party" entities={party} className="order-first lg:order-none" />

                <div className="flex-1 lg:flex-2 min-w-[300px] min-h-0 flex flex-col items-center relative lg:order-none gap-4 lg:gap-6">
                    <div className="w-full rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-md px-4 py-3 lg:px-6 lg:py-4 shadow-[0_0_30px_rgba(15,23,42,0.8)]">
                        <div className="flex items-center justify-between gap-3 text-white">
                            <Button
                                variant="nav"
                                size="icon"
                                aria-label="Previous floor"
                                disabled={floor <= 1}
                                onClick={previousFloor}
                            >
                                <ChevronLeft className="size-5" />
                            </Button>
                            <div className="text-center">
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-amber-300/80">Current Descent</p>
                                <p className="text-2xl lg:text-4xl font-black tracking-widest uppercase">Floor {floor}</p>
                            </div>
                            <Button
                                variant="nav"
                                size="icon"
                                aria-label="Next floor"
                                onClick={nextFloor}
                            >
                                <ChevronRight className="size-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 lg:px-5 lg:py-5 space-y-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300 font-bold">Run Behavior</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                id="autofight-toggle"
                                type="checkbox"
                                checked={autoFight}
                                onChange={toggleAutoFight}
                                className="sr-only"
                            />
                            <label htmlFor="autofight-toggle" className="sr-only">Autofight</label>
                            <button
                                type="button"
                                onClick={toggleAutoFight}
                                aria-pressed={autoFight}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${autoFight ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]' : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'}`}
                            >
                                <span>
                                    <span className="block text-xs uppercase tracking-wider text-slate-400">Autofight</span>
                                    <span className="block text-sm font-bold">Fight automatically</span>
                                </span>
                                <Swords className="size-4" />
                            </button>
                            <input
                                id="autoadvance-toggle"
                                type="checkbox"
                                checked={autoAdvance}
                                onChange={toggleAutoAdvance}
                                className="sr-only"
                            />
                            <label htmlFor="autoadvance-toggle" className="sr-only">Autoadvance</label>
                            <button
                                type="button"
                                onClick={toggleAutoAdvance}
                                aria-pressed={autoAdvance}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${autoAdvance ? 'border-amber-400/70 bg-amber-500/15 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.3)]' : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'}`}
                            >
                                <span>
                                    <span className="block text-xs uppercase tracking-wider text-slate-400">Autoadvance</span>
                                    <span className="block text-sm font-bold">Push deeper automatically</span>
                                </span>
                                <Zap className="size-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-300">
                            {autoFight ? "Party is auto-fighting. " : "Party waits for your command. "}
                            <span className="text-amber-300">{runStateLabel}.</span>
                        </p>
                    </div>

                    {primaryEnemy && primaryEnemy.currentHp.gt(0) && (
                        <div className="flex justify-center items-center max-h-[180px] lg:flex-1 lg:max-h-none w-full p-4 lg:p-8 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm">
                            <img
                                src={primaryEnemy.image}
                                alt="Enemy"
                                className="w-full max-w-[280px] h-auto object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-[idle-float_3s_ease-in-out_infinite]"
                                draggable={false}
                            />
                        </div>
                    )}

                    <CombatLog />
                </div>

                <EntityRoster title="Enemies" entities={enemies} alignRight={true} />
            </div>
        </div>
    );
};
