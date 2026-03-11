import React from "react";
import { useGameStore } from "../game/store/gameStore";
import { EntityRoster } from "./EntityRoster";
import { CombatLog } from "./CombatLog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

    return (
        <div className="flex-2 flex flex-col items-center justify-center relative w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="flex w-full h-full p-4 lg:p-8 gap-4 lg:gap-8 justify-between items-stretch flex-wrap lg:flex-nowrap overflow-y-auto lg:overflow-y-hidden">
                {/* Left Side: Party */}
                <EntityRoster title="The Party" entities={party} />

                {/* Center: Action / Floor Info */}
                <div className="flex-1 lg:flex-2 min-w-[300px] flex flex-col items-center relative order-first lg:order-none">
                    <div className="flex items-center gap-3 text-2xl lg:text-4xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] shadow-[0_0_20px_rgba(99,102,241,0.5)] bg-slate-900/60 py-2 px-4 lg:py-3 lg:px-6 rounded-2xl border border-white/10 my-4 lg:my-6">
                        <Button
                            variant="nav"
                            size="icon"
                            aria-label="Previous floor"
                            disabled={floor <= 1}
                            onClick={previousFloor}
                        >
                            <ChevronLeft className="size-5" />
                        </Button>
                        <span>Floor {floor}</span>
                        <Button
                            variant="nav"
                            size="icon"
                            aria-label="Next floor"
                            onClick={nextFloor}
                        >
                            <ChevronRight className="size-5" />
                        </Button>
                    </div>

                    <div className="mb-8 flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-200">
                        <input
                            id="autofight-toggle"
                            type="checkbox"
                            checked={autoFight}
                            onChange={toggleAutoFight}
                            className="size-4 rounded border-white/20 bg-slate-950 accent-green-500"
                        />
                        <label htmlFor="autofight-toggle" className="cursor-pointer select-none">
                            Autofight
                        </label>
                        <span className="text-slate-600">|</span>
                        <input
                            id="autoadvance-toggle"
                            type="checkbox"
                            checked={autoAdvance}
                            onChange={toggleAutoAdvance}
                            className="size-4 rounded border-white/20 bg-slate-950 accent-amber-500"
                        />
                        <label htmlFor="autoadvance-toggle" className="cursor-pointer select-none">
                            Autoadvance
                        </label>
                    </div>

                    {/* Show a representative enemy sprite */}
                    {enemies.length > 0 && enemies[0].currentHp.gt(0) && (
                        <div className="flex justify-center items-center flex-1 w-full p-4 lg:p-8">
                            <img
                                src={enemies[0].image}
                                alt="Enemy"
                                className="w-full max-w-[280px] h-auto object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-[idle-float_3s_ease-in-out_infinite]"
                                draggable={false}
                            />
                        </div>
                    )}

                    <CombatLog />
                </div>

                {/* Right Side: Enemies */}
                <EntityRoster title="Enemies" entities={enemies} alignRight={true} />
            </div>
        </div>
    );
};
