import Decimal from "decimal.js";

import type { HeroClass } from "./entity";

export interface PartySlotUnlock {
    capacity: number;
    milestoneFloor: number;
    cost: number;
}

export const MAX_PARTY_SIZE = 5;

export const RECRUITABLE_CLASSES: HeroClass[] = ["Warrior", "Cleric", "Archer"];

export const PARTY_SLOT_UNLOCKS: PartySlotUnlock[] = [
    { capacity: 2, milestoneFloor: 3, cost: 60 },
    { capacity: 3, milestoneFloor: 10, cost: 180 },
    { capacity: 4, milestoneFloor: 20, cost: 500 },
    { capacity: 5, milestoneFloor: 35, cost: 1200 },
];

const RECRUIT_COSTS_BY_PARTY_SIZE: Record<number, number> = {
    1: 30,
    2: 90,
    3: 220,
    4: 550,
};

export const getNextPartySlotUnlock = (partyCapacity: number): PartySlotUnlock | null => {
    return PARTY_SLOT_UNLOCKS.find((unlock) => unlock.capacity === partyCapacity + 1) ?? null;
};

export const getPartySlotUnlockCost = (partyCapacity: number): Decimal | null => {
    const nextUnlock = getNextPartySlotUnlock(partyCapacity);
    return nextUnlock ? new Decimal(nextUnlock.cost) : null;
};

export const getRecruitCost = (partySize: number): Decimal => {
    return new Decimal(RECRUIT_COSTS_BY_PARTY_SIZE[partySize] ?? 0);
};

export const canUnlockPartySlot = (partyCapacity: number, highestFloorCleared: number): boolean => {
    const nextUnlock = getNextPartySlotUnlock(partyCapacity);
    return nextUnlock ? highestFloorCleared >= nextUnlock.milestoneFloor : false;
};