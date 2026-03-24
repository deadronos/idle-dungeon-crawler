# 003 - Code Quality and Performance Improvements

**Date:** 2026-03-24
**Status:** Accepted
**Branch:** `improvements/combat-formulas-memoization`

## Context

The codebase had accumulated several areas for improvement across code quality, performance, and maintainability. This decision record documents a comprehensive pass to address these issues.

## Changes Made

### 1. Centralized Combat Formulas

**Problem:** Combat calculations were scattered across multiple files with hard-coded magic numbers, making balance tuning difficult and prone to inconsistencies.

**Solution:** Created `src/game/engine/combatFormulas.ts` as a single source of truth for all combat formulas:
- ATB configuration constants
- Hit chance formulas with min/max bounds
- Parry, penetration, and tenacity calculations
- Critical hit chance and damage formulas
- Resistance calculations
- All derived stat multipliers
- Rating attribute multipliers

**Benefits:**
- Balance tuning now requires changes in only one location
- Formulas are self-documenting with clear naming
- Eliminated duplication between `entity.combat.ts` and `combatMath.ts`

### 2. Memoization for Combat Ratings

**Problem:** `getCombatRatings()` was being called repeatedly for the same entity states, causing unnecessary recalculation during combat simulation.

**Solution:** Implemented a `CombatRatingCache` class in `entity.combat.ts`:
- LRU-style cache with 1000 entry limit
- Cache keys based on entity ID, attributes, and build state
- Automatic cache invalidation on entity changes
- Exposed `clearCombatRatingCache()` for manual invalidation

**Benefits:**
- Reduced CPU load during idle progression
- Particularly effective for simulations with many combat ticks
- No impact on memory footprint due to size limit

### 3. UI Performance Improvements

**Problem:** Entity cards were re-rendering excessively due to:
- Calculating ratios on every render
- Passing all combat events to every card
- Expensive `getHeroBuildProfile` calls

**Solution:**
- Memoized `EntityCard` with `React.memo`
- Added `useMemo` for ratio calculations (HP, resource, XP)
- Filtered combat events per entity with memoization
- Memoized build profile calculation

**Benefits:**
- Reduced React re-render cycles
- Smoother UI updates during active combat
- Better perceived performance

### 4. Edge Case Testing

**Problem:** Combat calculations lacked comprehensive edge case coverage.

**Solution:** Added `src/game/engine/combatFormulas.test.ts` with 42 test cases covering:
- Configuration constant validation
- Boundary conditions (min/max hit chances)
- Negative values and zero handling
- Diminishing returns verification
- Physical and elemental mitigation
- Critical hit calculations

**Benefits:**
- Early detection of formula regressions
- Documentation via test cases
- Confidence in combat system correctness

### 5. Build Diversity Analysis Tool

**Problem:** No systematic way to evaluate hero build viability or identify overpowered/underpowered combinations.

**Solution:** Created `src/game/buildAnalysis.ts` with:
- 8 predefined build configurations across all classes
- Effectiveness scoring based on focus and balance
- Class-by-class summary statistics
- Rating variety analysis
- Automated recommendations for balance issues

**Usage:**
```typescript
import { analyzeBuildDiversity, compareBuilds } from "@/game/buildAnalysis";

// Full analysis
const analysis = analyzeBuildDiversity();

// Compare specific builds
const comparison = compareBuilds("Tank Warrior", "DPS Archer");
```

**Benefits:**
- Data-driven balance decisions
- Quantitative build viability metrics
- Automated detection of class imbalances

## Backward Compatibility

All changes maintain backward compatibility:
- Constants are re-exported from new locations
- Existing function signatures unchanged
- No breaking changes to save files or game state

## Testing

All 219 tests pass, including:
- 42 new combat formula tests
- 26 new build analysis tests
- All existing integration and unit tests

## Consequences

- **Easier:** Balance tuning, formula maintenance, build diversity analysis
- **Faster:** Combat simulation performance, UI render cycles
- **Safer:** Comprehensive edge case testing prevents regressions
- **No Impact:** Save compatibility, existing functionality

## Future Work

- Consider memoizing other expensive calculations (turn resolution, damage calculation)
- Extend build analysis to include equipment synergies
- Add performance benchmarks to CI pipeline
