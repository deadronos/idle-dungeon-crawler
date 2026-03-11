import React from "react";
import { Shield, Sword } from "lucide-react";

import { useGameStore } from "../game/store/gameStore";
import { UpgradesPanel } from "./UpgradesPanel";
import { PrestigeUpgradesPanel } from "./PrestigeUpgradesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ShopView: React.FC = () => {
    const trainingLevel = useGameStore((state) => state.metaUpgrades.training);
    const fortificationLevel = useGameStore((state) => state.metaUpgrades.fortification);
    const partySize = useGameStore((state) => state.party.length);
    const partyCapacity = useGameStore((state) => state.partyCapacity);
    const maxPartySize = useGameStore((state) => state.maxPartySize);
    const highestFloorCleared = useGameStore((state) => state.highestFloorCleared);

    return (
        <div className="flex flex-1 items-center justify-center w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.92)] overflow-y-auto p-4 lg:p-8">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-6 items-start">
                <Card className="bg-slate-900/85 backdrop-blur-md border-slate-700/50 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-slate-100 text-2xl font-black uppercase tracking-[0.2em]">
                            Upgrade Shop
                        </CardTitle>
                        <p className="text-sm text-slate-400">
                            Spend hard-earned gold on permanent improvements and party growth before your next wipe.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-300">
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4">
                            <div className="flex items-center gap-2 font-bold text-amber-300 mb-2">
                                <Sword className="size-4" />
                                Battle Drills
                            </div>
                            <p>Increase all hero damage by 10% per level.</p>
                            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Current Level: {trainingLevel}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4">
                            <div className="flex items-center gap-2 font-bold text-sky-300 mb-2">
                                <Shield className="size-4" />
                                Fortification
                            </div>
                            <p>Increase all hero armor by 10% per level.</p>
                            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Current Level: {fortificationLevel}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700/50 bg-slate-800/70 p-4">
                            <div className="flex items-center justify-between gap-2 font-bold text-emerald-300 mb-2">
                                <span>Party Expansion</span>
                                <span className="text-xs uppercase tracking-wider text-slate-400">{partySize}/{partyCapacity} Active</span>
                            </div>
                            <p>Start with a lone hero and grow the roster over time through slot unlocks and recruitment.</p>
                            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Highest Floor Cleared: {highestFloorCleared}</p>
                            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">Current Capacity: {partyCapacity} / {maxPartySize}</p>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="training" className="w-full max-w-150 shrink-0">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-700/50 h-12">
                        <TabsTrigger value="training" className="data-[state=active]:bg-slate-700 font-bold uppercase tracking-wider text-xs">Sanctum Upgrades</TabsTrigger>
                        <TabsTrigger value="prestige" className="data-[state=active]:bg-fuchsia-950 data-[state=active]:text-fuchsia-300 font-bold uppercase tracking-wider text-xs text-slate-400">Altar of Souls</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="training" className="m-0 border-none outline-none">
                        <UpgradesPanel />
                    </TabsContent>
                    
                    <TabsContent value="prestige" className="m-0 border-none outline-none">
                        <PrestigeUpgradesPanel />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};