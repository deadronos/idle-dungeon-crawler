import type { Entity } from "../entity";

import { getHeroEquippedItems } from "./equipment";
import { getClassPassive } from "./passives";
import {
    createEmptyEffects,
    isPlayableHeroClass,
    mergeEffects,
    type HeroBuildProfile,
    type HeroBuildState,
} from "./shared";
import { getHeroUnlockedTalents } from "./talents";

export const getHeroBuildProfile = (
    hero: Pick<Entity, "id" | "class" | "isEnemy">,
    buildState?: HeroBuildState,
): HeroBuildProfile => {
    if (hero.isEnemy || !isPlayableHeroClass(hero.class)) {
        return {
            passive: null,
            talents: [],
            equippedItems: [],
            effects: createEmptyEffects(),
        };
    }
    const heroClass = hero.class;

    const passive = getClassPassive(heroClass);
    const talents = buildState ? getHeroUnlockedTalents(hero, buildState.talentProgression) : [];
    const equippedItems = buildState ? getHeroEquippedItems(hero, buildState.equipmentProgression) : [];
    const effects = createEmptyEffects();

    mergeEffects(effects, passive.effects);
    talents.forEach((talent) => mergeEffects(effects, talent.effects));
    equippedItems.forEach((item) => mergeEffects(effects, item.effects));

    return {
        passive,
        talents,
        equippedItems,
        effects,
    };
};
