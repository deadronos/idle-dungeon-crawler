import React from "react";

import { cn } from "@/lib/utils";

import { getStatusChipToneClass, ratioToClampedPercent } from "./helpers";
import type { DisplayStat } from "./viewModels";

export const StatRow: React.FC<{
    label: string;
    value: React.ReactNode;
    accent?: boolean;
    className?: string;
}> = ({ label, value, accent, className }) => (
    <div
        className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2",
            accent
                ? "border border-slate-600/50 bg-slate-800/70"
                : "border border-slate-700/30 bg-slate-900/40",
            className,
        )}
    >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
        </span>
        <span className="text-sm font-black text-slate-100">{value}</span>
    </div>
);

const GRID_COLUMNS = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
} as const;

export const RatingGrid: React.FC<{
    items: DisplayStat[];
    columns?: keyof typeof GRID_COLUMNS;
    className?: string;
    itemClassName?: string;
}> = ({ items, columns = 4, className, itemClassName }) => (
    <div className={cn("grid gap-1.5", GRID_COLUMNS[columns], className)}>
        {items.map((item) => (
            <div
                key={item.label}
                className={cn(
                    "flex flex-col items-center rounded-xl border border-slate-700/50 bg-slate-800/80 py-2 px-1",
                    itemClassName,
                )}
            >
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    {item.label}
                </span>
                <span className="mt-0.5 text-sm font-black text-slate-100">{item.value}</span>
            </div>
        ))}
    </div>
);

export const ProgressBar: React.FC<{
    percent: number;
    colorClassName: string;
    label?: React.ReactNode;
    value?: React.ReactNode;
    captionPosition?: "top" | "overlay";
    className?: string;
    trackClassName?: string;
    fillClassName?: string;
    captionClassName?: string;
    barClassName?: string;
}> = ({
    percent,
    colorClassName,
    label,
    value,
    captionPosition = "top",
    className,
    trackClassName,
    fillClassName,
    captionClassName,
    barClassName,
}) => (
    <div className={cn("space-y-1", className)}>
        {captionPosition === "top" && (label || value) ? (
            <div
                className={cn(
                    "flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500",
                    captionClassName,
                )}
            >
                <span>{label}</span>
                <span>{value}</span>
            </div>
        ) : null}
        <div
            className={cn(
                "relative overflow-hidden rounded-full bg-slate-700/60",
                barClassName,
                trackClassName,
            )}
        >
            <div
                className={cn(
                    "h-full rounded-full transition-all",
                    colorClassName,
                    fillClassName,
                )}
                style={{ width: `${ratioToClampedPercent(percent / 100)}%` }}
            />
            {captionPosition === "overlay" && (label || value) ? (
                <span
                    className={cn(
                        "absolute inset-0 z-10 flex items-center justify-between px-2 font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
                        captionClassName,
                    )}
                >
                    <span>{label}</span>
                    <span>{value}</span>
                </span>
            ) : null}
        </div>
    </div>
);

export const StatusChip: React.FC<{
    label: string;
    polarity: "buff" | "debuff";
    className?: string;
}> = ({ label, polarity, className }) => (
    <span
        className={cn(
            "rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] shadow-md backdrop-blur-sm",
            getStatusChipToneClass(polarity),
            className,
        )}
    >
        {label}
    </span>
);
