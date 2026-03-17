import React, { useState } from "react";
import {
    BarChart2,
    ChevronLeft,
    ChevronRight,
    Layers,
    Package,
    Shield,
    Sparkles,
    Star,
    Sword,
    WandSparkles,
} from "lucide-react";

import { getHeroClassTemplate } from "../game/classTemplates";
import {
    EQUIPMENT_SLOT_LABELS,
    getAvailableInventoryItemsForHero,
    getEquippedItemForSlot,
    getEquipmentOwnerId,
    getHeroBuildProfile,
    getSlotLockedReason,
    getTalentDefinitionsForClass,
    getTalentRankForHero,
    getTalentPointsForHero,
    getTotalTalentRankCapacity,
    getSpentTalentRanksForHero,
    getUnequippedInventoryItems,
    type EquipmentSlot,
} from "../game/heroBuilds";
import {
    formatEquipmentTierRank,
    getEquipmentAffinitySummary,
    getNextInventoryCapacityUpgrade,
} from "../game/equipmentProgression";
import {
    selectPartyHeroes,
    selectPartyViewState,
} from "../game/store/selectors";
import type {
    EquipmentProgressionState,
    TalentProgressionState,
} from "../game/store/types";
import type { Entity, HeroClass } from "../game/entity";
import { useGameStore } from "../game/store/gameStore";
import { formatNumber } from "../utils/format";
import {
    formatRatioPercent,
    formatUiStat,
    getHealthBarColorClass,
    ratioToClampedPercent,
} from "@/components/game-ui/helpers";
import {
    ProgressBar,
    RatingGrid,
    StatRow,
} from "@/components/game-ui/primitives";
import {
    getBaseAttributeStatItems,
    getCombatRatingStatItems,
    getResistanceStatItems,
} from "@/components/game-ui/viewModels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useShallow } from "zustand/react/shallow";

// ─── Types ───────────────────────────────────────────────────────────────────

type CharacterSheetTab = "basic" | "secondary" | "talents" | "equipment";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SLOT_ICON: Record<EquipmentSlot, React.ReactNode> = {
    weapon: <Sword className="size-3.5 text-amber-300" />,
    armor: <Shield className="size-3.5 text-sky-300" />,
    charm: <Sparkles className="size-3.5 text-fuchsia-300" />,
    trinket: <WandSparkles className="size-3.5 text-emerald-300" />,
};

const CLASS_BADGE: Record<HeroClass, string> = {
    Warrior: "text-orange-300 border-orange-400/30 bg-orange-500/10",
    Cleric: "text-sky-300 border-sky-400/30 bg-sky-500/10",
    Archer: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
};

// ─── BasicStatsPanel ─────────────────────────────────────────────────────────

const BasicStatsPanel: React.FC<{ hero: Entity; resourceLabel: string }> = ({
    hero,
    resourceLabel,
}) => {
    return (
        <div className="space-y-5">
            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Combat
                </h5>
                <StatRow
                    accent
                    label="HP"
                    value={`${formatNumber(hero.currentHp)} / ${formatNumber(hero.maxHp)}`}
                />
                <StatRow
                    accent
                    label={resourceLabel}
                    value={`${formatNumber(hero.currentResource)} / ${formatNumber(hero.maxResource)}`}
                />
                <StatRow accent label="Phys Dmg" value={formatNumber(hero.physicalDamage)} />
                <StatRow accent label="Magic Dmg" value={formatNumber(hero.magicDamage)} />
                <StatRow accent label="Armor" value={formatNumber(hero.armor)} />
            </section>

            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Attributes
                </h5>
                <RatingGrid items={getBaseAttributeStatItems(hero)} columns={5} />
            </section>
        </div>
    );
};

// ─── SecondaryStatsPanel ─────────────────────────────────────────────────────

