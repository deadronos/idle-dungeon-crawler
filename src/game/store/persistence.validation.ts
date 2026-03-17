import Decimal from "decimal.js";

import { createLegacyEquipmentProgression, getInventoryCapacityForLevel } from "../equipmentProgression";
import { getExpRequirement } from "../entity";
import {
    createEmptyEquipmentProgressionState,
    createEmptyTalentProgressionState,
} from "./types";
import type { GameState } from "./types";

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const hasOwn = <TKey extends string>(value: Record<string, unknown>, key: TKey): value is Record<TKey, unknown> =>
    Object.prototype.hasOwnProperty.call(value, key);

export const getStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

export const getStringArrayRecord = (value: unknown): Record<string, string[]> => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, getStringArray(entryValue)]),
    );
};

export const getNumberRecord = (value: unknown): Record<string, number> => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.entries(value).reduce<Record<string, number>>((accumulator, [key, entryValue]) => {
        if (typeof entryValue === "number") {
            accumulator[key] = entryValue;
        }

        return accumulator;
    }, {});
};

export const getNestedNumberRecord = (value: unknown): Record<string, Record<string, number>> => {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, getNumberRecord(entryValue)]),
    );
};

export const getInventoryItemArray = (value: unknown) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((entry): entry is ReturnType<typeof createEmptyEquipmentProgressionState>["inventoryItems"][number] => {
        return isRecord(entry)
            && typeof entry.instanceId === "string"
            && typeof entry.definitionId === "string"
            && typeof entry.slot === "string"
            && typeof entry.tier === "number"
            && typeof entry.rank === "number"
            && typeof entry.sellValue === "number"
            && Array.isArray(entry.affinityTags)
            && entry.affinityTags.every((tag) => typeof tag === "string");
    }).map((entry) => ({
        instanceId: entry.instanceId,
        definitionId: entry.definitionId,
        slot: entry.slot,
        tier: entry.tier,
        rank: entry.rank,
        sellValue: entry.sellValue,
        affinityTags: [...entry.affinityTags],
    }));
};

export const sanitizeTalentProgression = (value: unknown) => {
    const defaults = createEmptyTalentProgressionState();
    if (!isRecord(value)) {
        return defaults;
    }

    const legacyUnlockedTalentIdsByHeroId = hasOwn(value, "unlockedTalentIdsByHeroId")
        ? value.unlockedTalentIdsByHeroId
        : undefined;

    return {
        talentRanksByHeroId: hasOwn(value, "talentRanksByHeroId")
            ? getNestedNumberRecord(value.talentRanksByHeroId)
            : legacyUnlockedTalentIdsByHeroId
                ? Object.fromEntries(
                    Object.entries(getStringArrayRecord(legacyUnlockedTalentIdsByHeroId)).map(([heroId, talentIds]) => [
                        heroId,
                        Object.fromEntries(talentIds.map((talentId) => [talentId, 1])),
                    ]),
                )
                : defaults.talentRanksByHeroId,
        talentPointsByHeroId: hasOwn(value, "talentPointsByHeroId")
            ? getNumberRecord(value.talentPointsByHeroId)
            : defaults.talentPointsByHeroId,
    };
};

export const sanitizeEquipmentProgression = (value: unknown) => {
    const defaults = createEmptyEquipmentProgressionState();
    if (!isRecord(value)) {
        return defaults;
    }

    if (hasOwn(value, "inventoryItems") || hasOwn(value, "equippedItemInstanceIdsByHeroId")) {
        const inventoryCapacityLevel = hasOwn(value, "inventoryCapacityLevel") && typeof value.inventoryCapacityLevel === "number"
            ? value.inventoryCapacityLevel
            : defaults.inventoryCapacityLevel;

        return {
            inventoryItems: hasOwn(value, "inventoryItems") ? getInventoryItemArray(value.inventoryItems) : defaults.inventoryItems,
            equippedItemInstanceIdsByHeroId: hasOwn(value, "equippedItemInstanceIdsByHeroId")
                ? getStringArrayRecord(value.equippedItemInstanceIdsByHeroId)
                : defaults.equippedItemInstanceIdsByHeroId,
            highestUnlockedEquipmentTier: hasOwn(value, "highestUnlockedEquipmentTier") && typeof value.highestUnlockedEquipmentTier === "number"
                ? value.highestUnlockedEquipmentTier
                : defaults.highestUnlockedEquipmentTier,
            inventoryCapacityLevel,
            inventoryCapacity: hasOwn(value, "inventoryCapacity") && typeof value.inventoryCapacity === "number"
                ? value.inventoryCapacity
                : getInventoryCapacityForLevel(inventoryCapacityLevel),
            nextInstanceSequence: hasOwn(value, "nextInstanceSequence") && typeof value.nextInstanceSequence === "number"
                ? value.nextInstanceSequence
                : defaults.nextInstanceSequence,
        };
    }

    const legacyValue = value as Record<string, unknown>;
    return createLegacyEquipmentProgression(
        hasOwn(legacyValue, "inventoryItemIds") ? getStringArray(legacyValue.inventoryItemIds) : [],
        hasOwn(legacyValue, "equippedItemIdsByHeroId") ? getStringArrayRecord(legacyValue.equippedItemIdsByHeroId) : {},
    );
};

