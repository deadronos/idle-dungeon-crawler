import { StatusChip } from "@/components/game-ui/primitives";
import { getStatusEffectBadge, type Entity } from "@/game/entity";

interface StatusBadgeListProps {
    entity: Entity;
}

export const StatusBadgeList = ({ entity }: StatusBadgeListProps) => {
    if (entity.statusEffects.length === 0) {
        return null;
    }

    return (
        <div
            data-testid={`status-badges-${entity.id}`}
            className="pointer-events-none absolute left-0 top-0 z-10 flex max-w-[45%] flex-wrap gap-1"
        >
            {entity.statusEffects.map((statusEffect) => (
                <StatusChip
                    key={`${entity.id}-${statusEffect.key}`}
                    polarity={statusEffect.polarity}
                    label={getStatusEffectBadge(statusEffect)}
                />
            ))}
        </div>
    );
};
