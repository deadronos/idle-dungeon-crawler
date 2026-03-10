import React from "react";
import { useGame } from "../game/gameState";
import { formatNumber } from "../utils/format";
import { Shield, Sword } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const UpgradesPanel: React.FC = () => {
    const { state, actions } = useGame();

    const trainingCost = actions.getTrainingUpgradeCost();
    const fortificationCost = actions.getFortificationUpgradeCost();

    const canBuyTraining = state.gold.gte(trainingCost);
    const canBuyFortification = state.gold.gte(fortificationCost);

    return (
        <Card className="w-full max-w-[600px] bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-xl mt-4 shrink-0">
            <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg font-black uppercase tracking-[0.25em] text-slate-200">
                    Sanctum Upgrades
                </CardTitle>
                <p className="text-center text-xs text-slate-400">
                    Spend gold on persistent upgrades before a wipe steals the coins still in your pockets.
                </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-slate-100 font-bold">
                                <Sword size={16} className="text-amber-400" />
                                Battle Drills
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increase all hero damage by 10% per level.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">Lv {state.metaUpgrades.training}</span>
                    </div>
                    <Button
                        disabled={!canBuyTraining}
                        onClick={actions.buyTrainingUpgrade}
                        className="w-full font-bold uppercase tracking-wider"
                    >
                        Upgrade ({formatNumber(trainingCost)} Gold)
                    </Button>
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-slate-100 font-bold">
                                <Shield size={16} className="text-sky-400" />
                                Fortification
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increase all hero armor by 10% per level.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-sky-300">Lv {state.metaUpgrades.fortification}</span>
                    </div>
                    <Button
                        disabled={!canBuyFortification}
                        onClick={actions.buyFortificationUpgrade}
                        variant="secondary"
                        className="w-full font-bold uppercase tracking-wider"
                    >
                        Upgrade ({formatNumber(fortificationCost)} Gold)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
