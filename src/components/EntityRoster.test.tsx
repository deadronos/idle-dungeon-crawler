import Decimal from "decimal.js";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Entity } from "@/game/entity";
import { GameProvider } from "@/game/gameState";

import { EntityRoster } from "./EntityRoster";

const heroEntity: Entity = {
    id: "hero_1",
    name: "Ayla",
    class: "Cleric",
    image: "/assets/hero_cleric.png",
    isEnemy: false,
    level: 2,
    exp: new Decimal(20),
    expToNext: new Decimal(100),
    attributes: { vit: 7, str: 4, dex: 4, int: 8, wis: 10 },
    maxHp: new Decimal(120),
    currentHp: new Decimal(100),
    maxResource: new Decimal(90),
    currentResource: new Decimal(55),
    armor: new Decimal(15),
    physicalDamage: new Decimal(16),
    magicDamage: new Decimal(21),
    critChance: 0.07,
    critDamage: 1.5,
    accuracyRating: 66,
    evasionRating: 51,
    parryRating: 9,
    resistances: { fire: 0.2, water: 0.2, earth: 0.2, air: 0.2, light: 0.2, shadow: 0.2 },
    actionProgress: 25,
    activeSkill: "Casting Mend",
    activeSkillTicks: 10,
};

describe("EntityRoster", () => {
    it("shows a current cast banner near the entity portrait", () => {
        render(
            <GameProvider initialState={{ party: [heroEntity] }}>
                <EntityRoster title="Party" entities={[heroEntity]} />
            </GameProvider>,
        );

        expect(screen.getByText(/casting mend/i)).toBeInTheDocument();
    });

    it("renders floating combat events and expanded derived stat details", () => {
        render(
            <GameProvider
                initialState={{
                    party: [heroEntity],
                    combatEvents: [
                        {
                            id: "combat-event-1",
                            targetId: heroEntity.id,
                            kind: "heal",
                            text: "+21",
                            ttlTicks: 10,
                        },
                    ],
                }}
            >
                <EntityRoster title="Party" entities={[heroEntity]} />
            </GameProvider>,
        );

        expect(screen.getByText("+21")).toBeInTheDocument();
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent(/attributes/i);
        expect(tooltip).toHaveTextContent(/resistances/i);
        expect(tooltip).toHaveTextContent(/acc\s*66/i);
        expect(tooltip).toHaveTextContent(/eva\s*51/i);
        expect(tooltip).toHaveTextContent(/par\s*9/i);
        expect(tooltip).toHaveTextContent(/fire\s*20%/i);
        expect(tooltip).toHaveTextContent(/shadow\s*20%/i);
    });

    it("keeps roster cards at full height inside the scrollable panel when the list grows", () => {
        const roster = Array.from({ length: 5 }, (_, index) => ({
            ...heroEntity,
            id: `hero_${index + 1}`,
            name: `Hero ${index + 1}`,
        }));

        const { container } = render(
            <GameProvider initialState={{ party: roster }}>
                <EntityRoster title="Party" entities={roster} />
            </GameProvider>,
        );

        const scrollPanel = container.querySelector('[data-slot="card-content"]');
        expect(scrollPanel).toHaveClass("overflow-y-auto", "snap-y", "snap-proximity");

        const entityCards = scrollPanel?.querySelectorAll('[data-slot="card"]');
        expect(entityCards).toHaveLength(roster.length);
        entityCards?.forEach((card) => {
            expect(card).toHaveClass("shrink-0", "snap-start", "overflow-visible");
        });
    });
});
