import React from "react";
import { CircleDollarSign, FastForward, HeartPulse, Brain } from "lucide-react";

import { useGame } from "../game/store/gameStore";
import { INSIGHT_XP_BONUS_PER_LEVEL } from "../game/progressionMath";
import { formatNumber } from "../utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const PrestigeUpgradesPanel: React.FC = () => {
    const { state, actions } = useGame();
    const heroSouls = state.heroSouls;
    const prestigeUpgrades = state.prestigeUpgrades;

    const currentCostReducerLevel = prestigeUpgrades.costReducer;
    const currentHpLevel = prestigeUpgrades.hpMultiplier;
    const currentGameSpeedLevel = prestigeUpgrades.gameSpeed;
    const currentXpLevel = prestigeUpgrades.xpMultiplier;

    const costReducerCost = actions.getPrestigeUpgradeCost("costReducer");
    const hpMultiplierCost = actions.getPrestigeUpgradeCost("hpMultiplier");
    const gameSpeedCost = actions.getPrestigeUpgradeCost("gameSpeed");
    const xpMultiplierCost = actions.getPrestigeUpgradeCost("xpMultiplier");

    return (
        <Card className="w-full max-w-150 bg-slate-900/80 backdrop-blur-md border-fuchsia-700/50 shadow-xl mt-4 shrink-0 [box-shadow:0_0_15px_rgba(192,38,211,0.1)]">
            <CardHeader className="pb-3 border-b border-fuchsia-900/30">
                <CardTitle className="text-center text-lg font-black uppercase tracking-[0.25em] text-fuchsia-300">
                    Altar of Souls
                </CardTitle>
                <p className="text-center text-xs text-slate-400 mt-2">
                    Retire heroes to acquire souls and permanently alter the fabric of the dungeon.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 font-black tracking-widest text-fuchsia-400 bg-fuchsia-950/40 p-2 rounded border border-fuchsia-800/50">
                    <span className="text-lg">{formatNumber(heroSouls)}</span>
                    <span className="text-xs uppercase text-fuchsia-300/80">Souls Available</span>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <div className="rounded-xl border border-fuchsia-700/30 bg-slate-900/70 p-4 flex flex-col gap-3">
                    <div className="flex-1 flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-fuchsia-200 font-bold">
                                <CircleDollarSign size={16} className="text-fuchsia-400" />
                                Greed
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Reduces exponential gold cost scaling.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-fuchsia-400">Lv {currentCostReducerLevel}</span>
                    </div>
                    <Button 
                        disabled={heroSouls.lt(costReducerCost)}
                        onClick={() => actions.buyPrestigeUpgrade("costReducer")}
                        variant="prestige" 
                        className="w-full"
                    >
                        Imbue ({formatNumber(costReducerCost)} Souls)
                    </Button>
                </div>

                <div className="rounded-xl border border-fuchsia-700/30 bg-slate-900/70 p-4 flex flex-col gap-3">
                    <div className="flex-1 flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-fuchsia-200 font-bold">
                                <HeartPulse size={16} className="text-red-400" />
                                Vitality
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increases Base HP scaling per point of VIT.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-red-400">Lv {currentHpLevel}</span>
                    </div>
                    <Button 
                        disabled={heroSouls.lt(hpMultiplierCost)}
                        onClick={() => actions.buyPrestigeUpgrade("hpMultiplier")}
                        variant="prestige" 
                        className="w-full"
                    >
                        Imbue ({formatNumber(hpMultiplierCost)} Souls)
                    </Button>
                </div>

                <div className="rounded-xl border border-fuchsia-700/30 bg-slate-900/70 p-4 flex flex-col gap-3">
                    <div className="flex-1 flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-fuchsia-200 font-bold">
                                <FastForward size={16} className="text-yellow-400" />
                                Haste
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increases the global game tick speed multiplier.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-yellow-400">Lv {currentGameSpeedLevel}</span>
                    </div>
                    <Button 
                        disabled={heroSouls.lt(gameSpeedCost)}
                        onClick={() => actions.buyPrestigeUpgrade("gameSpeed")}
                        variant="prestige" 
                        className="w-full"
                    >
                        Imbue ({formatNumber(gameSpeedCost)} Souls)
                    </Button>
                </div>

                <div className="rounded-xl border border-fuchsia-700/30 bg-slate-900/70 p-4 flex flex-col gap-3">
                    <div className="flex-1 flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-fuchsia-200 font-bold">
                                <Brain size={16} className="text-blue-400" />
                                Insight
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increases experience gained from enemies by {Math.round(INSIGHT_XP_BONUS_PER_LEVEL * 100)}% per level.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-blue-400">Lv {currentXpLevel}</span>
                    </div>
                    <Button 
                        disabled={heroSouls.lt(xpMultiplierCost)}
                        onClick={() => actions.buyPrestigeUpgrade("xpMultiplier")}
                        variant="prestige" 
                        className="w-full"
                    >
                        Imbue ({formatNumber(xpMultiplierCost)} Souls)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
