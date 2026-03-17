import type { Entity, HeroClass } from "../entity";
import type { EquipmentItemInstance } from "../store/types";

import {
    isPlayableHeroClass,
    type EquipmentItemDefinition,
    type ResolvedEquipmentItem,
} from "./shared";
import {
    getEquipmentDefinition,
    getEquipmentSellValue,
    resolveEquipmentItemEffects,
} from "./equipment.catalog";

export const createEquipmentItemInstance = (
    definitionId: string,
    options?: {
        tier?: number;
        rank?: number;
        instanceId?: string;
        sequence?: number;
    },
): EquipmentItemInstance | null => {
    const definition = getEquipmentDefinition(definitionId);
    if (!definition) {
        return null;
    }

    const tier = Math.max(1, options?.tier ?? 1);
    const rank = Math.max(1, options?.rank ?? 1);
    const sequence = Math.max(1, options?.sequence ?? 1);

    return {
        instanceId: options?.instanceId ?? `equipment_${sequence}`,
        definitionId,
        slot: definition.slot,
        tier,
        rank,
        sellValue: getEquipmentSellValue(definition, tier, rank),
        affinityTags: [...definition.affinityTags],
    };
};

export const createEquipmentInstancesFromDefinitionIds = (definitionIds: string[], prefix: string) =>
    definitionIds
        .map((definitionId, index) =>
            createEquipmentItemInstance(definitionId, {
                instanceId: `${prefix}-${index + 1}`,
                sequence: index + 1,
            }),
        )
        .filter((item): item is EquipmentItemInstance => Boolean(item));

export const resolveEquipmentItem = (item: EquipmentItemInstance): ResolvedEquipmentItem | null => {
    const definition = getEquipmentDefinition(item.definitionId);
    if (!definition) {
        return null;
    }

    return {
        ...item,
        id: item.instanceId,
        name: definition.name,
        description: definition.description,
        heroClasses: definition.heroClasses,
        effects: resolveEquipmentItemEffects(definition, item.tier, item.rank),
    };
};

export const canHeroEquipItem = (
    heroClass: HeroClass,
    item: Pick<EquipmentItemDefinition, "heroClasses"> | Pick<ResolvedEquipmentItem, "heroClasses">,
) => !item.heroClasses || item.heroClasses.includes(heroClass);

export const isHeroEligibleForEquipment = (hero: Pick<Entity, "class" | "isEnemy">): hero is Pick<Entity, "class" | "isEnemy"> & { class: HeroClass } =>
    !hero.isEnemy && isPlayableHeroClass(hero.class);
