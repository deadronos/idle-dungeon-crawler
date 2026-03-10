import React from 'react';
import { GameProvider, useGame } from './game/gameState';
import { MainGameView } from './components/MainGameView';
import { CharacterCreation } from './components/CharacterCreation';
import { formatNumber } from './utils/format';

const AppHeader: React.FC = () => {
  const { state } = useGame();

  return (
    <header className="h-auto min-h-[90px] flex items-center justify-between px-6 lg:px-12 py-4 bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-700/50 shadow-lg z-10 backdrop-blur-md flex-wrap gap-4">
      <div className="flex items-center gap-3 text-2xl lg:text-3xl font-extrabold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
        {formatNumber(state.gold)} Gold
      </div>
      <div className="flex flex-col items-end">
        <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Floor</span>
        <span className="text-xl font-bold text-slate-50">{state.floor}</span>
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  const { state } = useGame();

  if (state.party.length === 0) {
    return <CharacterCreation />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-50 overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
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
