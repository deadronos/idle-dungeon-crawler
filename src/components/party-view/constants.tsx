import type React from "react";
import { Shield, Sparkles, Sword, WandSparkles } from "lucide-react";

import type { EquipmentSlot } from "@/game/heroBuilds";
import type { HeroClass } from "@/game/entity";

export type CharacterSheetTab = "basic" | "secondary" | "talents" | "equipment";

export const SLOT_ICON: Record<EquipmentSlot, React.ReactNode> = {
    weapon: <Sword className="size-3.5 text-amber-300" />,
    armor: <Shield className="size-3.5 text-sky-300" />,
    charm: <Sparkles className="size-3.5 text-fuchsia-300" />,
    trinket: <WandSparkles className="size-3.5 text-emerald-300" />,
};

export const CLASS_BADGE: Record<HeroClass, string> = {
    Warrior: "text-orange-300 border-orange-400/30 bg-orange-500/10",
    Cleric: "text-sky-300 border-sky-400/30 bg-sky-500/10",
    Archer: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
};
