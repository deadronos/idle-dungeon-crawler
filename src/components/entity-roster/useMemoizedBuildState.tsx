import { useMemo } from "react";
import type { TalentProgressionState, EquipmentProgressionState } from "@/game/store/types";

interface BuildStateInput {
  talentProgression: TalentProgressionState;
  equipmentProgression: EquipmentProgressionState;
}

/**
 * Hook to memoize build state to prevent unnecessary re-renders
 * This is especially important for EntityCard components that use buildState
 */
export const useMemoizedBuildState = ({
  talentProgression,
  equipmentProgression,
}: BuildStateInput) => {
  return useMemo(
    () => ({
      talentProgression,
      equipmentProgression,
    }),
    [talentProgression, equipmentProgression]
  );
};

/**
 * Selector to create a stable reference for roster state
 * Prevents re-renders when only combat events change
 */
export const createStableRosterState = (state: {
  combatEvents: unknown[];
  talentProgression: TalentProgressionState;
  equipmentProgression: EquipmentProgressionState;
  retireHero: unknown;
}) => ({
  // Only pass the essential data, not the full state
  talentProgression: state.talentProgression,
  equipmentProgression: state.equipmentProgression,
  retireHero: state.retireHero,
});
