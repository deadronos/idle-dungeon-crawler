import React from "react";
import { useGameStore } from "../game/store/gameStore";
import { formatNumber } from "../utils/format";
import { getFortificationUpgradeCost, getTrainingUpgradeCost } from "../game/upgrades";
import { canUnlockPartySlot, getNextPartySlotUnlock, getRecruitCost, RECRUITABLE_CLASSES } from "../game/partyProgression";
import { Shield, Sword, Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const UpgradesPanel: React.FC = () => {
    const gold = useGameStore((state) => state.gold);
    const party = useGameStore((state) => state.party);
    const partyCapacity = useGameStore((state) => state.partyCapacity);
    const maxPartySize = useGameStore((state) => state.maxPartySize);
    const highestFloorCleared = useGameStore((state) => state.highestFloorCleared);
    const trainingLevel = useGameStore((state) => state.metaUpgrades.training);
    const fortificationLevel = useGameStore((state) => state.metaUpgrades.fortification);
    const costReducerLevel = useGameStore((state) => state.prestigeUpgrades.costReducer);
    const buyTrainingUpgrade = useGameStore((state) => state.buyTrainingUpgrade);
    const buyFortificationUpgrade = useGameStore((state) => state.buyFortificationUpgrade);
    const unlockPartySlot = useGameStore((state) => state.unlockPartySlot);
    const recruitHero = useGameStore((state) => state.recruitHero);
    const trainingCost = getTrainingUpgradeCost(trainingLevel, costReducerLevel);
    const fortificationCost = getFortificationUpgradeCost(fortificationLevel, costReducerLevel);
    const nextSlotUnlock = getNextPartySlotUnlock(partyCapacity);
    const recruitCost = getRecruitCost(party.length);

    const canBuyTraining = gold.gte(trainingCost);
    const canBuyFortification = gold.gte(fortificationCost);
    const hasOpenSlot = party.length < partyCapacity;
    const canBuySlot = nextSlotUnlock ? canUnlockPartySlot(partyCapacity, highestFloorCleared) && gold.gte(nextSlotUnlock.cost) : false;
    const canRecruit = hasOpenSlot && gold.gte(recruitCost);

    return (
        <Card className="w-full max-w-150 bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-xl mt-4 shrink-0">
            <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg font-black uppercase tracking-[0.25em] text-slate-200">
                    Sanctum Upgrades
                </CardTitle>
                <p className="text-center text-xs text-slate-400">
                    Spend gold on persistent upgrades, unlock new party slots, and recruit fresh adventurers.
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
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">Lv {trainingLevel}</span>
                    </div>
                    <Button
                        disabled={!canBuyTraining}
                        onClick={buyTrainingUpgrade}
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
                        <span className="text-xs font-black uppercase tracking-wider text-sky-300">Lv {fortificationLevel}</span>
                    </div>
                    <Button
                        disabled={!canBuyFortification}
                        onClick={buyFortificationUpgrade}
                        variant="secondary"
                        className="w-full font-bold uppercase tracking-wider"
                    >
                        Upgrade ({formatNumber(fortificationCost)} Gold)
                    </Button>
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-slate-100 font-bold">
                                <Users size={16} className="text-emerald-400" />
                                Party Slots
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Increase active party capacity one slot at a time after clearing milestone floors.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">{partyCapacity}/{maxPartySize}</span>
                    </div>
                    {nextSlotUnlock ? (
                        <>
                            <div className="text-xs text-slate-400 space-y-1">
                                <p>Next Capacity: {nextSlotUnlock.capacity}</p>
                                <p>Requires Floor {nextSlotUnlock.milestoneFloor} Cleared</p>
                                <p>Highest Floor Cleared: {highestFloorCleared}</p>
                            </div>
                            <Button
                                disabled={!canBuySlot}
                                onClick={unlockPartySlot}
                                variant="secondary"
                                className="w-full font-bold uppercase tracking-wider"
                            >
                                Unlock Slot ({formatNumber(nextSlotUnlock.cost)} Gold)
                            </Button>
                        </>
                    ) : (
                        <p className="text-xs text-emerald-300 font-semibold">All party slots are unlocked.</p>
                    )}
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-4 flex flex-col gap-3 md:col-span-2">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-slate-100 font-bold">
                                <UserPlus size={16} className="text-violet-300" />
                                Recruit Adventurers
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Choose a class for the next recruit. Duplicate classes are allowed once you have room.</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-violet-300">Open Slots: {Math.max(0, partyCapacity - party.length)}</span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                        <p>Current Recruit Cost: {formatNumber(recruitCost)} Gold</p>
                        {!hasOpenSlot && <p>Unlock another party slot before recruiting again.</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {RECRUITABLE_CLASSES.map((heroClass) => (
                            <Button
                                key={heroClass}
                                disabled={!canRecruit}
                                onClick={() => recruitHero(heroClass)}
                                className="w-full font-bold uppercase tracking-wider"
                            >
                                Recruit {heroClass}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
