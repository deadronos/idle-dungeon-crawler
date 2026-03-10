import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Decimal from "decimal.js";
import { BASE_META_UPGRADES, createEnemy, getExpRequirement, recalculateEntity } from "./entity";
import type { Entity, MetaUpgrades } from "./entity";
import { getFortificationUpgradeCost, getTrainingUpgradeCost } from "./upgrades";

// Game Constants
export const GAME_TICK_RATE = 20; // 20 updates per sec for smooth ATB bars
export const ATB_RATE = 2; // How much action progress per tick

export interface GameState {
    party: Entity[];
    enemies: Entity[];
    gold: Decimal;
    floor: number;
    autoProgress: boolean;
    combatLog: string[];
    metaUpgrades: MetaUpgrades;
}

interface GameActions {
    toggleAutoProgress: () => void;
    nextFloor: () => void;
    addMessage: (msg: string) => void;
    initializeParty: (party: Entity[]) => void;
    getTrainingUpgradeCost: () => Decimal;
    buyTrainingUpgrade: () => void;
    getFortificationUpgradeCost: () => Decimal;
    buyFortificationUpgrade: () => void;
}

const INITIAL_STATE: GameState = {
    party: [], // We'll add the first hero after character creation
    enemies: [],
    gold: new Decimal(0),
    floor: 1,
    autoProgress: true,
    combatLog: [],
    metaUpgrades: BASE_META_UPGRADES,
};

const cloneEntity = (entity: Entity): Entity => ({
    ...entity,
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
    resistances: { ...entity.resistances },
});

const recalculateParty = (party: Entity[], upgrades: MetaUpgrades): Entity[] => {
    return party.map((hero) => recalculateEntity(cloneEntity(hero), upgrades));
};

const createInitialState = (overrides?: Partial<GameState>): GameState => ({
    party: overrides?.party ?? INITIAL_STATE.party,
    enemies: overrides?.enemies ?? INITIAL_STATE.enemies,
    gold: new Decimal(overrides?.gold ?? INITIAL_STATE.gold),
    floor: overrides?.floor ?? INITIAL_STATE.floor,
    autoProgress: overrides?.autoProgress ?? INITIAL_STATE.autoProgress,
    combatLog: overrides?.combatLog ?? INITIAL_STATE.combatLog,
    metaUpgrades: { ...BASE_META_UPGRADES, ...overrides?.metaUpgrades },
});

