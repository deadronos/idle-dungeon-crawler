import React from "react";
import { Shield, Sword } from "lucide-react";

import { useGame } from "../game/gameState";
import { UpgradesPanel } from "./UpgradesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ShopView: React.FC = () => {
    const { state } = useGame();

    return (
        <div className="flex flex-1 items-center justify-center w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.92)] overflow-y-auto p-4 lg:p-8">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-6 items-start">
                <Card className="bg-slate-900/85 backdrop-blur-md border-slate-700/50 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-slate-100 text-2xl font-black uppercase tracking-[0.2em]">
                            Upgrade Shop
                        </CardTitle>
                        <p className="text-sm text-slate-400">
                            Spend hard-earned gold on permanent improvements before your next wipe.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-300">
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4">
                            <div className="flex items-center gap-2 font-bold text-amber-300 mb-2">
                                <Sword className="size-4" />
                                Battle Drills
                            </div>
                            <p>Increase all hero damage by 10% per level.</p>
                            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Current Level: {state.metaUpgrades.training}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4">
                            <div className="flex items-center gap-2 font-bold text-sky-300 mb-2">
                                <Shield className="size-4" />
                                Fortification
                            </div>
                            <p>Increase all hero armor by 10% per level.</p>
                            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Current Level: {state.metaUpgrades.fortification}</p>
                        </div>
                    </CardContent>
                </Card>

                <UpgradesPanel />
            </div>
        </div>
    );
};