import Decimal from "decimal.js";

import { getHeroClassTemplate } from "../classTemplates";
import {
    BASE_META_UPGRADES,
    createEnemy,
    getEncounterArchetypes,
    getEnemyElementForEncounter,
    inferEnemyArchetype,
    recalculateEntity,
    type Entity,
    type MetaUpgrades,
    type PrestigeUpgrades,
} from "../entity";
import {
    synchronizeEquipmentProgression,
    synchronizeTalentProgression,
    type HeroBuildState,
} from "../heroBuilds";
import { MAX_PARTY_SIZE } from "../partyProgression";
import {
    createEmptyEquipmentProgressionState,
    createEmptyTalentProgressionState,
    type GameState,
} from "../store/types";
import { prependCombatMessages } from "../combatLog";

export const POST_VICTORY_HP_RECOVERY_RATIO = 0.25;

export const isBossFloor = (floor: number) => floor % 10 === 0;

export const getEncounterSize = (floor: number) => {
    if (isBossFloor(floor)) {
        return 1;
    }

    const floorCap = Math.max(1, Math.min(MAX_PARTY_SIZE, Math.ceil(floor / 5)));
    return floorCap;
};

export const createEncounter = (floor: number) => {
    const encounterSize = getEncounterSize(floor);
    const archetypes = getEncounterArchetypes(floor, encounterSize);

    return archetypes.map((archetype, index) => createEnemy(floor, `enemy_${floor}_${index}`, {
        archetype,
        boss: archetype === "Boss",
        element: archetype === "Caster" || archetype === "Boss"
            ? getEnemyElementForEncounter(floor, index)
            : undefined,
    }));
};

export const cloneEntity = (entity: Entity): Entity => ({
    ...entity,
    enemyArchetype: inferEnemyArchetype(entity),
    enemyElement: (() => {
        const archetype = inferEnemyArchetype(entity);
        if (archetype === "Caster" || archetype === "Boss") {
            return entity.enemyElement ?? getEnemyElementForEncounter(entity.level);
        }

        return null;
    })(),
    exp: new Decimal(entity.exp),
    expToNext: new Decimal(entity.expToNext),
    attributes: { ...entity.attributes },
    maxHp: new Decimal(entity.maxHp),
    currentHp: new Decimal(entity.currentHp),
    maxResource: new Decimal(entity.maxResource),
    currentResource: new Decimal(entity.currentResource),
    armor: new Decimal(entity.armor),
    physicalDamage: new Decimal(entity.physicalDamage),
    magicDamage: new Decimal(entity.magicDamage),
    accuracyRating: entity.accuracyRating ?? 0,
    evasionRating: entity.evasionRating ?? 0,
    parryRating: entity.parryRating ?? 0,
    armorPenetration: entity.armorPenetration ?? 0,
    elementalPenetration: entity.elementalPenetration ?? 0,
    tenacity: entity.tenacity ?? 0,
    resistances: { ...entity.resistances },
    activeSkill: entity.activeSkill,
    activeSkillTicks: entity.activeSkillTicks,
    guardStacks: entity.guardStacks ?? 0,
    statusEffects: (entity.statusEffects ?? []).map((statusEffect) => ({ ...statusEffect })),
});

const clearEncounterState = (entity: Entity): Entity => ({
    ...cloneEntity(entity),
    activeSkill: null,
    activeSkillTicks: 0,
    guardStacks: 0,
    actionProgress: 0,
    statusEffects: [],
});

const recoverHpAfterVictory = (entity: Entity): Entity => {
    const cleared = clearEncounterState(entity);

    if (cleared.currentHp.lte(0)) {
        return cleared;
    }

    const recoveredHp = cleared.maxHp.times(POST_VICTORY_HP_RECOVERY_RATIO);
    cleared.currentHp = Decimal.min(cleared.maxHp, cleared.currentHp.plus(recoveredHp));
    return cleared;
};

