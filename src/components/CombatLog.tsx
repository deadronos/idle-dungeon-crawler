import React from 'react';
import { useGame } from '../game/gameState';

export const CombatLog: React.FC = () => {
    const { state } = useGame();

    return (
        <div className="combat-log-container">
            <h3>Combat Log</h3>
            <div className="combat-log-messages">
                {state.combatLog.map((msg, i) => (
                    <div key={i} className="log-message" style={{ opacity: 1 - (i * 0.1) }}>
                        {msg}
                    </div>
                ))}
            </div>
        </div>
    );
};
