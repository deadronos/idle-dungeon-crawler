import React, { useState } from 'react';
import { useGame } from '../game/gameState';
import type { EntityClass } from '../game/entity';
import { createHero } from '../game/entity';

export const CharacterCreation: React.FC = () => {
    const { actions } = useGame();
    const [name, setName] = useState("Hero");
    const [selectedClass, setSelectedClass] = useState<EntityClass>("Warrior");

    const handleCreate = () => {
        const hero = createHero("hero_1", name, selectedClass);
        actions.initializeParty(hero);
    };

    return (
        <div className="character-creation-overlay">
            <div className="creation-modal">
                <h2>Create Your First Hero</h2>

                <div className="input-group">
                    <label>Hero Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={16}
                    />
                </div>

                <div className="class-selection">
                    <button
                        className={`class-btn ${selectedClass === 'Warrior' ? 'active' : ''}`}
                        onClick={() => setSelectedClass('Warrior')}
                    >
                        <img src="/assets/hero_warrior.png" alt="Warrior" className="class-preview-img" />
                        <h3>Warrior</h3>
                        <p>High HP, uses Rage for big physical damage.</p>
                    </button>
                    <button
                        className={`class-btn ${selectedClass === 'Cleric' ? 'active' : ''}`}
                        onClick={() => setSelectedClass('Cleric')}
                    >
                        <img src="/assets/hero_cleric.png" alt="Cleric" className="class-preview-img" />
                        <h3>Cleric</h3>
                        <p>High Wisdom, heals the party with Mana.</p>
                    </button>
                    <button
                        className={`class-btn ${selectedClass === 'Archer' ? 'active' : ''}`}
                        onClick={() => setSelectedClass('Archer')}
                    >
                        <img src="/assets/hero_archer.png" alt="Archer" className="class-preview-img" />
                        <h3>Archer</h3>
                        <p>High Dexterity, uses Cunning for massive crits.</p>
                    </button>
                </div>

                <button className="start-journey-btn buy-button" onClick={handleCreate}>
                    Start Journey
                </button>
            </div>
        </div>
    );
};
