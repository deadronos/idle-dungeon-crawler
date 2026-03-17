import type { CombatRatings } from "./entity.types";
import { ENEMY_ELEMENTS, type Attributes, type EnemyArchetype, type EnemyElement, type Entity } from "./entity.types";

const OFFENSIVE_ENEMY_ARCHETYPES: Array<Exclude<EnemyArchetype, "Support" | "Boss">> = ["Bruiser", "Skirmisher", "Caster"];
const capitalizeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const applyEnemyArchetypeBias = (attributes: Attributes, archetype: EnemyArchetype): Attributes => {
    switch (archetype) {
        case "Bruiser":
            return {
                vit: attributes.vit * 1.45,
                str: attributes.str * 1.25,
                dex: attributes.dex * 0.75,
                int: attributes.int * 0.7,
                wis: attributes.wis * 0.85,
            };
        case "Skirmisher":
            return {
                vit: attributes.vit * 0.85,
                str: attributes.str * 0.9,
                dex: attributes.dex * 1.45,
                int: attributes.int * 0.8,
                wis: attributes.wis * 1.05,
            };
        case "Caster":
            return {
                vit: attributes.vit * 0.9,
                str: attributes.str * 0.65,
                dex: attributes.dex * 0.95,
                int: attributes.int * 1.45,
                wis: attributes.wis * 1.25,
            };
        case "Support":
            return {
                vit: attributes.vit,
                str: attributes.str * 0.65,
                dex: attributes.dex * 0.95,
                int: attributes.int * 1.25,
                wis: attributes.wis * 1.45,
            };
        case "Boss":
            return {
                vit: attributes.vit * 1.25,
                str: attributes.str * 1.15,
                dex: attributes.dex * 1.2,
                int: attributes.int * 1.2,
                wis: attributes.wis * 1.2,
            };
        default:
            return attributes;
    }
};

export const isBossArchetype = (archetype?: EnemyArchetype | null) => archetype === "Boss";

export const getEnemyArchetypePoolForFloor = (floor: number): EnemyArchetype[] => {
    if (floor % 10 === 0) {
        return ["Boss"];
    }

    if (floor >= 11) {
        return ["Bruiser", "Skirmisher", "Caster", "Support"];
    }

    if (floor >= 5) {
        return ["Bruiser", "Skirmisher", "Caster"];
    }

    return ["Bruiser", "Skirmisher"];
};

export const getEncounterArchetypes = (floor: number, encounterSize: number): EnemyArchetype[] => {
    if (floor % 10 === 0) {
        return ["Boss"];
    }

    const archetypes: EnemyArchetype[] = Array.from({ length: encounterSize }, (_, index) => {
        const offensivePool = floor >= 5 ? OFFENSIVE_ENEMY_ARCHETYPES : OFFENSIVE_ENEMY_ARCHETYPES.slice(0, 2);
        return offensivePool[(floor + index) % offensivePool.length];
    });

    if (floor >= 11 && encounterSize >= 2 && floor % 2 === 1) {
        archetypes[encounterSize - 1] = "Support";
    }

    return archetypes;
};

export const getEnemyElementForEncounter = (floor: number, encounterIndex = 0): EnemyElement => {
    return ENEMY_ELEMENTS[(floor + encounterIndex) % ENEMY_ELEMENTS.length];
};

export const getEnemyArchetypeLabel = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "enemyElement">) => {
    if (!entity.isEnemy || !entity.enemyArchetype) {
        return null;
    }

    if ((entity.enemyArchetype === "Caster" || entity.enemyArchetype === "Boss") && entity.enemyElement) {
        return `${capitalizeLabel(entity.enemyElement)} ${entity.enemyArchetype}`;
    }

    return entity.enemyArchetype;
};

export const inferEnemyArchetype = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "name">): EnemyArchetype | undefined => {
    if (!entity.isEnemy) {
        return undefined;
    }

    if (entity.enemyArchetype) {
        return entity.enemyArchetype;
    }

    if (entity.name.startsWith("Boss:")) {
        return "Boss";
    }

    return "Bruiser";
};

export const getEnemyCombatRatingBiases = (entity: Pick<Entity, "isEnemy" | "enemyArchetype" | "name">): Partial<CombatRatings> => {
    switch (inferEnemyArchetype(entity)) {
        case "Bruiser":
            return { power: 3, guard: 5 };
        case "Skirmisher":
            return { precision: 5, haste: 5, crit: 4 };
        case "Caster":
            return { spellPower: 5, resolve: 2, potency: 4 };
        case "Support":
            return { spellPower: 3, resolve: 5, potency: 3 };
        case "Boss":
            return { power: 4, spellPower: 4, precision: 3, haste: 3, guard: 4, resolve: 4, potency: 4, crit: 3 };
        default:
            return {};
    }
};
