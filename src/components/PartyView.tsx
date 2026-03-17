import React, { useState } from "react";

import { CharacterSheet } from "@/components/party-view/CharacterSheet";
import { useGameStore } from "@/game/store/gameStore";
import { selectPartyHeroes } from "@/game/store/selectors";
import { useShallow } from "zustand/react/shallow";

export const PartyView: React.FC = () => {
    const party = useGameStore(useShallow(selectPartyHeroes));
    const [heroIndex, setHeroIndex] = useState(0);

    const clampedIndex = Math.min(heroIndex, Math.max(0, party.length - 1));
    const currentHero = party[clampedIndex];

    const handlePrev = () =>
        setHeroIndex((i) => (i - 1 + party.length) % party.length);
    const handleNext = () =>
        setHeroIndex((i) => (i + 1) % party.length);

    return (
        <div className="flex flex-1 w-full h-full bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.92)] overflow-y-auto p-4 lg:p-8">
            {party.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-slate-400 text-sm">No heroes in your party yet.</p>
                </div>
            ) : (
                <CharacterSheet
                    hero={currentHero}
                    index={clampedIndex}
                    total={party.length}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </div>
    );
};
