import React, { useState, useCallback } from "react";
import { useGame } from "../game/gameState";
import { formatNumber } from "../utils/format";
import { motion, AnimatePresence } from "framer-motion";
import Decimal from "decimal.js";

interface DamageNumber {
    id: number;
    val: Decimal;
    x: number;
    y: number;
}

export const MainGameView: React.FC = () => {
    const { state, actions } = useGame();
    const hpPercent = state.enemyHpCurrent.dividedBy(state.enemyHpMax).times(100).toNumber();

    const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
    let damageNumberIdRef = React.useRef(0);

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Record coordinates relative to the enemy area
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        actions.handleAttack();

        // Spawn floating number
        const id = damageNumberIdRef.current++;
        setDamageNumbers(prev => [...prev, { id, val: state.clickDamage, x, y }]);

        // Remove after animation (1s)
        setTimeout(() => {
            setDamageNumbers(prev => prev.filter(dn => dn.id !== id));
        }, 1000);
    }, [actions, state.clickDamage]);

    return (
        <div className="game-area">
            <div className="level-indicator">Floor {state.enemyLevel}</div>

            <div className="enemy-container" onClick={handleClick}>
                <img src={state.enemyImage} alt="Enemy" className="enemy-sprite" draggable={false} onDragStart={(e) => e.preventDefault()} />

                <AnimatePresence>
                    {damageNumbers.map((dn) => (
                        <motion.div
                            key={dn.id}
                            className="floating-number"
                            initial={{ opacity: 1, y: dn.y, x: dn.x, scale: 0.5 }}
                            animate={{ opacity: 0, y: dn.y - 100, scale: 1.2 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{ color: "var(--accent-red)" }}
                        >
                            -{formatNumber(dn.val)}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="health-bar-container">
                <div
                    className="health-bar-fill"
                    style={{ width: `${Math.max(0, hpPercent)}%` }}
                />
                <div className="health-text">
                    {formatNumber(state.enemyHpCurrent)} / {formatNumber(state.enemyHpMax)}
                </div>
            </div>
        </div>
    );
};
