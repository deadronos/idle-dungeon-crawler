import { getCombatRatings } from "@/game/entity";
import type { Entity } from "@/game/entity";
import type {
    EquipmentProgressionState,
    TalentProgressionState,
} from "@/game/store/types";

import { formatPercent, formatUiStat } from "./helpers";

export interface DisplayStat {
    label: string;
    value: string;
}

interface BuildState {
    talentProgression: TalentProgressionState;
    equipmentProgression: EquipmentProgressionState;
}

const BASE_ATTRIBUTE_META = [
    { key: "vit", label: "VIT" },
    { key: "str", label: "STR" },
    { key: "dex", label: "DEX" },
    { key: "int", label: "INT" },
    { key: "wis", label: "WIS" },
] as const;

const COMBAT_RATING_META = [
    { key: "power", label: "Power", shortLabel: "POW" },
    { key: "spellPower", label: "Spell", shortLabel: "SP" },
    { key: "precision", label: "Precision", shortLabel: "PRE" },
    { key: "haste", label: "Haste", shortLabel: "HST" },
    { key: "guard", label: "Guard", shortLabel: "GRD" },
    { key: "resolve", label: "Resolve", shortLabel: "RES" },
    { key: "potency", label: "Potency", shortLabel: "POT" },
    { key: "crit", label: "Crit", shortLabel: "CRT" },
] as const;

const RESISTANCE_META = [
    { key: "fire", label: "Fire", shortLabel: "FIR" },
    { key: "water", label: "Water", shortLabel: "WAT" },
    { key: "earth", label: "Earth", shortLabel: "EAR" },
    { key: "air", label: "Air", shortLabel: "AIR" },
    { key: "light", label: "Light", shortLabel: "LIG" },
    { key: "shadow", label: "Shadow", shortLabel: "SHA" },
] as const;

export const getBaseAttributeStatItems = (entity: Entity): DisplayStat[] =>
    BASE_ATTRIBUTE_META.map(({ key, label }) => ({
        label,
        value: formatUiStat(entity.attributes[key]),
    }));

export const getDerivedDetailStatItems = (entity: Entity): DisplayStat[] => [
    ...getBaseAttributeStatItems(entity),
    { label: "ACC", value: Math.round(entity.accuracyRating).toString() },
    { label: "EVA", value: Math.round(entity.evasionRating).toString() },
    { label: "PAR", value: Math.round(entity.parryRating).toString() },
    { label: "APEN", value: formatUiStat(entity.armorPenetration) },
    { label: "EPEN", value: formatUiStat(entity.elementalPenetration) },
    { label: "TEN", value: formatUiStat(entity.tenacity) },
];

export const getCombatRatingStatItems = (
    entity: Entity,
    buildState: BuildState,
    options?: { shortLabels?: boolean; roundValues?: boolean },
): DisplayStat[] => {
    const ratings = getCombatRatings(entity, buildState);

    return COMBAT_RATING_META.map(({ key, label, shortLabel }) => ({
        label: options?.shortLabels ? shortLabel : label,
        value: options?.roundValues
            ? Math.round(ratings[key]).toString()
            : formatUiStat(ratings[key]),
    }));
};

export const getResistanceStatItems = (
    entity: Entity,
    options?: { shortLabels?: boolean },
): DisplayStat[] =>
    RESISTANCE_META.map(({ key, label, shortLabel }) => ({
        label: options?.shortLabels ? shortLabel : label,
        value: formatPercent(entity.resistances[key] * 100),
    }));
