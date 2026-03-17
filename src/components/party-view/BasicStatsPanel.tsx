import type React from "react";

import type { Entity } from "@/game/entity";
import { formatNumber } from "@/utils/format";
import { RatingGrid, StatRow } from "@/components/game-ui/primitives";
import { getBaseAttributeStatItems } from "@/components/game-ui/viewModels";

export const BasicStatsPanel: React.FC<{ hero: Entity; resourceLabel: string }> = ({
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
