import type React from "react";

import {
    EQUIPMENT_SLOT_LABELS,
    getAvailableInventoryItemsForHero,
    getEquippedItemForSlot,
    getEquipmentOwnerId,
    getSlotLockedReason,
    getUnequippedInventoryItems,
    type EquipmentSlot,
} from "@/game/heroBuilds";
import {
    formatEquipmentTierRank,
    getEquipmentAffinitySummary,
    getNextInventoryCapacityUpgrade,
} from "@/game/equipmentProgression";
import type { Entity } from "@/game/entity";
import type { EquipmentProgressionState } from "@/game/store/types";
import { Button } from "@/components/ui/button";
import { SLOT_ICON } from "@/components/party-view/constants";

export const EquipmentPanel: React.FC<{
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
