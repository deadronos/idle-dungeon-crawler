import React from 'react';
import { GameProvider, useGame } from './game/gameState';
import { MainGameView } from './components/MainGameView';
import { CharacterCreation } from './components/CharacterCreation';
import { formatNumber } from './utils/format';

const AppHeader: React.FC = () => {
  const { state } = useGame();

  return (
    <div className="header">
      <div className="gold-display">
        {formatNumber(state.gold)} Gold
      </div>
      <div className="dps-display">
        <span className="dps-label">Floor</span>
        <span className="dps-value">{state.floor}</span>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { state } = useGame();

  if (state.party.length === 0) {
    return <CharacterCreation />;
  }

  return (
    <div className="app-container">
      <AppHeader />
      <div className="main-content">
        <MainGameView />
      </div>
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
