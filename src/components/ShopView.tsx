import React from "react";
import { Coins, Sparkles, TrendingUp, Users } from "lucide-react";

import { useGameStore } from "../game/store/gameStore";
import { formatNumber } from "../utils/format";
import { UpgradesPanel } from "./UpgradesPanel";
import { PrestigeUpgradesPanel } from "./PrestigeUpgradesPanel";
import { HeroBuildPanel } from "./HeroBuildPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ShopView: React.FC = () => {
    const gold = useGameStore((state) => state.gold);
    const heroSouls = useGameStore((state) => state.heroSouls);
    const partySize = useGameStore((state) => state.party.length);
    const partyCapacity = useGameStore((state) => state.partyCapacity);
    const highestFloorCleared = useGameStore((state) => state.highestFloorCleared);

    return (
        <div className="flex flex-1 items-center justify-center w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.92)] overflow-y-auto p-4 lg:p-8">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-6 items-start">
                <Card className="bg-slate-900/85 backdrop-blur-md border-slate-700/50 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-slate-100 text-2xl font-black uppercase tracking-[0.2em]">
                            Adventure Stats
                        </CardTitle>
                        <p className="text-sm text-slate-400">
                            A snapshot of your current run and lifetime progress.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-300">
                        <div className="rounded-xl border border-fuchsia-700/40 bg-fuchsia-950/30 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-fuchsia-300">
                                <Sparkles className="size-4" />
                                Hero Souls
                            </div>
                            <span className="text-lg font-black text-fuchsia-200">{formatNumber(heroSouls)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-amber-300">
                                <Coins className="size-4" />
                                Gold
                            </div>
                            <span className="text-lg font-black text-amber-200">{formatNumber(gold)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-emerald-300">
                                <TrendingUp className="size-4" />
                                Highest Floor
                            </div>
                            <span className="text-lg font-black text-emerald-200">{highestFloorCleared}</span>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-sky-300">
                                <Users className="size-4" />
                                Party
                            </div>
                            <span className="text-lg font-black text-sky-200">{partySize} / {partyCapacity}</span>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="training" className="w-full max-w-150 shrink-0">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-700/50 h-12">
                        <TabsTrigger value="training" className="data-[state=active]:bg-slate-700 font-bold uppercase tracking-wider text-xs">Sanctum Upgrades</TabsTrigger>
                        <TabsTrigger value="builds" className="data-[state=active]:bg-violet-950 data-[state=active]:text-violet-200 font-bold uppercase tracking-wider text-xs text-slate-400">Hero Builds</TabsTrigger>
                        <TabsTrigger value="prestige" className="data-[state=active]:bg-fuchsia-950 data-[state=active]:text-fuchsia-300 font-bold uppercase tracking-wider text-xs text-slate-400">Altar of Souls</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="training" className="m-0 border-none outline-none">
                        <UpgradesPanel />
                    </TabsContent>

                    <TabsContent value="builds" className="m-0 border-none outline-none">
                        <HeroBuildPanel />
                    </TabsContent>
                    
                    <TabsContent value="prestige" className="m-0 border-none outline-none">
                        <PrestigeUpgradesPanel />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