const SecondaryStatsPanel: React.FC<{
    hero: Entity;
    buildState: { talentProgression: TalentProgressionState; equipmentProgression: EquipmentProgressionState };
}> = ({ hero, buildState }) => {
    return (
        <div className="space-y-5">
            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Derived Stats
                </h5>
                <StatRow label="Accuracy" value={formatUiStat(hero.accuracyRating)} />
                <StatRow label="Evasion" value={formatUiStat(hero.evasionRating)} />
                <StatRow label="Parry" value={formatUiStat(hero.parryRating)} />
                <StatRow
                    label="Crit Chance"
                    value={formatRatioPercent(hero.critChance, 1)}
                />
                <StatRow
                    label="Crit Damage"
                    value={formatRatioPercent(hero.critDamage)}
                />
                <StatRow label="Armor Pen" value={formatUiStat(hero.armorPenetration)} />
                <StatRow label="Elemental Pen" value={formatUiStat(hero.elementalPenetration)} />
                <StatRow label="Tenacity" value={formatUiStat(hero.tenacity)} />
            </section>

            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Combat Ratings
                </h5>
                <RatingGrid
                    items={getCombatRatingStatItems(hero, buildState, {
                        shortLabels: true,
                        roundValues: true,
                    })}
                />
            </section>

            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Resistances
                </h5>
                <RatingGrid
                    items={getResistanceStatItems(hero, { shortLabels: true })}
                    columns={3}
                />
            </section>
        </div>
    );
};

// ─── TalentsPanel ────────────────────────────────────────────────────────────

