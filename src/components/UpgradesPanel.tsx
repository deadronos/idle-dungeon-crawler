import React from "react";
import { useGame } from "../game/gameState";
import { formatNumber } from "../utils/format";
import { Sword, Zap } from "lucide-react";

export const UpgradesPanel: React.FC = () => {
    const { state, actions } = useGame();

    const clickCost = actions.getClickUpgradeCost();
    const dpsCost = actions.getDpsUpgradeCost();

    const canBuyClick = state.gold.gte(clickCost);
    const canBuyDps = state.gold.gte(dpsCost);

    return (
        <div className="upgrades-panel">
            <div className="upgrades-header">Upgrades Shop</div>
            <div className="upgrades-list">

                {/* Click Damage Upgrade */}
                <div className="upgrade-card">
                    <div className="upgrade-info">
                        <div>
                            <div className="upgrade-title">Sharpen Sword</div>
                            <div className="upgrade-desc">Increases damage per click.</div>
                        </div>
                        <div className="upgrade-level">Lv {state.clickUpgradeLevel}</div>
                    </div>
                    <button
                        className="buy-button"
                        disabled={!canBuyClick}
                        onClick={actions.buyClickUpgrade}
                    >
                        <Sword size={18} />
                        <span>Upgrade ({formatNumber(clickCost)} Gold)</span>
                    </button>
                </div>

                {/* DPS Upgrade */}
                <div className="upgrade-card">
                    <div className="upgrade-info">
                        <div>
                            <div className="upgrade-title">Hire Mercenary</div>
                            <div className="upgrade-desc">Automatically attacks over time.</div>
                        </div>
                        <div className="upgrade-level">Lv {state.dpsUpgradeLevel}</div>
                    </div>
                    <button
                        className="buy-button"
                        disabled={!canBuyDps}
                        onClick={actions.buyDpsUpgrade}
                    >
                        <Zap size={18} />
                        <span>Upgrade ({formatNumber(dpsCost)} Gold)</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
