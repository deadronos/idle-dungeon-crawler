import React from "react";
import { useGame } from "../game/gameState";
import { EntityRoster } from "./EntityRoster";
import { CombatLog } from "./CombatLog";
import { UpgradesPanel } from "./UpgradesPanel";
import { Button } from "@/components/ui/button";

export const MainGameView: React.FC = () => {
    const { state, actions } = useGame();
    const roomCleared = state.enemies.length > 0 && state.enemies.every((enemy) => enemy.currentHp.lte(0));

    return (
        <div className="flex-2 flex flex-col items-center justify-center relative w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="flex w-full h-full p-4 lg:p-8 gap-4 lg:gap-8 justify-between items-stretch flex-wrap lg:flex-nowrap overflow-y-auto lg:overflow-y-hidden">
                {/* Left Side: Party */}
                <EntityRoster title="The Party" entities={state.party} />

                {/* Center: Action / Floor Info */}
                <div className="flex-1 lg:flex-2 min-w-[300px] flex flex-col items-center relative order-first lg:order-none">
                    <div className="text-2xl lg:text-4xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] shadow-[0_0_20px_rgba(99,102,241,0.5)] bg-slate-900/60 py-2 px-6 lg:py-3 lg:px-10 rounded-2xl border border-white/10 my-4 lg:my-6">
                        Floor {state.floor}
                    </div>

                    <div className="mb-8">
                        <Button
                            variant={state.autoProgress ? "default" : "outline"}
                            size="lg"
                            className={`rounded-full font-bold uppercase tracking-widest transition-all ${state.autoProgress ? 'bg-green-500/20 text-green-400 border-green-500 hover:bg-green-500/30' : 'bg-slate-800/80 text-white border-white/20'}`}
                            onClick={actions.toggleAutoProgress}
                        >
                            Auto-Progress: {state.autoProgress ? "ON" : "OFF"}
                        </Button>
                    </div>

                    {!state.autoProgress && roomCleared && (
                        <div className="mb-6">
                            <Button
                                size="lg"
                                className="rounded-full font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-amber-950"
                                onClick={actions.nextFloor}
                            >
                                Advance Floor
                            </Button>
                        </div>
                    )}

                    {/* Show a representative enemy sprite */}
                    {state.enemies.length > 0 && state.enemies[0].currentHp.gt(0) && (
                        <div className="flex justify-center items-center flex-1 w-full p-4 lg:p-8">
                            <img
                                src={state.enemies[0].image}
                                alt="Enemy"
                                className="w-full max-w-[280px] h-auto object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] animate-[idle-float_3s_ease-in-out_infinite]"
                                draggable={false}
                            />
                        </div>
                    )}

                    <UpgradesPanel />
                    <CombatLog />
                </div>

                {/* Right Side: Enemies */}
                <EntityRoster title="Enemies" entities={state.enemies} alignRight={true} />
            </div>
        </div>
    );
};
