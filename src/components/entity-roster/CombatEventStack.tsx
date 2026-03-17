import type { CombatEvent } from "@/game/store/types";

interface CombatEventStackProps {
    entityId: string;
    combatEvents: CombatEvent[];
}

const getCombatEventClassName = (event: CombatEvent) => {
    switch (event.kind) {
        case "damage":
            return event.isCrit
                ? "border-amber-300/60 bg-amber-500/20 text-amber-100"
                : "border-red-400/50 bg-red-500/20 text-red-100";
        case "heal":
            return "border-emerald-300/60 bg-emerald-500/20 text-emerald-100";
        case "dodge":
            return "border-sky-300/60 bg-sky-500/20 text-sky-100";
        case "parry":
            return "border-slate-200/60 bg-slate-200/20 text-slate-50";
        case "crit":
            return "border-amber-300/60 bg-amber-500/20 text-amber-100";
        case "defeat":
            return "border-slate-400/60 bg-slate-700/40 text-slate-100";
        case "skill":
            return "border-violet-300/50 bg-violet-500/15 text-violet-100";
        case "status":
            if (event.statusPhase === "tick") {
                return "border-orange-300/50 bg-orange-500/15 text-orange-100";
            }
            if (event.statusPhase === "cleanse") {
                return "border-emerald-300/50 bg-emerald-500/15 text-emerald-100";
            }
            if (event.statusPhase === "expire") {
                return "border-slate-300/40 bg-slate-500/15 text-slate-100";
            }
            return "border-cyan-300/50 bg-cyan-500/15 text-cyan-100";
        default:
            return "border-slate-300/30 bg-slate-900/70 text-slate-100";
    }
};

export const CombatEventStack = ({ entityId, combatEvents }: CombatEventStackProps) => (
    <div
        data-testid={`combat-events-${entityId}`}
        className="pointer-events-none absolute inset-x-0 top-1 z-20 flex flex-col items-center gap-1"
    >
        {combatEvents
            .filter(
                (event) =>
                    event.targetId === entityId ||
                    (event.sourceId === entityId && event.kind === "skill"),
            )
            .slice(-3)
            .reverse()
            .map((event) => (
                <span
                    key={event.id}
                    className={`combat-event-float rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] shadow-lg ${getCombatEventClassName(event)}`}
                >
                    {event.text}
                </span>
            ))}
    </div>
);
