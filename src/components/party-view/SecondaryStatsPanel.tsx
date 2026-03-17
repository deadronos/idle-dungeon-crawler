import type React from "react";

import type { Entity } from "@/game/entity";
import type { EquipmentProgressionState, TalentProgressionState } from "@/game/store/types";
import { formatRatioPercent, formatUiStat } from "@/components/game-ui/helpers";
import { RatingGrid, StatRow } from "@/components/game-ui/primitives";
import {
    getCombatRatingStatItems,
    getResistanceStatItems,
} from "@/components/game-ui/viewModels";

export const SecondaryStatsPanel: React.FC<{
    hero: Entity;
    buildState: { talentProgression: TalentProgressionState; equipmentProgression: EquipmentProgressionState };
}> = ({ hero, buildState }) => {
    return (
        <div className="space-y-5">
            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Derived Stats
                </h5>
                <StatRow label="Accuracy" value={formatUiStat(hero.accuracyRating)} />
                <StatRow label="Evasion" value={formatUiStat(hero.evasionRating)} />
                <StatRow label="Parry" value={formatUiStat(hero.parryRating)} />
                <StatRow
                    label="Crit Chance"
                    value={formatRatioPercent(hero.critChance, 1)}
                />
                <StatRow
                    label="Crit Damage"
                    value={formatRatioPercent(hero.critDamage)}
                />
                <StatRow label="Armor Pen" value={formatUiStat(hero.armorPenetration)} />
                <StatRow label="Elemental Pen" value={formatUiStat(hero.elementalPenetration)} />
                <StatRow label="Tenacity" value={formatUiStat(hero.tenacity)} />
            </section>

            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Combat Ratings
                </h5>
                <RatingGrid
                    items={getCombatRatingStatItems(hero, buildState, {
                        shortLabels: true,
                        roundValues: true,
                    })}
                />
            </section>

            <section className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Resistances
                </h5>
                <RatingGrid
                    items={getResistanceStatItems(hero, { shortLabels: true })}
                    columns={3}
                />
            </section>
        </div>
    );
};
