import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Decimal from "decimal.js";

// Game Constants
export const GAME_TICK_RATE = 10; // updates per sec
export const BASE_ENEMY_HP = new Decimal(10);
export const HP_SCALING_FACTOR = 1.15;
export const BOSS_HP_MULTIPLIER = 5;

// Types
export interface GameState {
    gold: Decimal;
    totalClicks: number;
    clickDamage: Decimal;
    dps: Decimal;

    enemyLevel: number;
    enemyHpMax: Decimal;
    enemyHpCurrent: Decimal;
    enemyImage: string;

    clickUpgradeLevel: number;
    dpsUpgradeLevel: number;
}

interface GameActions {
    handleAttack: () => void;
    buyClickUpgrade: () => void;
    buyDpsUpgrade: () => void;
    getClickUpgradeCost: () => Decimal;
    getDpsUpgradeCost: () => Decimal;
}

const INITIAL_STATE: GameState = {
    gold: new Decimal(0),
    totalClicks: 0,
    clickDamage: new Decimal(1),
    dps: new Decimal(0),

    enemyLevel: 1,
    enemyHpMax: BASE_ENEMY_HP,
    enemyHpCurrent: BASE_ENEMY_HP,
    enemyImage: "/assets/enemy_rat.png",

    clickUpgradeLevel: 0,
    dpsUpgradeLevel: 0,
};

const GameContext = createContext<{ state: GameState; actions: GameActions } | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<GameState>(() => {
        // Basic Persistence could be added here later
        return INITIAL_STATE;
    });

    const getEnemyImageForLevel = useCallback((level: number) => {
        const images = ["/assets/enemy_rat.png", "/assets/enemy_goblin.png", "/assets/enemy_skeleton.png"];
        return images[(level - 1) % images.length];
    }, []);

    const getEnemyHpForLevel = useCallback((level: number) => {
        let hp = BASE_ENEMY_HP.times(Decimal.pow(HP_SCALING_FACTOR, level - 1));
        if (level % 10 === 0) {
            hp = hp.times(BOSS_HP_MULTIPLIER);
        }
        return hp.round();
    }, []);

    const getClickUpgradeCost = useCallback(() => {
        return new Decimal(10).times(Decimal.pow(1.5, state.clickUpgradeLevel)).round();
    }, [state.clickUpgradeLevel]);

    const getDpsUpgradeCost = useCallback(() => {
        return new Decimal(50).times(Decimal.pow(1.6, state.dpsUpgradeLevel)).round();
    }, [state.dpsUpgradeLevel]);

    const awardGold = useCallback((level: number) => {
        // e.g. level 1 gives 1 gold, level 10 gives a lot more
        let reward = new Decimal(level).times(Decimal.pow(1.1, level));
        if (level % 10 === 0) reward = reward.times(5); // Boss gold
        return reward.ceil();
    }, []);

    const handleAttack = useCallback(() => {
        setState((prev) => {
            const amount = prev.clickDamage;
            const nextHp = prev.enemyHpCurrent.minus(amount);
            if (nextHp.lte(0)) {
                const reward = awardGold(prev.enemyLevel);
                const nextLevel = prev.enemyLevel + 1;
                const nextEnemyHpMax = getEnemyHpForLevel(nextLevel);
                const nextEnemyImage = getEnemyImageForLevel(nextLevel);
                return {
                    ...prev,
                    gold: prev.gold.plus(reward),
                    enemyLevel: nextLevel,
                    enemyHpMax: nextEnemyHpMax,
                    enemyHpCurrent: nextEnemyHpMax,
                    enemyImage: nextEnemyImage,
                    totalClicks: prev.totalClicks + 1,
                };
            }
            return { ...prev, enemyHpCurrent: nextHp, totalClicks: prev.totalClicks + 1 };
        });
    }, [awardGold, getEnemyHpForLevel]);

    const buyClickUpgrade = useCallback(() => {
        setState((prev) => {
            const cost = new Decimal(10).times(Decimal.pow(1.5, prev.clickUpgradeLevel)).round();
            if (prev.gold.gte(cost)) {
                return {
                    ...prev,
                    gold: prev.gold.minus(cost),
                    clickUpgradeLevel: prev.clickUpgradeLevel + 1,
                    clickDamage: prev.clickDamage.plus(new Decimal(1).times(Decimal.pow(1.2, prev.clickUpgradeLevel)).round()),
                };
            }
            return prev;
        });
    }, []);

    const buyDpsUpgrade = useCallback(() => {
        setState((prev) => {
            const cost = new Decimal(50).times(Decimal.pow(1.6, prev.dpsUpgradeLevel)).round();
            if (prev.gold.gte(cost)) {
                return {
                    ...prev,
                    gold: prev.gold.minus(cost),
                    dpsUpgradeLevel: prev.dpsUpgradeLevel + 1,
                    dps: prev.dps.plus(new Decimal(2).times(Decimal.pow(1.4, prev.dpsUpgradeLevel)).round()),
                };
            }
            return prev;
        });
    }, []);

    // Idle Loop
    useEffect(() => {
        if (state.dps.lte(0)) return;

        const interval = setInterval(() => {
            const damageTick = state.dps.dividedBy(GAME_TICK_RATE);

            setState((prev) => {
                const nextHp = prev.enemyHpCurrent.minus(damageTick);
                if (nextHp.lte(0)) {
                    const reward = awardGold(prev.enemyLevel);
                    const nextLevel = prev.enemyLevel + 1;
                    const nextEnemyHpMax = getEnemyHpForLevel(nextLevel);
                    const nextEnemyImage = getEnemyImageForLevel(nextLevel);
                    return {
                        ...prev,
                        gold: prev.gold.plus(reward),
                        enemyLevel: nextLevel,
                        enemyHpMax: nextEnemyHpMax,
                        enemyHpCurrent: nextEnemyHpMax,
                        enemyImage: nextEnemyImage,
                    };
                }
                return { ...prev, enemyHpCurrent: nextHp };
            });
        }, 1000 / GAME_TICK_RATE);

        return () => clearInterval(interval);
    }, [state.dps, awardGold, getEnemyHpForLevel]);

    return (
        <GameContext.Provider
            value={{
                state,
                actions: { handleAttack, buyClickUpgrade, buyDpsUpgrade, getClickUpgradeCost, getDpsUpgradeCost },
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