const TalentsPanel: React.FC<{
    hero: Entity;
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
    unlockTalent: (heroId: string, talentId: string) => void;
}> = ({ hero, talentProgression, equipmentProgression, unlockTalent }) => {
    const heroClass = hero.class as HeroClass;
    const availableTalents = getTalentDefinitionsForClass(heroClass);
    const buildProfile = getHeroBuildProfile(hero, {
        talentProgression,
        equipmentProgression,
    });
    const talentPoints = getTalentPointsForHero(hero.id, talentProgression);
    const spentRanks = getSpentTalentRanksForHero(hero.id, talentProgression);
    const totalRankCapacity = getTotalTalentRankCapacity(heroClass);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {spentRanks}/{totalRankCapacity} ranks
                </span>
                <span className="rounded-full border border-violet-400/30 bg-violet-950/30 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-violet-200">
                    {talentPoints} pts
                </span>
            </div>

            <div className="space-y-2">
                {availableTalents.map((talent) => {
                    const currentRank = getTalentRankForHero(hero.id, talent.id, talentProgression);
                    const maxRank = talent.maxRank ?? 3;
                    const isUnlocked = currentRank > 0;
                    const isMaxed = currentRank >= maxRank;
                    return (
                        <div
                            key={talent.id}
                            className={`rounded-xl border p-3 ${
                                isUnlocked
                                    ? "border-emerald-400/40 bg-emerald-500/10"
                                    : "border-slate-700/60 bg-slate-900/70"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-100">{talent.name}</p>
                                        <span className="rounded-full border border-slate-600/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                            Rank {currentRank}/{maxRank}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {talent.description}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant={isUnlocked ? "secondary" : "upgrade"}
                                    disabled={isMaxed || talentPoints <= 0}
                                    onClick={() => unlockTalent(hero.id, talent.id)}
                                    className="shrink-0"
                                >
                                    {isMaxed ? "Maxed" : currentRank === 0 ? "Learn" : "Upgrade"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {buildProfile.passive && (
                <p className="pt-1 text-[10px] text-slate-500">
                    <span className="font-bold text-slate-400">Passive:</span>{" "}
                    {buildProfile.passive.name} — {buildProfile.passive.description}
                </p>
            )}
        </div>
    );
};

// ─── EquipmentPanel ──────────────────────────────────────────────────────────

const EquipmentPanel: React.FC<{
    hero: Entity;
    equipmentProgression: EquipmentProgressionState;
    equipItem: (heroId: string, itemId: string) => void;
    unequipItem: (heroId: string, slot: EquipmentSlot) => void;
    sellInventoryItem: (itemInstanceId: string) => void;
    buyInventoryCapacityUpgrade: () => void;
    highestFloorCleared: number;
    gold: string;
}> = ({
    hero,
    equipmentProgression,
    equipItem,
    unequipItem,
    sellInventoryItem,
    buyInventoryCapacityUpgrade,
    highestFloorCleared,
    gold,
}) => {
    const stashItems = getUnequippedInventoryItems(equipmentProgression, hero);
    const nextInventoryUpgrade = getNextInventoryCapacityUpgrade(equipmentProgression.inventoryCapacityLevel);
    const canBuyInventoryUpgrade = Boolean(
        nextInventoryUpgrade
            && highestFloorCleared >= nextInventoryUpgrade.milestoneFloor
            && Number(gold) >= nextInventoryUpgrade.cost,
    );

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Armory</p>
                        <p className="mt-1 text-xs text-slate-400">
                            Stash {equipmentProgression.inventoryItems.length}/{equipmentProgression.inventoryCapacity} • Tier {equipmentProgression.highestUnlockedEquipmentTier}
                        </p>
                    </div>
                    {nextInventoryUpgrade ? (
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                Next bag upgrade
                            </p>
                            <p className="text-xs text-slate-300">
                                +6 slots at floor {nextInventoryUpgrade.milestoneFloor} for {nextInventoryUpgrade.cost}g
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-emerald-300">Inventory capacity maxed</p>
                    )}
                </div>
                {nextInventoryUpgrade ? (
                    <Button
                        size="sm"
                        variant="upgrade"
                        disabled={!canBuyInventoryUpgrade}
                        onClick={buyInventoryCapacityUpgrade}
                    >
                        Expand Stash
                    </Button>
                ) : null}
            </div>

            {(Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).map((slot) => {
                const equippedItem = getEquippedItemForSlot(hero, equipmentProgression, slot);
                const inventoryItems = getAvailableInventoryItemsForHero(
                    hero,
                    equipmentProgression,
                    slot,
                );

                return (
                    <div
                        key={slot}
                        className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {SLOT_ICON[slot]}
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                                    {EQUIPMENT_SLOT_LABELS[slot]}
                                </span>
                            </div>
                            {equippedItem && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => unequipItem(hero.id, slot)}
                                >
                                    Remove
                                </Button>
                            )}
                        </div>

                        <p className="text-sm font-bold text-slate-100">
                            {equippedItem?.name ?? "Empty Slot"}
                        </p>
                        {equippedItem ? (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                    {formatEquipmentTierRank(equippedItem)}
                                </p>
                                <p className="text-xs text-slate-400">{equippedItem.description}</p>
                                <p className="text-[10px] text-slate-500">{getEquipmentAffinitySummary(equippedItem)}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic">No item equipped yet.</p>
                        )}

                        {inventoryItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {inventoryItems.map((item) => {
                                    const ownerId = getEquipmentOwnerId(item.id, equipmentProgression);
                                    const lockReason = getSlotLockedReason(
                                        hero,
                                        item,
                                        equipmentProgression,
                                    );
                                    const isEquippedHere = equippedItem?.id === item.id;
                                    return (
                                        <Button
                                            key={item.id}
                                            size="sm"
                                            variant={isEquippedHere ? "secondary" : "outline"}
                                            disabled={Boolean(lockReason) && !isEquippedHere}
                                            title={lockReason ?? `${item.description} • ${formatEquipmentTierRank(item)}`}
                                            onClick={() => equipItem(hero.id, item.id)}
                                            className={
                                                isEquippedHere
                                                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                                                    : ""
                                            }
                                        >
                                            {item.name} {formatEquipmentTierRank(item)}
                                            {ownerId && ownerId !== hero.id ? " (Busy)" : ""}
                                        </Button>
                                    );
                                })}
                            </div>
                        ) : (
                            !equippedItem && (
                                <p className="text-xs text-slate-500 italic">No items available</p>
                            )
                        )}
                    </div>
                );
            })}

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Stash</p>
                        <p className="mt-1 text-xs text-slate-400">Unequipped gear available to this hero.</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {stashItems.length} ready
                    </span>
                </div>

                {stashItems.length > 0 ? (
                    <div className="space-y-2">
                        {stashItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-100">
                                        {item.name} <span className="text-amber-300">{formatEquipmentTierRank(item)}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
                                    <p className="mt-1 text-[10px] text-slate-500">{getEquipmentAffinitySummary(item)}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => sellInventoryItem(item.id)}
                                >
                                    Sell {item.sellValue}g
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic">No unequipped items available for {hero.name}.</p>
                )}
            </div>
        </div>
    );
};

// ─── CharacterSheet ───────────────────────────────────────────────────────────

interface CharacterSheetProps {
    hero: Entity;
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({
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
    const buildState = { talentProgression, equipmentProgression };

    const hpRatio = hero.currentHp.dividedBy(hero.maxHp).toNumber();

    const expRatio = hero.expToNext.gt(0)
        ? hero.exp.dividedBy(hero.expToNext).clamp(0, 1).toNumber()
        : 0;

    const tabs: Array<{ id: CharacterSheetTab; label: string; icon: React.ReactNode }> = [
        { id: "basic", label: "Basic Stats", icon: <BarChart2 className="size-3.5" /> },
        { id: "secondary", label: "Secondary", icon: <Layers className="size-3.5" /> },
        { id: "talents", label: "Talents", icon: <Star className="size-3.5" /> },
        { id: "equipment", label: "Equipment", icon: <Package className="size-3.5" /> },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 w-full max-w-5xl mx-auto">
            {/* ── Column 1 ── */}
            <div className="flex flex-col gap-4">
                {/* Portrait card */}
                <Card className="bg-slate-900/80 border-slate-700/50 shadow-xl">
                    <CardContent className="p-4 space-y-4">
                        {/* Pagination header */}
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

                        {/* Portrait */}
                        <div className="relative mx-auto w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-600/60 bg-slate-800/60 shadow-lg">
                            <img
                                src={`${import.meta.env.BASE_URL}${template.imageAsset}`}
                                alt={`${hero.name} portrait`}
                                className="w-full h-full object-cover pointer-events-none select-none"
                                draggable={false}
                            />
                        </div>

                        {/* Name + badges */}
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

                        {/* Class description */}
                        <p className="text-center text-xs text-slate-500 italic leading-relaxed">
                            {template.description}
                        </p>
                    </CardContent>
                </Card>

                {/* Tab nav card */}
                <Card className="bg-slate-900/80 border-slate-700/50 shadow-xl">
                    <CardContent className="p-3 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                aria-pressed={activeTab === tab.id}
                                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                                    activeTab === tab.id
                                        ? "bg-slate-700 text-slate-100"
                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* ── Column 2 ── */}
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

// ─── PartyView ────────────────────────────────────────────────────────────────

export const PartyView: React.FC = () => {
    const party = useGameStore(useShallow(selectPartyHeroes));
    const [heroIndex, setHeroIndex] = useState(0);

    const clampedIndex = Math.min(heroIndex, Math.max(0, party.length - 1));
    const currentHero = party[clampedIndex];

    const handlePrev = () =>
        setHeroIndex((i) => (i - 1 + party.length) % party.length);
    const handleNext = () =>
        setHeroIndex((i) => (i + 1) % party.length);

    return (
        <div className="flex flex-1 w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.92)] overflow-y-auto p-4 lg:p-8">
            {party.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-slate-400 text-sm">No heroes in your party yet.</p>
                </div>
            ) : (
                <CharacterSheet
                    hero={currentHero}
                    index={clampedIndex}
                    total={party.length}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </div>
    );
};
