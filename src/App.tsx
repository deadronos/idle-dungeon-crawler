import React, { useEffect, useRef, useState } from 'react';
import { Menu, Shield, Swords, Users, X } from 'lucide-react';
import { GameProvider } from './game/gameState';
import { useGameStore } from './game/store/gameStore';
import { MainGameView } from './components/MainGameView';
import { CharacterCreation } from './components/CharacterCreation';
import { SaveControls } from './components/SaveControls';
import { ShopView } from './components/ShopView';
import { PartyView } from './components/PartyView';
import { Button } from './components/ui/button';
import { formatNumber } from './utils/format';

const AppHeader: React.FC = () => {
  const gold = useGameStore((state) => state.gold);
  const floor = useGameStore((state) => state.floor);
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 1023px)').matches;
    }
    return false;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return () => {};
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsNarrow(e.matches);
      if (!e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="h-auto min-h-[90px] flex items-center justify-between px-6 lg:px-12 py-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-b border-slate-700/50 shadow-lg z-10 relative">
      <div className="flex items-center gap-3 text-2xl lg:text-3xl font-extrabold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
        {formatNumber(gold)} Gold
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Floor</span>
          <span className="text-xl font-bold text-slate-50">{floor}</span>
        </div>
        {isNarrow ? (
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              variant="nav"
              size="icon"
              aria-label={menuOpen ? 'Close save menu' : 'Open save menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl p-3">
                <SaveControls />
              </div>
            )}
          </div>
        ) : (
          <SaveControls />
        )}
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  const hasParty = useGameStore((state) => state.party.length > 0);
  const activeSection = useGameStore((state) => state.activeSection);
  const setActiveSection = useGameStore((state) => state.setActiveSection);

  if (!hasParty) {
    return (
      <div className="relative">
        <div className="absolute right-4 top-4 z-10">
          <SaveControls />
        </div>
        <CharacterCreation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-50 overflow-hidden">
      <AppHeader />
      <div className="flex items-center gap-2 px-4 lg:px-8 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <Button
          variant="nav"
          onClick={() => setActiveSection('dungeon')}
          aria-pressed={activeSection === 'dungeon'}
        >
          <Swords className="size-4" />
          Dungeon
        </Button>
        <Button
          variant="nav"
          onClick={() => setActiveSection('shop')}
          aria-pressed={activeSection === 'shop'}
        >
          <Shield className="size-4" />
          Upgrade Shop
        </Button>
        <Button
          variant="nav"
          onClick={() => setActiveSection('party')}
          aria-pressed={activeSection === 'party'}
        >
          <Users className="size-4" />
          Party
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {activeSection === 'dungeon' && <MainGameView />}
        {activeSection === 'shop' && <ShopView />}
        {activeSection === 'party' && <PartyView />}
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
