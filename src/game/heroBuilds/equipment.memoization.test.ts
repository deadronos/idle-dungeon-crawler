import { describe, expect, it, beforeEach, vi } from "vitest";

import type { EquipmentProgressionState } from "../store/types";
import { getInventoryItems, getEquipmentInstance, __resetEquipmentMemoizationCaches } from "./equipment.queries";
import { createEquipmentItemInstance, resolveEquipmentItem, __resetResolveEquipmentItemCache } from "./equipment.instances";
import * as catalog from "./equipment.catalog";

describe("equipment memoization", () => {
    beforeEach(() => {
        __resetEquipmentMemoizationCaches();
        __resetResolveEquipmentItemCache();
    });

    it("memoizes getInventoryItems based on inventoryItems array reference", () => {
        const item1 = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;
        const items = [item1];
        const state: EquipmentProgressionState = {
            inventoryItems: items,
            equippedItemInstanceIdsByHeroId: {},
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        const result1 = getInventoryItems(state);
        const result2 = getInventoryItems(state);

        expect(result1).toBe(result2); // Should be same reference

        // Change the array reference
        const state2 = { ...state, inventoryItems: [...items] };
        const result3 = getInventoryItems(state2);

        expect(result3).not.toBe(result1); // Should be different reference
        expect(result3).toEqual(result1); // But same content
    });

    it("memoizes resolveEquipmentItem based on item instance reference", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;

        const spy = vi.spyOn(catalog, "resolveEquipmentItemEffects");

        const result1 = resolveEquipmentItem(item);
        const result2 = resolveEquipmentItem(item);

        expect(result1).toBe(result2);
        // resolveEquipmentItemEffects should only be called once because of memoization
        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });

    it("memoizes getEquipmentInstance based on inventoryItems array reference", () => {
        const item = createEquipmentItemInstance("greatblade-of-embers", { instanceId: "item1" })!;
        const items = [item];

        const state: EquipmentProgressionState = {
            inventoryItems: items,
            equippedItemInstanceIdsByHeroId: {},
            highestUnlockedEquipmentTier: 1,
            inventoryCapacityLevel: 0,
            inventoryCapacity: 10,
            nextInstanceSequence: 2,
        };

        const result1 = getEquipmentInstance(item.instanceId, state);
        const result2 = getEquipmentInstance(item.instanceId, state);

        expect(result1).toBe(result2);

        // Changing the array reference should force a cache miss and re-populate the map
        const state2 = { ...state, inventoryItems: [...items] };
        const result3 = getEquipmentInstance(item.instanceId, state2);

        expect(result3).toBe(result1); // same underlying item reference
    });
});
