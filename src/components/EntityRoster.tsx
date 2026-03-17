import { useShallow } from "zustand/react/shallow";

import { EntityCard } from "@/components/entity-roster/EntityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Entity } from "@/game/entity";
import { useGameStore } from "@/game/store/gameStore";
import { selectEntityRosterState } from "@/game/store/selectors";

interface Props {
    title: string;
    entities: Entity[];
    alignRight?: boolean;
    className?: string;
}

export function EntityRoster({ title, entities, alignRight, className }: Props) {
    const { combatEvents, talentProgression, equipmentProgression, retireHero } = useGameStore(
        useShallow(selectEntityRosterState),
    );
    const buildState = { talentProgression, equipmentProgression };
    const sortedEntities = [...entities].sort(
        (a, b) => Number(b.currentHp.gt(0)) - Number(a.currentHp.gt(0)),
    );

    return (
        <Card
            className={`w-full lg:w-[360px] shrink-0 bg-slate-900/15 border-slate-700/50 shadow-xl flex flex-col h-full min-h-0 overflow-hidden ${alignRight ? "text-right" : "text-left"} ${className ?? ""}`}
        >
            <CardHeader className="pb-3 border-b border-slate-800/50">
                <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-200">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 custom-scrollbar snap-y snap-proximity">
                {sortedEntities.map((entity) => (
                    <EntityCard
                        key={entity.id}
                        entity={entity}
                        buildState={buildState}
                        combatEvents={combatEvents}
                        alignRight={alignRight}
                        onRetire={retireHero}
                    />
                ))}
            </CardContent>
        </Card>
    );
}
