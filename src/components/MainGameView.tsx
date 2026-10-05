import React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Swords, Zap } from "lucide-react";

import type { Entity } from "../game/entity";
import { getEnemyArchetypeLabel } from "../game/entity";
import { getRegionDefinition } from "../game/regions";
import { useGameStore } from "../game/store/gameStore";
import { Button } from "@/components/ui/button";

import { CombatLog } from "./CombatLog";
import { EntityRoster } from "./EntityRoster";

const panelSurfaceClassName =
    "w-full rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-md shadow-[0_0_30px_rgba(15,23,42,0.8)]";
const runBehaviorToggleBaseClassName =
    "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition";

const getRunBehaviorToggleClassName = (isActive: boolean, accent: "green" | "amber") => {
    if (isActive) {
        return accent === "green"
            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
            : "border-amber-400/70 bg-amber-500/15 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.3)]";
    }

    return "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500";
};

type RunBehaviorToggleConfig = {
    id: "autofight" | "autoadvance";
    label: string;
    description: string;
    enabled: boolean;
    icon: LucideIcon;
    onToggle: () => void;
    accent: "green" | "amber";
};

const RunBehaviorToggle: React.FC<RunBehaviorToggleConfig> = ({
    id,
    label,
    description,
    enabled,
    icon: Icon,
    onToggle,
    accent,
}) => (
    <>
        <input id={`${id}-toggle`} type="checkbox" checked={enabled} onChange={onToggle} className="sr-only" />
        <label htmlFor={`${id}-toggle`} className="sr-only">{label}</label>
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={enabled}
            className={`${runBehaviorToggleBaseClassName} ${getRunBehaviorToggleClassName(enabled, accent)}`}
        >
            <span>
                <span className="block text-xs uppercase tracking-wider text-slate-400">{label}</span>
                <span className="block text-sm font-bold">{description}</span>
            </span>
            <Icon className="size-4" />
        </button>
    </>
);

const EncounterStage: React.FC<{
    primaryEnemy: Entity | undefined;
    hasLivingEnemy: boolean;
    primaryEnemyLabel: string | null;
}> = ({ primaryEnemy, hasLivingEnemy, primaryEnemyLabel }) => {
    if (!primaryEnemy || !hasLivingEnemy) {
        return (
            <div className="flex max-w-sm flex-col items-center gap-2 text-center text-slate-200">
                <Swords className="size-8 text-amber-300/80" aria-hidden="true" />
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Encounter cleared</p>
                <p className="text-sm text-slate-300">The next foe is already lurking nearby, so the log stays pinned in place.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <img
                src={primaryEnemy.image}
                alt="Enemy"
                className="pointer-events-none h-auto w-full max-w-[280px] animate-[idle-float_3s_ease-in-out_infinite] object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]"
                draggable={false}
            />
            <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-200 shadow-[0_0_18px_rgba(15,23,42,0.35)]">
                {primaryEnemy.name}
                {primaryEnemyLabel ? ` • ${primaryEnemyLabel}` : ""}
            </div>
        </div>
    );
};

export const MainGameView: React.FC = () => {
    const party = useGameStore((state) => state.party);
    const enemies = useGameStore((state) => state.enemies);
    const floor = useGameStore((state) => state.floor);
    const currentRegionId = useGameStore((state) => state.currentRegionId);
    const regionName = React.useMemo(() => (currentRegionId ? getRegionDefinition(currentRegionId).name : ""), [currentRegionId]);
    const autoFight = useGameStore((state) => state.autoFight);
    const autoAdvance = useGameStore((state) => state.autoAdvance);
    const previousFloor = useGameStore((state) => state.previousFloor);
    const nextFloor = useGameStore((state) => state.nextFloor);
    const toggleAutoFight = useGameStore((state) => state.toggleAutoFight);
    const toggleAutoAdvance = useGameStore((state) => state.toggleAutoAdvance);

    const hasLivingEnemy = enemies.some((enemy) => enemy.currentHp.gt(0));
    const primaryEnemy = enemies.find((enemy) => enemy.currentHp.gt(0)) ?? enemies[0];
    const primaryEnemyLabel = primaryEnemy ? getEnemyArchetypeLabel(primaryEnemy) : null;

    const runStateLabel = autoAdvance
        ? "Auto-advance enabled"
        : autoFight
            ? "Run will stop after this floor"
            : "Manual control enabled";

    const runBehaviorToggles: RunBehaviorToggleConfig[] = [
        {
            id: "autofight",
            label: "Autofight",
            description: "Fight automatically",
            enabled: autoFight,
            icon: Swords,
            onToggle: toggleAutoFight,
            accent: "green",
        },
        {
            id: "autoadvance",
            label: "Autoadvance",
            description: "Push deeper automatically",
            enabled: autoAdvance,
            icon: Zap,
            onToggle: toggleAutoAdvance,
            accent: "amber",
        },
    ];

    return (
        <div className="flex-2 flex flex-col items-center justify-center relative w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="flex w-full h-full min-h-0 p-4 lg:p-8 gap-6 lg:gap-8 justify-between items-stretch flex-wrap lg:flex-nowrap overflow-y-auto lg:overflow-y-hidden">
                <EntityRoster title="The Party" entities={party} className="order-first lg:order-none" />

                <div className="flex-1 lg:flex-2 min-w-[300px] min-h-0 flex flex-col items-center relative lg:order-none gap-4 lg:gap-6">
                    <div className={`${panelSurfaceClassName} px-4 py-3 lg:px-6 lg:py-4`}>
                        <div className="flex items-center justify-between gap-3 text-white">
                            <Button
                                variant="nav"
                                size="icon"
                                aria-label="Previous floor"
                                disabled={floor <= 1}
                                onClick={previousFloor}
                            >
                                <ChevronLeft className="size-5" />
                            </Button>
                            <div className="text-center">
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-amber-300/80">{regionName}</p>
                                <p className="text-2xl lg:text-4xl font-black tracking-widest uppercase">Floor {floor}</p>
                            </div>
                            <Button
                                variant="nav"
                                size="icon"
                                aria-label="Next floor"
                                onClick={nextFloor}
                            >
                                <ChevronRight className="size-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 lg:px-5 lg:py-5 space-y-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300 font-bold">Run Behavior</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {runBehaviorToggles.map((toggle) => (
                                <RunBehaviorToggle key={toggle.id} {...toggle} />
                            ))}
                        </div>
                        <p className="text-xs text-slate-300">
                            {autoFight ? "Party is auto-fighting. " : "Party waits for your command. "}
                            <span className="text-amber-300">{runStateLabel}.</span>
                        </p>
                    </div>

                    <div className="flex min-h-0 w-full flex-1 flex-col justify-end gap-4 lg:gap-6">
                        <div
                            data-testid="encounter-stage"
                            className="pointer-events-none flex min-h-[180px] lg:min-h-[260px] lg:flex-1 w-full items-center justify-center rounded-2xl border border-white/10 bg-slate-900/1 p-4 lg:p-8"
                        >
                            <EncounterStage
                                primaryEnemy={primaryEnemy}
                                hasLivingEnemy={hasLivingEnemy}
                                primaryEnemyLabel={primaryEnemyLabel}
                            />
                        </div>

                        <CombatLog className="mt-auto" />
                    </div>
                </div>

                <EntityRoster title="Enemies" entities={enemies} alignRight={true} />
            </div>
        </div>
    );
};
