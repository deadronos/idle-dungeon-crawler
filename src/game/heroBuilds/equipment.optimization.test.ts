import { describe, expect, it, beforeEach } from "vitest";
import { getSlotLockedReason, __resetEquipmentMemoizationCaches } from "./equipment.queries";
import { createEquipmentItemInstance, resolveEquipmentItem, __resetResolveEquipmentItemCache } from "./equipment.instances";
import type { EquipmentProgressionState } from "../store/types";

describe("getSlotLockedReason optimization", () => {
    beforeEach(() => {
        __resetEquipmentMemoizationCaches();
        __resetResolveEquipmentItemCache();
    });

    it("returns null when item is not equipped", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;
        const resolved = resolveEquipmentItem(item)!;
        const hero = { id: "hero1", class: "Warrior", isEnemy: false } as unknown as import("../entity.types").Entity;
        const state: EquipmentProgressionState = {
            inventoryItems: [item],
            equippedItemInstanceIdsByHeroId: {},
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        expect(getSlotLockedReason(hero, resolved, state)).toBeNull();
        expect(getSlotLockedReason(hero, resolved, state, null)).toBeNull();
    });

    it("returns locked reason when item is equipped by another hero", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;
        const resolved = resolveEquipmentItem(item)!;
        const hero1 = { id: "hero1", class: "Warrior", isEnemy: false } as unknown as import("../entity.types").Entity;
        const state: EquipmentProgressionState = {
            inventoryItems: [item],
            equippedItemInstanceIdsByHeroId: {
                "hero2": ["item1"]
            },
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        expect(getSlotLockedReason(hero1, resolved, state)).toBe("Equipped by another hero.");
        // Test with provided ownerId
        expect(getSlotLockedReason(hero1, resolved, state, "hero2")).toBe("Equipped by another hero.");
    });

    it("returns null when item is equipped by the same hero", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;
        const resolved = resolveEquipmentItem(item)!;
        const hero1 = { id: "hero1", class: "Warrior", isEnemy: false } as unknown as import("../entity.types").Entity;
        const state: EquipmentProgressionState = {
            inventoryItems: [item],
            equippedItemInstanceIdsByHeroId: {
                "hero1": ["item1"]
            },
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        expect(getSlotLockedReason(hero1, resolved, state)).toBeNull();
        expect(getSlotLockedReason(hero1, resolved, state, "hero1")).toBeNull();
    });

    it("still checks class eligibility", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!; // Warrior only
        const resolved = resolveEquipmentItem(item)!;
        const hero = { id: "hero1", class: "Cleric", isEnemy: false } as unknown as import("../entity.types").Entity;
        const state: EquipmentProgressionState = {
            inventoryItems: [item],
            equippedItemInstanceIdsByHeroId: {},
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        expect(getSlotLockedReason(hero, resolved, state)).toBe("Cleric cannot equip Greatblade of Embers.");
        expect(getSlotLockedReason(hero, resolved, state, null)).toBe("Cleric cannot equip Greatblade of Embers.");
    });
});
