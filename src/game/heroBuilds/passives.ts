import type { HeroClass } from "../entity";

import type { ClassPassiveDefinition } from "./shared";

export const CLASS_PASSIVES: Record<HeroClass, ClassPassiveDefinition> = {
    Warrior: {
        id: "warrior-battle-rhythm",
        heroClass: "Warrior",
        name: "Battle Rhythm",
        description: "Frontline grit sharpens defense and adds extra Rage whenever attacks resolve.",
        effects: {
            ratingBonuses: { guard: 3, power: 2 },
            resourceOnResolvedAttackBonus: 2,
        },
    },
    Cleric: {
        id: "cleric-sanctified-reserves",
        heroClass: "Cleric",
        name: "Sanctified Reserves",
        description: "Sacred discipline strengthens resolve and improves Bless's regeneration support.",
        effects: {
            ratingBonuses: { resolve: 3, spellPower: 2 },
            blessRegenMultiplierBonus: 0.05,
        },
    },
    Archer: {
        id: "archer-keen-eye",
        heroClass: "Archer",
        name: "Keen Eye",
        description: "A practiced eye boosts precision and adds extra crit pressure to burst shots.",
        effects: {
            ratingBonuses: { precision: 3, crit: 2 },
            specialAttackCritChanceBonus: 0.05,
        },
    },
};

export const getClassPassive = (heroClass: HeroClass) => CLASS_PASSIVES[heroClass];
