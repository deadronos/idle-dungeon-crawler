import React from "react";
import { Shield, Sparkles, Sword, WandSparkles } from "lucide-react";

import {
    EQUIPMENT_SLOT_LABELS,
    getAvailableInventoryItemsForHero,
    getEquippedItemForSlot,
    getEquipmentOwnerId,
    getHeroBuildProfile,
    getTalentDefinitionsForClass,
    getTalentPointsForHero,
    getSlotLockedReason,
    type EquipmentSlot,
} from "../game/heroBuilds";
import type { HeroClass } from "../game/entity";
import { getCombatRatings } from "../game/entity";
import { useGameStore } from "../game/store/gameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HERO_RATING_LABELS = [
    ["power", "POW"],
    ["spellPower", "SP"],
    ["precision", "PRE"],
    ["haste", "HST"],
    ["guard", "GRD"],
    ["resolve", "RES"],
    ["potency", "POT"],
    ["crit", "CRT"],
] as const;

const SLOT_ICON_BY_SLOT: Record<EquipmentSlot, React.ReactNode> = {
    weapon: <Sword className="size-3.5 text-amber-300" />,
    armor: <Shield className="size-3.5 text-sky-300" />,
    charm: <Sparkles className="size-3.5 text-fuchsia-300" />,
    trinket: <WandSparkles className="size-3.5 text-emerald-300" />,
};

const formatRatingValue = (value: number) => Math.round(value);

export const HeroBuildPanel: React.FC = () => {
    const party = useGameStore((state) => state.party);
    const talentProgression = useGameStore((state) => state.talentProgression);
    const equipmentProgression = useGameStore((state) => state.equipmentProgression);
    const unlockTalent = useGameStore((state) => state.unlockTalent);
    const equipItem = useGameStore((state) => state.equipItem);
    const unequipItem = useGameStore((state) => state.unequipItem);
    const buildState = { talentProgression, equipmentProgression };

    return (
        <Card className="w-full max-w-6xl bg-slate-900/80 backdrop-blur-md border-slate-700/50 shadow-xl mt-4 shrink-0">
            <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg font-black uppercase tracking-[0.25em] text-slate-200">
                    Hero Builds
                </CardTitle>
                <p className="text-center text-xs text-slate-400">
                    Spend earned talent points and assign four-slot gear without turning the run into an inventory chore.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {party.length === 0 ? (
                    <p className="text-sm text-slate-400">Recruit or create a hero to start building loadouts.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {party.map((hero) => {
                            if (hero.isEnemy) {
                                return null;
                            }

                            const heroClass = hero.class as HeroClass;
                            const buildProfile = getHeroBuildProfile(hero, buildState);
                            const combatRatings = getCombatRatings(hero, buildState);
                            const talentPoints = getTalentPointsForHero(hero.id, talentProgression);
                            const availableTalents = getTalentDefinitionsForClass(heroClass);

                            return (
                                <div
                                    key={hero.id}
                                    className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 space-y-4"
                                >
                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-black uppercase tracking-[0.16em] text-slate-100">
                                                    {hero.name}
                                                </h3>
                                                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                                                    Lv {hero.level}
                                                </span>
                                                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                                                    {hero.class}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400">
                                                <span className="font-bold text-slate-200">Passive:</span> {buildProfile.passive?.name} - {buildProfile.passive?.description}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-violet-400/20 bg-violet-950/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-100">
                                            Talent Points: {talentPoints}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                                        {HERO_RATING_LABELS.map(([ratingKey, label]) => (
                                            <div key={ratingKey} className="rounded-xl border border-slate-700/50 bg-slate-900/70 px-2 py-2 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                                                <p className="mt-1 text-sm font-black text-slate-50">{formatRatingValue(combatRatings[ratingKey])}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Talents</h4>
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                    {buildProfile.talents.length}/{availableTalents.length} learned
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {availableTalents.map((talent) => {
                                                    const isUnlocked = buildProfile.talents.some((unlockedTalent) => unlockedTalent.id === talent.id);

                                                    return (
                                                        <div
                                                            key={talent.id}
                                                            className={`rounded-xl border p-3 ${isUnlocked ? "border-emerald-400/40 bg-emerald-500/10" : "border-slate-700/60 bg-slate-900/70"}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-bold text-slate-100">{talent.name}</p>
                                                                    <p className="mt-1 text-xs text-slate-400">{talent.description}</p>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant={isUnlocked ? "secondary" : "upgrade"}
                                                                    disabled={isUnlocked || talentPoints <= 0}
                                                                    onClick={() => unlockTalent(hero.id, talent.id)}
                                                                >
                                                                    {isUnlocked ? "Learned" : "Learn"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Equipment</h4>
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                    {buildProfile.equippedItems.length}/4 equipped
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {(Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).map((slot) => {
                                                    const equippedItem = getEquippedItemForSlot(hero, equipmentProgression, slot);
                                                    const inventoryItems = getAvailableInventoryItemsForHero(hero, equipmentProgression, slot);

                                                    return (
                                                        <div key={slot} className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        {SLOT_ICON_BY_SLOT[slot]}
                                                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                                                                            {EQUIPMENT_SLOT_LABELS[slot]}
                                                                        </p>
                                                                    </div>
                                                                    <p className="mt-1 text-sm font-bold text-slate-100">
                                                                        {equippedItem?.name ?? "Empty Slot"}
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-slate-400">
                                                                        {equippedItem?.description ?? "Choose one of the stocked items below."}
                                                                    </p>
                                                                </div>
                                                                {equippedItem ? (
                                                                    <Button size="sm" variant="ghost" onClick={() => unequipItem(hero.id, slot)}>
                                                                        Unequip
                                                                    </Button>
                                                                ) : null}
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                {inventoryItems.map((item) => {
                                                                    const ownerId = getEquipmentOwnerId(item.id, equipmentProgression);
                                                                    const lockReason = getSlotLockedReason(hero, item, equipmentProgression);
                                                                    const isEquippedHere = equippedItem?.id === item.id;

                                                                    return (
                                                                        <Button
                                                                            key={item.id}
                                                                            size="sm"
                                                                            variant={isEquippedHere ? "secondary" : "outline"}
                                                                            disabled={Boolean(lockReason) && !isEquippedHere}
                                                                            title={lockReason ?? item.description}
                                                                            onClick={() => equipItem(hero.id, item.id)}
                                                                            className={isEquippedHere ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : ""}
                                                                        >
                                                                            {item.name}
                                                                            {ownerId && ownerId !== hero.id ? " (Busy)" : ""}
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
