import React, { useState } from 'react';
import type { HeroClass } from '../game/entity';
import { createStarterParty } from '../game/entity';
import { useGameStore } from '../game/store/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CharacterCreation: React.FC = () => {
    const initializeParty = useGameStore((state) => state.initializeParty);
    const [name, setName] = useState("Hero");
    const [selectedClass, setSelectedClass] = useState<HeroClass>("Warrior");

    const handleCreate = () => {
        const party = createStarterParty(name.trim() || "Hero", selectedClass);
        initializeParty(party);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[url('/assets/dungeon_bg.png')] bg-cover bg-center shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] px-4 py-6">
            <Card className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border-slate-700 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-3xl font-black tracking-tight text-white uppercase">Create Your First Hero</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 pt-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="hero-name" className="uppercase font-bold text-slate-400 text-sm tracking-wider">Hero Name</Label>
                        <Input
                            id="hero-name"
                            className="bg-slate-950/50 border-slate-700 text-white text-lg h-12"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={16}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button
                            variant="hero-card"
                            className="h-auto flex-col items-center gap-3 p-4"
                            aria-pressed={selectedClass === 'Warrior'}
                            onClick={() => setSelectedClass('Warrior')}
                        >
                            <img src={`${import.meta.env.BASE_URL}assets/hero_warrior.png`} alt="Warrior" className="w-20 h-20 object-contain drop-shadow-md" />
                            <div className="text-center">
                                <h3 className="font-bold text-slate-50 text-lg mb-1">Warrior</h3>
                                <p className="text-slate-400 text-xs whitespace-normal lead-tight">High HP, builds Rage into crushing weapon skills.</p>
                            </div>
                        </Button>
                        <Button
                            variant="hero-card"
                            className="h-auto flex-col items-center gap-3 p-4"
                            aria-pressed={selectedClass === 'Cleric'}
                            onClick={() => setSelectedClass('Cleric')}
                        >
                            <img src={`${import.meta.env.BASE_URL}assets/hero_cleric.png`} alt="Cleric" className="w-20 h-20 object-contain drop-shadow-md" />
                            <div className="text-center">
                                <h3 className="font-bold text-slate-50 text-lg mb-1">Cleric</h3>
                                <p className="text-slate-400 text-xs whitespace-normal lead-tight">Uses Mana to smite enemies and heal injured allies.</p>
                            </div>
                        </Button>
                        <Button
                            variant="hero-card"
                            className="h-auto flex-col items-center gap-3 p-4"
                            aria-pressed={selectedClass === 'Archer'}
                            onClick={() => setSelectedClass('Archer')}
                        >
                            <img src={`${import.meta.env.BASE_URL}assets/hero_archer.png`} alt="Archer" className="w-20 h-20 object-contain drop-shadow-md" />
                            <div className="text-center">
                                <h3 className="font-bold text-slate-50 text-lg mb-1">Archer</h3>
                                <p className="text-slate-400 text-xs whitespace-normal lead-tight">Uses Cunning for precision shots and lethal crits.</p>
                            </div>
                        </Button>
                    </div>

                    <p className="text-center text-xs text-slate-400">
                        Begin with one adventurer, then expand the party in the shop as your dungeon runs grow stronger.
                    </p>

                    <Button
                        variant="cta"
                        size="lg"
                        onClick={handleCreate}
                        className="w-full text-lg h-14 mt-4"
                    >
                        Start Journey
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
