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
});
