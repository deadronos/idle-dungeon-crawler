import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as entityApi from "./entity";
import * as gameStateApi from "./gameState";
import * as heroBuildsApi from "./heroBuilds";
import * as heroBuildsEquipmentApi from "./heroBuilds/equipment";
import * as progressionRulesApi from "./progressionRules";
import * as persistenceApi from "./store/persistence";
import { getExpRequirement as getDirectExpRequirement } from "./entity.combat";
import { createStarterParty as createDirectStarterParty } from "./entity.factories";
import { createEquipmentItemInstance as createDirectEquipmentItemInstance } from "./heroBuilds/equipment.instances";
import { getEquipmentOwnerId as getDirectEquipmentOwnerId } from "./heroBuilds/equipment.queries";
import { getPrestigeUpgradeCost as getDirectPrestigeUpgradeCost } from "./progressionRules.prestige";
import { deserializeGameState as deserializeDirectGameState } from "./store/persistence.serialization";
import { createGameStore as createDirectGameStore } from "./store/gameStore";

const SnapshotProbe = () => {
    const { state, actions } = gameStateApi.useGame();

    return (
        <div data-testid="snapshot">
            {state.floor}:{String(state.autoFight)}:{typeof actions.nextFloor}
        </div>
    );
};

describe("game public API barrels", () => {
    it("re-exports the expected modules through the public entrypoints", () => {
        expect(entityApi.createStarterParty).toBe(createDirectStarterParty);
        expect(entityApi.getExpRequirement).toBe(getDirectExpRequirement);
        expect(heroBuildsApi.getEquipmentOwnerId).toBe(getDirectEquipmentOwnerId);
        expect(heroBuildsEquipmentApi.createEquipmentItemInstance).toBe(createDirectEquipmentItemInstance);
        expect(progressionRulesApi.getPrestigeUpgradeCost).toBe(getDirectPrestigeUpgradeCost);
        expect(persistenceApi.deserializeGameState).toBe(deserializeDirectGameState);
        expect(gameStateApi.createGameStore).toBe(createDirectGameStore);
    });

    it("supports consuming the public game-state entrypoint from React components", () => {
        render(
            <gameStateApi.GameProvider initialState={{ party: entityApi.createStarterParty("Ayla", "Warrior") }}>
                <SnapshotProbe />
            </gameStateApi.GameProvider>,
        );

        expect(screen.getByTestId("snapshot")).toHaveTextContent("1:true:function");
    });
});
