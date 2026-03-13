import Decimal from 'decimal.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createEnemy, createStarterParty } from '@/game/entity';
import { GameProvider } from '@/game/gameState';

import { MainGameView } from './MainGameView';

describe('MainGameView', () => {
  it('keeps the encounter stage rendered when the active enemy has been defeated', () => {
    const defeatedEnemy = createEnemy(1, 'enemy_1');
    defeatedEnemy.currentHp = new Decimal(0);

    render(
      <GameProvider
        initialState={{
          party: createStarterParty('Ayla', 'Warrior'),
          enemies: [defeatedEnemy],
          combatLog: [`${defeatedEnemy.name} was defeated!`],
        }}
      >
        <MainGameView />
      </GameProvider>,
    );

    expect(screen.getByTestId('encounter-stage')).toBeInTheDocument();
    expect(screen.getByText(/encounter cleared/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^log$/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${defeatedEnemy.name} was defeated!`, 'i'))).toBeInTheDocument();
  });
});