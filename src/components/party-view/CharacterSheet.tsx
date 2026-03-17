import React, { useMemo, useState } from "react";
import {
    BarChart2,
    ChevronLeft,
    ChevronRight,
    Layers,
    Package,
    Star,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { getHeroClassTemplate } from "@/game/classTemplates";
import type { Entity, HeroClass } from "@/game/entity";
import type { HeroBuildState } from "@/game/heroBuilds";
import { selectPartyViewState } from "@/game/store/selectors";
import { useGameStore } from "@/game/store/gameStore";
import { formatNumber } from "@/utils/format";
import {
    formatRatioPercent,
    getHealthBarColorClass,
    ratioToClampedPercent,
} from "@/components/game-ui/helpers";
import { ProgressBar } from "@/components/game-ui/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BasicStatsPanel } from "@/components/party-view/BasicStatsPanel";
import { SecondaryStatsPanel } from "@/components/party-view/SecondaryStatsPanel";
import { TalentsPanel } from "@/components/party-view/TalentsPanel";
import { EquipmentPanel } from "@/components/party-view/EquipmentPanel";
import { CLASS_BADGE, type CharacterSheetTab } from "@/components/party-view/constants";

const CHARACTER_SHEET_TABS: Array<{ id: CharacterSheetTab; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { id: "basic", label: "Basic Stats", Icon: BarChart2 },
    { id: "secondary", label: "Secondary", Icon: Layers },
    { id: "talents", label: "Talents", Icon: Star },
    { id: "equipment", label: "Equipment", Icon: Package },
];

interface CharacterSheetProps {
    hero: Entity;
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
    hero,
    index,
    total,
    onPrev,
    onNext,
}) => {
    const [activeTab, setActiveTab] = useState<CharacterSheetTab>("basic");

    const {
        talentProgression,
        equipmentProgression,
        unlockTalent,
        equipItem,
        unequipItem,
        sellInventoryItem,
        buyInventoryCapacityUpgrade,
        highestFloorCleared,
        gold,
    } = useGameStore(useShallow(selectPartyViewState));

    const template = getHeroClassTemplate(hero.class);
    const heroClass = hero.class as HeroClass;
    const badgeClass = CLASS_BADGE[heroClass] ?? "text-slate-300 border-slate-600/30 bg-slate-700/20";
    const buildState = useMemo<HeroBuildState>(() => ({
        talentProgression,
        equipmentProgression,
    }), [talentProgression, equipmentProgression]);

    const hpRatio = hero.currentHp.dividedBy(hero.maxHp).toNumber();
    const expRatio = hero.expToNext.gt(0)
        ? hero.exp.dividedBy(hero.expToNext).clamp(0, 1).toNumber()
        : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 w-full max-w-5xl mx-auto">
            <div className="flex flex-col gap-4">
                <Card className="bg-slate-900/80 border-slate-700/50 shadow-xl">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onPrev}
                                disabled={total <= 1}
                                aria-label="Previous hero"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {index + 1} / {total}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onNext}
                                disabled={total <= 1}
                                aria-label="Next hero"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div className="relative mx-auto w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-600/60 bg-slate-800/60 shadow-lg">
                            <img
                                src={`${import.meta.env.BASE_URL}${template.imageAsset}`}
                                alt={`${hero.name} portrait`}
                                className="w-full h-full object-cover pointer-events-none select-none"
                                draggable={false}
                            />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h2 className="text-xl font-black uppercase tracking-wider text-slate-100">
                                {hero.name}
                            </h2>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <span
                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClass}`}
                                >
                                    {hero.class}
                                </span>
                                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                                    Lv {hero.level}
                                </span>
                            </div>
                        </div>

                        <ProgressBar
                            label="HP"
                            value={`${formatNumber(hero.currentHp)} / ${formatNumber(hero.maxHp)}`}
                            percent={ratioToClampedPercent(hpRatio)}
                            colorClassName={getHealthBarColorClass(hpRatio)}
                            barClassName="h-2"
                        />

                        <ProgressBar
                            label="EXP"
                            value={formatRatioPercent(expRatio)}
                            percent={ratioToClampedPercent(expRatio)}
                            colorClassName="bg-violet-500"
                            barClassName="h-1.5"
                        />

                        <p className="text-center text-xs text-slate-500 italic leading-relaxed">
                            {template.description}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/80 border-slate-700/50 shadow-xl">
                    <CardContent className="p-3 space-y-1">
                        {CHARACTER_SHEET_TABS.map((tab) => {
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                                        isActive
                                            ? "bg-slate-700 text-slate-100"
                                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                    }`}
                                >
                                    <tab.Icon className="size-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900/80 border-slate-700/50 shadow-xl">
                <CardContent className="p-5 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {activeTab === "basic" && (
                        <BasicStatsPanel
                            hero={hero}
                            resourceLabel={template.resourceModel.displayName}
                        />
                    )}
                    {activeTab === "secondary" && (
                        <SecondaryStatsPanel
                            hero={hero}
                            buildState={buildState}
                        />
                    )}
                    {activeTab === "talents" && (
                        <TalentsPanel
                            hero={hero}
                            talentProgression={talentProgression}
                            equipmentProgression={equipmentProgression}
                            unlockTalent={unlockTalent}
                        />
                    )}
                    {activeTab === "equipment" && (
                        <EquipmentPanel
                            hero={hero}
                            equipmentProgression={equipmentProgression}
                            equipItem={equipItem}
                            unequipItem={unequipItem}
                            sellInventoryItem={sellInventoryItem}
                            buyInventoryCapacityUpgrade={buyInventoryCapacityUpgrade}
                            highestFloorCleared={highestFloorCleared}
                            gold={gold.toString()}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