export const recalculateParty = (
    party: Entity[],
    upgrades: MetaUpgrades,
    prestigeUpgrades?: PrestigeUpgrades,
    buildState?: HeroBuildState,
): Entity[] => {
    return party.map((hero) => recalculateEntity(cloneEntity(hero), upgrades, prestigeUpgrades, buildState));
};

const hasValidCombatRatings = (entity: Partial<Entity>) => {
    return [
        entity.accuracyRating,
        entity.evasionRating,
        entity.parryRating,
        entity.armorPenetration,
        entity.elementalPenetration,
        entity.tenacity,
    ].every(
        (rating) => typeof rating === "number" && Number.isFinite(rating),
    );
};

const hydrateEntity = (
    entity: Entity,
    upgrades: MetaUpgrades,
    prestigeUpgrades?: PrestigeUpgrades,
    buildState?: HeroBuildState,
) => {
    const cloned = cloneEntity(entity);

    if (hasValidCombatRatings(entity)) {
        return entity.isEnemy ? cloned : recalculateEntity(cloned, upgrades, prestigeUpgrades, buildState);
    }

    return recalculateEntity(cloned, upgrades, prestigeUpgrades, buildState);
};

export const createInitialGameState = (overrides?: Partial<GameState>): GameState => {
    const metaUpgrades = { ...BASE_META_UPGRADES, ...overrides?.metaUpgrades };
    const prestigeUpgrades = {
        costReducer: overrides?.prestigeUpgrades?.costReducer ?? 0,
        hpMultiplier: overrides?.prestigeUpgrades?.hpMultiplier ?? 0,
        gameSpeed: overrides?.prestigeUpgrades?.gameSpeed ?? 0,
        xpMultiplier: overrides?.prestigeUpgrades?.xpMultiplier ?? 0,
    };
    const rawParty = overrides?.party ?? [];
    const syncedTalentProgression = synchronizeTalentProgression(rawParty, {
        ...createEmptyTalentProgressionState(),
        ...overrides?.talentProgression,
        talentRanksByHeroId: {
            ...createEmptyTalentProgressionState().talentRanksByHeroId,
            ...(overrides?.talentProgression?.talentRanksByHeroId ?? {}),
        },
        talentPointsByHeroId: {
            ...createEmptyTalentProgressionState().talentPointsByHeroId,
            ...(overrides?.talentProgression?.talentPointsByHeroId ?? {}),
        },
    });
    const syncedEquipmentProgression = synchronizeEquipmentProgression(rawParty, {
        ...createEmptyEquipmentProgressionState(),
        ...overrides?.equipmentProgression,
        inventoryItems: [...(overrides?.equipmentProgression?.inventoryItems ?? [])],
        equippedItemInstanceIdsByHeroId: {
            ...createEmptyEquipmentProgressionState().equippedItemInstanceIdsByHeroId,
            ...(overrides?.equipmentProgression?.equippedItemInstanceIdsByHeroId ?? {}),
        },
    });
    const buildState: HeroBuildState = {
        talentProgression: syncedTalentProgression,
        equipmentProgression: syncedEquipmentProgression,
    };

    return {
        party: rawParty.map((entity) => hydrateEntity(entity, metaUpgrades, prestigeUpgrades, buildState)),
        enemies: overrides?.enemies?.map((entity) => hydrateEntity(entity, BASE_META_UPGRADES)) ?? [],
        gold: new Decimal(overrides?.gold ?? 0),
        floor: overrides?.floor ?? 1,
        autoFight: overrides?.autoFight ?? true,
        autoAdvance: overrides?.autoAdvance ?? true,
        combatLog: overrides?.combatLog ? [...overrides.combatLog] : [],
        combatEvents: overrides?.combatEvents ? overrides.combatEvents.map((event) => ({ ...event })) : [],
        metaUpgrades,
        partyCapacity: overrides?.partyCapacity ?? 1,
        maxPartySize: overrides?.maxPartySize ?? MAX_PARTY_SIZE,
        highestFloorCleared: overrides?.highestFloorCleared ?? 0,
        activeSection: overrides?.activeSection ?? "dungeon",
        heroSouls: new Decimal(overrides?.heroSouls ?? 0),
        prestigeUpgrades,
        talentProgression: syncedTalentProgression,
        equipmentProgression: syncedEquipmentProgression,
    };
};

