import { bench, describe } from "vitest";
import { createStarterParty, createRecruitHero } from "./entity";
import { createLegacyEquipmentProgression } from "./equipmentProgression";
import { getEquipItemState, getUnequipItemState } from "./progressionRules.equipment";
import { createInitialGameState } from "./engine/encounter";

describe("Progression Rules Performance", () => {
    const party = createStarterParty("Ayla", "Warrior");
    party.push(createRecruitHero("Cleric", party));
    party.push(createRecruitHero("Archer", party));
    party.push(createRecruitHero("Warrior", party));
    party.push(createRecruitHero("Cleric", party)); // Max party size is 5

    const equipmentProgression = createLegacyEquipmentProgression(["sunlit-censer", "rugged-leather-armor"], {});
    const state = createInitialGameState({
        party,
        equipmentProgression,
    });

    const heroId = "hero_1";
    const itemId = equipmentProgression.inventoryItems[0].instanceId;

    bench("getEquipItemState", () => {
        getEquipItemState(state, heroId, itemId);
    });

    bench("getUnequipItemState", () => {
        getUnequipItemState(state, heroId, "weapon");
    });
});
