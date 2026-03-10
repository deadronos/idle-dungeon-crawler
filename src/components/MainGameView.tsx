import React from "react";
import { useGame } from "../game/gameState";
import { EntityRoster } from "./EntityRoster";
import { CombatLog } from "./CombatLog";

export const MainGameView: React.FC = () => {
    const { state, actions } = useGame();

    return (
        <div className="game-area">
            <div className="battlefield-container">
                {/* Left Side: Party */}
                <EntityRoster title="The Party" entities={state.party} />

                {/* Center: Action / Floor Info */}
                <div className="center-stage">
                    <div className="level-indicator">Floor {state.floor}</div>

                    <div className="center-controls">
                        <button
                            className={`auto-progress-btn ${state.autoProgress ? 'active' : ''}`}
                            onClick={actions.toggleAutoProgress}
                        >
                            Auto-Progress: {state.autoProgress ? "ON" : "OFF"}
                        </button>
                    </div>

                    {/* Show a representative enemy sprite */}
                    {state.enemies.length > 0 && state.enemies[0].currentHp.gt(0) && (
                        <div className="enemy-sprite-container">
                            <img src={state.enemies[0].image} alt="Enemy" className="enemy-sprite" draggable={false} />
                        </div>
                    )}

                    <CombatLog />
                </div>

                {/* Right Side: Enemies */}
                <EntityRoster title="Enemies" entities={state.enemies} alignRight={true} />
            </div>
        </div>
    );
};
