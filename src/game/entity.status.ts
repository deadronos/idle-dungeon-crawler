import type { StatusEffect, StatusEffectKey } from "./entity.types";

const capitalizeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getStatusEffectName = (statusKey: StatusEffectKey) => {
    switch (statusKey) {
        case "burn":
            return "Burn";
        case "slow":
            return "Slow";
        case "weaken":
            return "Weaken";
        case "regen":
            return "Regen";
        case "hex":
            return "Hex";
        case "blind":
            return "Blind";
        default:
            return capitalizeLabel(statusKey);
    }
};

export const getStatusEffectBadge = (statusEffect: Pick<StatusEffect, "key" | "stacks">) => {
    switch (statusEffect.key) {
        case "burn":
            return statusEffect.stacks > 1 ? `BRN x${statusEffect.stacks}` : "BRN";
        case "slow":
            return "SLW";
        case "weaken":
            return "WKN";
        case "regen":
            return "RGN";
        case "hex":
            return "HEX";
        case "blind":
            return "BLD";
        default:
            return capitalizeLabel(statusEffect.key).slice(0, 3).toUpperCase();
    }
};
