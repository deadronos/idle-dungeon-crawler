import React from 'react';
import { GameProvider, useGame } from './game/gameState';
import { MainGameView } from './components/MainGameView';
import { UpgradesPanel } from './components/UpgradesPanel';
import { formatNumber } from './utils/format';

const AppHeader: React.FC = () => {
  const { state } = useGame();

  return (
    <div className="header">
      <div className="gold-display">
        {formatNumber(state.gold)} Gold
      </div>
      <div className="dps-display">
        <span className="dps-label">Current DPS</span>
        <span className="dps-value">{formatNumber(state.dps)}</span>
      </div>
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <div className="app-container">
        <AppHeader />
        <div className="main-content">
          <MainGameView />
          <UpgradesPanel />
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