const GameContext = createContext<{ state: GameState; actions: GameActions } | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode; initialState?: Partial<GameState> }> = ({ children, initialState }) => {
    const [state, setState] = useState<GameState>(() => {
        return createInitialState(initialState);
    });

    const initializeParty = useCallback((party: Entity[]) => {
        const firstEnemy = createEnemy(1, "enemy_1");
        setState((prev) => ({
            ...prev,
            party: recalculateParty(party, prev.metaUpgrades),
            enemies: [firstEnemy],
            combatLog: [`${party[0]?.name ?? "The party"} leads the party into the dungeon...`]
        }));
    }, []);

    const addMessage = useCallback((msg: string) => {
        setState((prev) => ({
            ...prev,
            combatLog: [msg, ...prev.combatLog].slice(0, 10), // Keep last 10
        }));
    }, []);

    const toggleAutoProgress = useCallback(() => {
        setState((prev) => ({ ...prev, autoProgress: !prev.autoProgress }));
    }, []);

    const getTrainingCost = useCallback((level: number) => getTrainingUpgradeCost(level), []);
    const getFortificationCost = useCallback((level: number) => getFortificationUpgradeCost(level), []);

    const buyTrainingUpgrade = useCallback(() => {
        setState((prev) => {
            const cost = getTrainingCost(prev.metaUpgrades.training);
            if (prev.gold.lt(cost)) {
                return prev;
            }

            const nextUpgrades = { ...prev.metaUpgrades, training: prev.metaUpgrades.training + 1 };

            return {
                ...prev,
                gold: prev.gold.minus(cost),
                metaUpgrades: nextUpgrades,
                party: recalculateParty(prev.party, nextUpgrades),
                combatLog: [`Battle Drills improved to Lv ${nextUpgrades.training}.`, ...prev.combatLog].slice(0, 10),
            };
        });
    }, [getTrainingCost]);

    const buyFortificationUpgrade = useCallback(() => {
        setState((prev) => {
            const cost = getFortificationCost(prev.metaUpgrades.fortification);
            if (prev.gold.lt(cost)) {
                return prev;
            }

            const nextUpgrades = { ...prev.metaUpgrades, fortification: prev.metaUpgrades.fortification + 1 };

            return {
                ...prev,
                gold: prev.gold.minus(cost),
                metaUpgrades: nextUpgrades,
                party: recalculateParty(prev.party, nextUpgrades),
                combatLog: [`Fortification improved to Lv ${nextUpgrades.fortification}.`, ...prev.combatLog].slice(0, 10),
            };
        });
    }, [getFortificationCost]);

    const nextFloor = useCallback(() => {
        setState((prev) => {
            const nextFlr = prev.floor + 1;
            // Spawn 1 to 3 enemies based on floor
            const numEnemies = Math.min(3, Math.ceil(Math.random() * (nextFlr / 5)) || 1);
            const newEnemies = Array.from({ length: numEnemies }).map((_, i) => createEnemy(nextFlr, `enemy_${nextFlr}_${i}`));

            return {
                ...prev,
                floor: nextFlr,
                enemies: newEnemies,
                combatLog: [`Moved to floor ${nextFlr}...`, ...prev.combatLog].slice(0, 10),
            };
        });
    }, []);

    const handlePartyWipe = useCallback(() => {
        setState((prev) => {
            // Restore party HP/Resources, reset to floor 1
            const healedParty = prev.party.map(hero => {
                const refreshed = recalculateEntity(cloneEntity(hero), prev.metaUpgrades);
                refreshed.currentHp = refreshed.maxHp;
                if (hero.class !== "Warrior") refreshed.currentResource = hero.maxResource;
                else refreshed.currentResource = new Decimal(0);
                return refreshed;
            });
            return {
                ...prev,
                floor: 1,
                gold: new Decimal(0),
                party: healedParty,
                enemies: [createEnemy(1, "enemy_reset")],
                combatLog: ["The party was wiped out! Resetting to Floor 1...", ...prev.combatLog].slice(0, 10),
            };
        });
    }, []);

    // The heart of the ATB Combat Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setState((prev) => {
                const draft = { ...prev, party: [...prev.party], enemies: [...prev.enemies] };

                let anyActionTaken = false;
                const logMsgs: string[] = [];

                // Helper to check if combat is over
                const livingHeroes = draft.party.filter(h => h.currentHp.gt(0));
                const livingEnemies = draft.enemies.filter(e => e.currentHp.gt(0));

                if (livingHeroes.length === 0) {
                    // Wipe
                    setTimeout(handlePartyWipe, 0); // Dispatch out of this render cycle
                    return prev;
                }

                if (livingEnemies.length === 0) {
                    // Victory
                    if (draft.autoProgress) {
                        setTimeout(nextFloor, 0);
                    }
                    return prev;
                }

                // Tick ATB for everyone
                const tickEntity = (entity: Entity, allies: Entity[], targets: Entity[]) => {
                    if (entity.currentHp.lte(0)) return; // Dead

                    entity.actionProgress += ATB_RATE + (entity.attributes.dex * 0.1); // Small speed boost from DEX

                    // Regen Mana/Cunning
                    if (entity.class === "Cleric" || entity.class === "Archer") {
                        const regen = entity.class === "Cleric" ? entity.attributes.wis * 0.5 : 2;
                        entity.currentResource = entity.currentResource.plus(regen);
                        if (entity.currentResource.gt(entity.maxResource)) entity.currentResource = entity.maxResource;
                    }

                    if (entity.actionProgress >= 100) {
                        entity.actionProgress = 0;
                        anyActionTaken = true;

                        const livingAllies = allies.filter((ally) => ally.currentHp.gt(0));

                        if (!entity.isEnemy && entity.class === "Cleric") {
                            const healCost = new Decimal(35);
                            const healTarget = livingAllies
                                .filter((ally) => ally.currentHp.lt(ally.maxHp))
                                .sort((left, right) => left.currentHp.div(left.maxHp).minus(right.currentHp.div(right.maxHp)).toNumber())[0];

                            if (healTarget && entity.currentResource.gte(healCost) && healTarget.currentHp.div(healTarget.maxHp).lt(0.65)) {
                                const healAmount = entity.magicDamage.times(1.75);
                                entity.currentResource = entity.currentResource.minus(healCost);
                                healTarget.currentHp = Decimal.min(healTarget.maxHp, healTarget.currentHp.plus(healAmount));
                                logMsgs.push(`${entity.name} casts Mend on ${healTarget.name} for ${healAmount.floor().toString()}!`);
                                return;
                            }
                        }

                        // VERY Basic combat resolve for now (can be expanded later)
                        const aliveTargets = targets.filter(t => t.currentHp.gt(0));
                        if (aliveTargets.length === 0) return;

                        // Random target
                        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];

                        let actionName = entity.class === "Cleric" ? "Smite" : "Attack";
                        let critChance = entity.critChance;
                        let dmg = entity.class === "Cleric" ? entity.magicDamage : entity.physicalDamage;

                        if (!entity.isEnemy && entity.class === "Warrior" && entity.currentResource.gte(50)) {
                            entity.currentResource = entity.currentResource.minus(50);
                            dmg = entity.physicalDamage.times(2);
                            actionName = "Rage Strike";
                        } else if (!entity.isEnemy && entity.class === "Archer" && entity.currentResource.gte(25)) {
                            entity.currentResource = entity.currentResource.minus(25);
                            dmg = entity.physicalDamage.times(1.6);
                            critChance = Math.min(1, entity.critChance + 0.25);
                            actionName = "Piercing Shot";
                        }

                        // Basic Attack calculation
                        const isCrit = Math.random() < critChance;

                        if (isCrit) dmg = dmg.times(entity.critDamage);

                        // Armor reduction (simple: subtract armor)
                        const finalDmg = Decimal.max(1, dmg.minus(target.armor));

                        target.currentHp = Decimal.max(0, target.currentHp.minus(finalDmg));

                        // Rage Gen
                        if (entity.class === "Warrior") {
                            entity.currentResource = Decimal.min(entity.maxResource, entity.currentResource.plus(10));
                        }
                        if (target.class === "Warrior" && target.currentHp.gt(0)) {
                            target.currentResource = Decimal.min(target.maxResource, target.currentResource.plus(5));
                        }

                        logMsgs.push(`${entity.name} uses ${actionName} on ${target.name} for ${finalDmg.floor().toString()}! ${isCrit ? '(CRIT)' : ''}`.trim());

                        // Handle Kill
                        if (target.currentHp.lte(0)) {
                            logMsgs.push(`${target.name} was defeated!`);
                            if (target.isEnemy) {
                                // Grant EXP to all living heroes
                                const xpReward = new Decimal(draft.floor).times(10).plus(target.attributes.vit);
                                const goldReward = new Decimal(draft.floor).times(2);
                                draft.gold = draft.gold.plus(goldReward);

                                draft.party.forEach((hero, i) => {
                                    if (hero.currentHp.lte(0)) return;
                                    draft.party[i] = { ...hero, exp: hero.exp.plus(xpReward) };

                                    // Handle Level Up
                                    let h = draft.party[i];
                                    while (h.exp.gte(h.expToNext)) {
                                        h.exp = h.exp.minus(h.expToNext);
                                        h.level += 1;
                                        h.expToNext = getExpRequirement(h.level);
                                        // Distribute stats
                                        if (h.class === "Warrior") { h.attributes.str += 2; h.attributes.vit += 2; h.attributes.dex += 1; h.attributes.int += 1; h.attributes.wis += 1; }
                                        else if (h.class === "Cleric") { h.attributes.int += 2; h.attributes.wis += 2; h.attributes.str += 1; h.attributes.vit += 1; h.attributes.dex += 1; }
                                        else if (h.class === "Archer") { h.attributes.dex += 2; h.attributes.str += 1; h.attributes.vit += 1; h.attributes.int += 1; h.attributes.wis += 1; h.attributes.dex += (Math.random() > 0.5 ? 1 : 0); }

                                        // Recalculate Stats
                                        h = recalculateEntity(h, draft.metaUpgrades);
                                        logMsgs.push(`${h.name} reached level ${h.level}!`);
                                    }
                                    draft.party[i] = h;
                                });
                            }
                        }
                    }
                };

                draft.party.forEach((h, i) => {
                    const clonedHero = cloneEntity(h);
                    draft.party[i] = clonedHero;
                    tickEntity(clonedHero, draft.party, draft.enemies);
                });

                draft.enemies.forEach((e, i) => {
                    const clonedEnemy = cloneEntity(e);
                    draft.enemies[i] = clonedEnemy;
                    tickEntity(clonedEnemy, draft.enemies, draft.party);
                });

                if (anyActionTaken) {
                    if (logMsgs.length > 0) {
                        draft.combatLog = [...logMsgs, ...draft.combatLog].slice(0, 10);
                    }
                    return draft;
                }

                // Only return draft if something changed to prevent excessive renders,
                // but since ATB ticks constantly, we do need to return draft here.
                return draft;
            });
        }, 1000 / GAME_TICK_RATE);

        return () => clearInterval(interval);
    }, [handlePartyWipe, nextFloor]);

    return (
        <GameContext.Provider
            value={{
                state,
                actions: {
                    toggleAutoProgress,
                    nextFloor,
                    addMessage,
                    initializeParty,
                    getTrainingUpgradeCost: () => getTrainingCost(state.metaUpgrades.training),
                    buyTrainingUpgrade,
                    getFortificationUpgradeCost: () => getFortificationCost(state.metaUpgrades.fortification),
                    buyFortificationUpgrade,
                },
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
};
