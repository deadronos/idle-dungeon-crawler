import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { createStarterParty } from "@/game/entity";
import { createInitialGameState } from "@/game/engine/simulation";
import { createLegacyEquipmentProgression } from "@/game/equipmentProgression";

import {
    getEquipItemState,
    getPartySlotUnlockState,
    getPrestigeUpgradePurchaseState,
    getRetirementHeroSoulReward,
} from "./progressionRules";

describe("progressionRules", () => {
    it("calculates retirement hero souls from hero level milestones", () => {
        expect(getRetirementHeroSoulReward(4)).toBe(0);
        expect(getRetirementHeroSoulReward(5)).toBe(10);
        expect(getRetirementHeroSoulReward(14)).toBe(20);
    });

    it("returns the next party-slot unlock transition when the milestone is met", () => {
        const state = createInitialGameState({
            gold: new Decimal(100),
            highestFloorCleared: 3,
            partyCapacity: 1,
        });

        const nextState = getPartySlotUnlockState(state);

        expect(nextState).not.toBeNull();
        expect(nextState?.partyCapacity).toBe(2);
        expect(nextState?.gold?.toString()).toBe("40");
        expect(nextState?.combatLog?.[0]).toMatch(/party capacity expanded to 2/i);
    });

    it("spends hero souls and recalculates the party for prestige upgrades", () => {
        const state = createInitialGameState({
            heroSouls: new Decimal(20),
            party: createStarterParty("Ayla", "Warrior"),
        });

        const nextState = getPrestigeUpgradePurchaseState(state, "hpMultiplier");

        expect(nextState).not.toBeNull();
        expect(nextState?.heroSouls?.toString()).toBe("5");
        expect(nextState?.prestigeUpgrades).toEqual({
            ...state.prestigeUpgrades,
            hpMultiplier: 1,
        });
        expect(nextState?.party?.[0]?.maxHp.gt(state.party[0]?.maxHp ?? 0)).toBe(true);
        expect(nextState?.combatLog?.[0]).toMatch(/purchased vitality/i);
    });

    it("equips stash gear through a pure transition that recalculates hero stats", () => {
        const state = createInitialGameState({
            party: createStarterParty("Ayla", "Cleric"),
            equipmentProgression: createLegacyEquipmentProgression(["sunlit-censer"], {}),
        });

        const nextState = getEquipItemState(state, "hero_1", "sunlit-censer");

        expect(nextState).not.toBeNull();
        expect(nextState?.equipmentProgression?.equippedItemInstanceIdsByHeroId.hero_1).toHaveLength(1);
        expect(nextState?.party?.[0]?.magicDamage.gt(state.party[0]?.magicDamage ?? 0)).toBe(true);
        expect(nextState?.combatLog?.[0]).toMatch(/equipped/i);
    });
});