export const getInitializedPartyState = (state: GameState, party: Entity[]): Partial<GameState> => {
    const talentProgression = synchronizeTalentProgression(party, createEmptyTalentProgressionState());
    const equipmentProgression = synchronizeEquipmentProgression(party, createEmptyEquipmentProgressionState());
    const buildState: HeroBuildState = { talentProgression, equipmentProgression };

    return {
        party: recalculateParty(party, state.metaUpgrades, state.prestigeUpgrades, buildState),
        enemies: createEncounter(1),
        combatLog: [`${party[0]?.name ?? "The party"} leads the party into the dungeon...`],
        combatEvents: [],
        activeSection: "dungeon",
        talentProgression,
        equipmentProgression,
    };
};

export const getFloorTransitionState = (state: GameState, floor: number): Partial<GameState> => ({
    floor,
    party: state.party.map(clearEncounterState),
    enemies: createEncounter(floor),
    combatLog: prependCombatMessages(state.combatLog, `Moved to floor ${floor}...`),
    combatEvents: [],
});

export const getFloorReplayState = (state: GameState): Partial<GameState> => ({
    party: state.party.map(clearEncounterState),
    enemies: createEncounter(state.floor),
    combatLog: prependCombatMessages(state.combatLog, `Repeating floor ${state.floor}...`),
    combatEvents: [],
});

export const getPostVictoryFloorTransitionState = (state: GameState, floor: number): Partial<GameState> => ({
    floor,
    party: state.party.map(recoverHpAfterVictory),
    enemies: createEncounter(floor),
    combatLog: prependCombatMessages(
        state.combatLog,
        `The party recovers ${Math.round(POST_VICTORY_HP_RECOVERY_RATIO * 100)}% HP before the next encounter.`,
        `Moved to floor ${floor}...`,
    ),
    combatEvents: [],
});

export const getPostVictoryFloorReplayState = (state: GameState): Partial<GameState> => ({
    party: state.party.map(recoverHpAfterVictory),
    enemies: createEncounter(state.floor),
    combatLog: prependCombatMessages(
        state.combatLog,
        `The party recovers ${Math.round(POST_VICTORY_HP_RECOVERY_RATIO * 100)}% HP before the next encounter.`,
        `Repeating floor ${state.floor}...`,
    ),
    combatEvents: [],
});

export const getPartyWipeState = (state: GameState): Partial<GameState> => {
    const buildState: HeroBuildState = {
        talentProgression: state.talentProgression,
        equipmentProgression: state.equipmentProgression,
    };
    const healedParty = state.party.map((hero) => {
        const refreshed = recalculateEntity(cloneEntity(hero), state.metaUpgrades, state.prestigeUpgrades, buildState);
        const heroTemplate = getHeroClassTemplate(hero.class);
        refreshed.currentHp = refreshed.maxHp;
        refreshed.currentResource = heroTemplate.resourceModel.startsFull ? refreshed.maxResource : new Decimal(0);
        refreshed.guardStacks = 0;
        refreshed.statusEffects = [];
        refreshed.activeSkill = null;
        refreshed.activeSkillTicks = 0;
        refreshed.actionProgress = 0;
        return refreshed;
    });

    return {
        floor: 1,
        gold: new Decimal(0),
        party: healedParty,
        enemies: createEncounter(1),
        combatLog: prependCombatMessages(state.combatLog, "The party was wiped out! Resetting to Floor 1..."),
        combatEvents: [],
    };
};
