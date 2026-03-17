import type { Entity, StatusEffect } from "@/game/entity";
import { getHeroClassTemplate } from "@/game/classTemplates";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const formatUiStat = (value?: number): string => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "0";
    }

    if (Number.isInteger(value)) {
        return value.toString();
    }

    return value.toFixed(1).replace(/\.0$/, "");
};

export const formatPercent = (value: number, fractionDigits = 0): string => {
    const safeValue = Number.isFinite(value) ? value : 0;

    if (fractionDigits === 0) {
        return `${Math.round(safeValue)}%`;
    }

    return `${safeValue.toFixed(fractionDigits).replace(/\.0$/, "")}%`;
};

export const formatRatioPercent = (ratio: number, fractionDigits = 0): string =>
    formatPercent((Number.isFinite(ratio) ? ratio : 0) * 100, fractionDigits);

export const ratioToClampedPercent = (ratio: number): number =>
    clamp((Number.isFinite(ratio) ? ratio : 0) * 100, 0, 100);

export const getHealthBarColorClass = (ratio: number): string => {
    if (ratio <= 0.2) return "bg-red-500";
    if (ratio <= 0.5) return "bg-amber-500";
    return "bg-emerald-500";
};

export const getEntityHealthBarColorClass = (
    entity: Pick<Entity, "currentHp" | "maxHp">,
): string => {
    const ratio = entity.maxHp.lte(0) ? 0 : entity.currentHp.dividedBy(entity.maxHp).toNumber();
    return getHealthBarColorClass(ratio);
};

export const getEntityResourceBarColorClass = (
    entity: Pick<Entity, "isEnemy" | "class">,
): string => {
    if (!entity.isEnemy) {
        return getHeroClassTemplate(entity.class).resourceModel.barColorClass;
    }

    return "bg-purple-500";
};

export const getStatusChipToneClass = (
    polarity: StatusEffect["polarity"],
): string => (
    polarity === "buff"
        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
        : "border-red-400/30 bg-red-500/10 text-red-100"
);