export const sanitizeMigratedEntity = (value: unknown): unknown => {
    if (!isRecord(value)) {
        return value;
    }

    return {
        ...value,
        activeSkill: typeof value.activeSkill === "string" ? value.activeSkill : null,
        activeSkillTicks: typeof value.activeSkillTicks === "number" ? value.activeSkillTicks : 0,
        actionProgress: typeof value.actionProgress === "number" ? value.actionProgress : 0,
        guardStacks: typeof value.guardStacks === "number" ? value.guardStacks : 0,
        statusEffects: Array.isArray(value.statusEffects) ? value.statusEffects : [],
    };
};

export const getDecimalValue = (value: unknown) => {
    if (value instanceof Decimal) {
        return value;
    }

    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }

    try {
        return new Decimal(value);
    } catch {
        return null;
    }
};

export const normalizeHeroProgressionToCurrentCurve = (value: unknown): unknown => {
    if (!isRecord(value) || value.isEnemy === true || typeof value.level !== "number" || !Number.isFinite(value.level) || value.level < 1) {
        return value;
    }

    const normalizedExpToNext = getExpRequirement(value.level);
    const savedExp = getDecimalValue(value.exp);
    const savedExpToNext = getDecimalValue(value.expToNext);

    if (!savedExp || !savedExpToNext || savedExpToNext.lte(0)) {
        return {
            ...value,
            expToNext: normalizedExpToNext.toString(),
        };
    }

    const progressRatio = Decimal.max(0, Decimal.min(1, savedExp.div(savedExpToNext)));
    let normalizedExp = normalizedExpToNext.times(progressRatio).floor();

    if (normalizedExp.gte(normalizedExpToNext)) {
        normalizedExp = Decimal.max(0, normalizedExpToNext.minus(1));
    }

    return {
        ...value,
        exp: normalizedExp.toString(),
        expToNext: normalizedExpToNext.toString(),
    };
};

export const sanitizeEntityArray = (value: unknown) => Array.isArray(value) ? value.map(sanitizeMigratedEntity) : value;

export const toPartialGameState = (value: unknown): Partial<GameState> => {
    if (!isRecord(value)) {
        throw new Error("Save data must be a JSON object.");
    }

    const candidate: Partial<GameState> = {};

    if (Array.isArray(value.party)) {
        candidate.party = value.party as GameState["party"];
    }

    if (Array.isArray(value.enemies)) {
        candidate.enemies = value.enemies as GameState["enemies"];
    }

    if (typeof value.gold === "string" || typeof value.gold === "number") {
        candidate.gold = value.gold as unknown as GameState["gold"];
    }

    if (typeof value.floor === "number") {
        candidate.floor = value.floor;
    }

    if (typeof value.autoFight === "boolean") {
        candidate.autoFight = value.autoFight;
    }

    if (typeof value.autoAdvance === "boolean") {
        candidate.autoAdvance = value.autoAdvance;
    }

    if (Array.isArray(value.combatLog) && value.combatLog.every((entry) => typeof entry === "string")) {
        candidate.combatLog = value.combatLog;
    }

    if (isRecord(value.metaUpgrades)) {
        const metaUpgrades: GameState["metaUpgrades"] = {
            training: typeof value.metaUpgrades.training === "number" ? value.metaUpgrades.training : 0,
            fortification: typeof value.metaUpgrades.fortification === "number" ? value.metaUpgrades.fortification : 0,
        };
        candidate.metaUpgrades = metaUpgrades;
    }

    if (typeof value.partyCapacity === "number") {
        candidate.partyCapacity = value.partyCapacity;
    }

    if (typeof value.maxPartySize === "number") {
        candidate.maxPartySize = value.maxPartySize;
    }

    if (typeof value.highestFloorCleared === "number") {
        candidate.highestFloorCleared = value.highestFloorCleared;
    }

    if (value.activeSection === "dungeon" || value.activeSection === "shop") {
        candidate.activeSection = value.activeSection;
    }

    if (typeof value.heroSouls === "string" || typeof value.heroSouls === "number") {
        candidate.heroSouls = value.heroSouls as unknown as GameState["heroSouls"];
    }

    if (isRecord(value.prestigeUpgrades)) {
        const prestigeUpgrades: GameState["prestigeUpgrades"] = {
            costReducer: typeof value.prestigeUpgrades.costReducer === "number" ? value.prestigeUpgrades.costReducer : 0,
            hpMultiplier: typeof value.prestigeUpgrades.hpMultiplier === "number" ? value.prestigeUpgrades.hpMultiplier : 0,
            gameSpeed: typeof value.prestigeUpgrades.gameSpeed === "number" ? value.prestigeUpgrades.gameSpeed : 0,
            xpMultiplier: typeof value.prestigeUpgrades.xpMultiplier === "number" ? value.prestigeUpgrades.xpMultiplier : 0,
        };
        candidate.prestigeUpgrades = prestigeUpgrades;
    }

    if (isRecord(value.talentProgression)) {
        candidate.talentProgression = sanitizeTalentProgression(value.talentProgression);
    }

    if (isRecord(value.equipmentProgression)) {
        candidate.equipmentProgression = sanitizeEquipmentProgression(value.equipmentProgression);
    }

    return candidate;
};
