import Decimal from 'decimal.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('toggles autofight and autoadvance from the run behavior controls', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider
        initialState={{
          party: createStarterParty('Ayla', 'Warrior'),
          enemies: [createEnemy(1, 'enemy_1')],
          combatLog: [],
          autoFight: false,
          autoAdvance: false,
        }}
      >
        <MainGameView />
      </GameProvider>,
    );

    const autofightToggle = screen.getByRole('button', { name: /fight automatically/i });
    const autoadvanceToggle = screen.getByRole('button', { name: /push deeper automatically/i });

    expect(autofightToggle).toHaveAttribute('aria-pressed', 'false');
    expect(autoadvanceToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/manual control enabled/i)).toBeInTheDocument();

    await user.click(autofightToggle);

    expect(autofightToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/run will stop after this floor/i)).toBeInTheDocument();

    await user.click(autoadvanceToggle);

    expect(autoadvanceToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/auto-advance enabled/i)).toBeInTheDocument();
  });

  it('shows the primary enemy archetype beneath the encounter stage art', () => {
    const casterEnemy = createEnemy(5, 'enemy_5', { archetype: 'Caster', element: 'fire' });

    render(
      <GameProvider
        initialState={{
          party: createStarterParty('Ayla', 'Warrior'),
          enemies: [casterEnemy],
          combatLog: [],
        }}
      >
        <MainGameView />
      </GameProvider>,
    );

    expect(screen.getAllByText(new RegExp(casterEnemy.name, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fire caster/i).length).toBeGreaterThan(0);
  });
});
