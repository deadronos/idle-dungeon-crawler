import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  ATB_CONFIG,
  HIT_CHANCE_CONFIG,
  PARRY_CONFIG,
  PENETRATION_CONFIG,
  TENACITY_CONFIG,
  CRIT_CONFIG,
  RESISTANCE_CONFIG,
  DERIVED_STAT_MULTIPLIERS,
  RATING_ATTRIBUTE_MULTIPLIERS,
  clampChance,
  calculateBaseCritChance,
  calculateCritDamage,
  calculateResistance,
  calculatePhysicalHitChance,
  calculateSpellHitChance,
  calculateParryChance,
  calculatePenetrationReduction,
  calculateTenacityReduction,
  applyPhysicalMitigation,
  applyElementalMitigation,
  calculateEffectiveCritMultiplier,
  calculateActionProgressPerTick,
} from "./combatFormulas";

describe("Combat Formulas", () => {
  describe("ATB Configuration", () => {
    it("should have valid ATB constants", () => {
      expect(ATB_CONFIG.BASE_RATE).toBe(2);
      expect(ATB_CONFIG.HASTE_RATE).toBe(0.08);
      expect(ATB_CONFIG.SLOW_MIN_MULTIPLIER).toBe(0.1);
      expect(ATB_CONFIG.BASE_RATE).toBeGreaterThan(0);
      expect(ATB_CONFIG.HASTE_RATE).toBeGreaterThan(0);
    });

    it("should have valid hit chance configuration", () => {
      expect(HIT_CHANCE_CONFIG.PHYSICAL.MIN).toBe(0.72);
      expect(HIT_CHANCE_CONFIG.PHYSICAL.MAX).toBe(0.97);
      expect(HIT_CHANCE_CONFIG.SPELL.MIN).toBe(0.74);
      expect(HIT_CHANCE_CONFIG.SPELL.MAX).toBe(0.96);
      expect(HIT_CHANCE_CONFIG.PHYSICAL.MIN).toBeLessThan(HIT_CHANCE_CONFIG.PHYSICAL.MAX);
      expect(HIT_CHANCE_CONFIG.SPELL.MIN).toBeLessThan(HIT_CHANCE_CONFIG.SPELL.MAX);
    });

    it("should have valid parry configuration", () => {
      expect(PARRY_CONFIG.MAX_CHANCE).toBe(0.25);
      expect(PARRY_CONFIG.BASE_CHANCE).toBe(0.04);
      expect(PARRY_CONFIG.MAX_CHANCE).toBeGreaterThan(PARRY_CONFIG.BASE_CHANCE);
    });

    it("should have valid penetration configuration", () => {
      expect(PENETRATION_CONFIG.MAX_REDUCTION).toBe(0.6);
      expect(PENETRATION_CONFIG.SOFTCAP).toBe(60);
      expect(PENETRATION_CONFIG.MAX_REDUCTION).toBeGreaterThan(0);
      expect(PENETRATION_CONFIG.MAX_REDUCTION).toBeLessThanOrEqual(1);
    });

    it("should have valid tenacity configuration", () => {
      expect(TENACITY_CONFIG.MAX_REDUCTION).toBe(0.6);
      expect(TENACITY_CONFIG.SOFTCAP).toBe(80);
      expect(TENACITY_CONFIG.MAX_REDUCTION).toBeGreaterThan(0);
      expect(TENACITY_CONFIG.MAX_REDUCTION).toBeLessThanOrEqual(1);
    });
  });

  describe("Critical Hit Calculations", () => {
    it("should calculate base crit chance within bounds", () => {
      expect(calculateBaseCritChance(0)).toBe(CRIT_CONFIG.BASE_CHANCE);
      expect(calculateBaseCritChance(100)).toBeCloseTo(CRIT_CONFIG.BASE_CHANCE + 100 * CRIT_CONFIG.CHANCE_PER_RATING);
      // Negative crit ratings result in 0% chance (floor at 0)
      expect(calculateBaseCritChance(-100)).toBe(0);
    });

    it("should calculate crit damage with max bonus cap", () => {
      expect(calculateCritDamage(1.5, 0)).toBe(1.5);
      expect(calculateCritDamage(1.5, 100)).toBe(1.5 + CRIT_CONFIG.MAX_BONUS_MULTIPLIER);
      expect(calculateCritDamage(1.5, 1000)).toBe(1.5 + CRIT_CONFIG.MAX_BONUS_MULTIPLIER);
    });

    it("should have valid crit configuration constants", () => {
      expect(CRIT_CONFIG.BASE_CHANCE).toBe(0.05);
      expect(CRIT_CONFIG.CHANCE_PER_RATING).toBe(0.0055);
      expect(CRIT_CONFIG.MAX_CHANCE).toBe(1.0);
      expect(CRIT_CONFIG.BASE_DAMAGE_MULTIPLIER).toBe(1.5);
      expect(CRIT_CONFIG.MAX_BONUS_MULTIPLIER).toBe(0.2);
      expect(CRIT_CONFIG.BONUS_PER_RATING).toBe(0.01);
    });
  });

  describe("Resistance Calculations", () => {
    it("should calculate resistance within max bounds", () => {
      expect(calculateResistance(0)).toBe(RESISTANCE_CONFIG.BASE);
      expect(calculateResistance(100)).toBe(RESISTANCE_CONFIG.MAX);
      expect(calculateResistance(1000)).toBe(RESISTANCE_CONFIG.MAX);
    });

    it("should have positive base resistance", () => {
      expect(RESISTANCE_CONFIG.BASE).toBeGreaterThan(0);
      expect(RESISTANCE_CONFIG.BASE).toBe(0.02);
    });
  });

  describe("Hit Chance Calculations", () => {
    it("should clamp physical hit chance to minimum", () => {
      const chance = calculatePhysicalHitChance(0, 1000);
      expect(chance).toBe(HIT_CHANCE_CONFIG.PHYSICAL.MIN);
    });

    it("should clamp physical hit chance to maximum", () => {
      const chance = calculatePhysicalHitChance(1000, 0);
      expect(chance).toBe(HIT_CHANCE_CONFIG.PHYSICAL.MAX);
    });

    it("should calculate physical hit chance within bounds", () => {
      const chance = calculatePhysicalHitChance(100, 100);
      expect(chance).toBeGreaterThanOrEqual(HIT_CHANCE_CONFIG.PHYSICAL.MIN);
      expect(chance).toBeLessThanOrEqual(HIT_CHANCE_CONFIG.PHYSICAL.MAX);
    });

    it("should clamp spell hit chance to minimum", () => {
      const chance = calculateSpellHitChance(0, 1000, 10, 50);
      expect(chance).toBe(HIT_CHANCE_CONFIG.SPELL.MIN);
    });

    it("should clamp spell hit chance to maximum", () => {
      const chance = calculateSpellHitChance(1000, 0, 50, 10);
      expect(chance).toBe(HIT_CHANCE_CONFIG.SPELL.MAX);
    });
  });

  describe("Parry Calculations", () => {
    it("should clamp parry chance to maximum", () => {
      const chance = calculateParryChance(1000, 0);
      expect(chance).toBe(PARRY_CONFIG.MAX_CHANCE);
    });

    it("should not go below 0 parry chance", () => {
      const chance = calculateParryChance(0, 1000);
      expect(chance).toBe(0);
    });

    it("should return base chance with equal ratings", () => {
      const chance = calculateParryChance(0, 0);
      expect(chance).toBe(PARRY_CONFIG.BASE_CHANCE);
    });
  });

  describe("Penetration Calculations", () => {
    it("should return 0 for zero or negative penetration", () => {
      expect(calculatePenetrationReduction(0)).toBe(0);
      expect(calculatePenetrationReduction(-10)).toBe(0);
      expect(calculatePenetrationReduction(-100)).toBe(0);
    });

    it("should calculate positive penetration reduction", () => {
      const reduction = calculatePenetrationReduction(60);
      expect(reduction).toBeGreaterThan(0);
      expect(reduction).toBeLessThanOrEqual(PENETRATION_CONFIG.MAX_REDUCTION);
    });

    it("should cap at maximum reduction", () => {
      const reduction = calculatePenetrationReduction(10000);
      expect(reduction).toBe(PENETRATION_CONFIG.MAX_REDUCTION);
    });

    it("should follow diminishing returns formula", () => {
      const low = calculatePenetrationReduction(30);
      const medium = calculatePenetrationReduction(60);
      const high = calculatePenetrationReduction(120);
      
      // Diminishing returns: doubling penetration doesn't double reduction
      expect(medium).toBeGreaterThan(low);
      expect(high).toBeGreaterThan(medium);
      // But the increase should slow down
      expect(medium - low).toBeGreaterThan(high - medium);
    });
  });

  describe("Tenacity Calculations", () => {
    it("should return 0 for zero or negative tenacity", () => {
      expect(calculateTenacityReduction(0)).toBe(0);
      expect(calculateTenacityReduction(-10)).toBe(0);
    });

    it("should cap at maximum reduction", () => {
      const reduction = calculateTenacityReduction(10000);
      expect(reduction).toBe(TENACITY_CONFIG.MAX_REDUCTION);
    });

    it("should calculate positive tenacity reduction", () => {
      const reduction = calculateTenacityReduction(80);
      expect(reduction).toBeGreaterThan(0);
      expect(reduction).toBeLessThanOrEqual(TENACITY_CONFIG.MAX_REDUCTION);
    });
  });

  describe("Physical Mitigation", () => {
    it("should always return at least 1 damage", () => {
      const result = applyPhysicalMitigation(new Decimal(10), new Decimal(10000), 0);
      expect(result.toNumber()).toBeGreaterThanOrEqual(1);
    });

    it("should reduce damage with armor", () => {
      const raw = new Decimal(100);
      const withArmor = applyPhysicalMitigation(raw, new Decimal(100), 0);
      const withoutArmor = applyPhysicalMitigation(raw, new Decimal(0), 0);
      expect(withArmor.toNumber()).toBeLessThan(withoutArmor.toNumber());
    });

    it("should increase damage with penetration", () => {
      const raw = new Decimal(100);
      const withPen = applyPhysicalMitigation(raw, new Decimal(100), 50);
      const withoutPen = applyPhysicalMitigation(raw, new Decimal(100), 0);
      expect(withPen.toNumber()).toBeGreaterThan(withoutPen.toNumber());
    });
  });

  describe("Elemental Mitigation", () => {
    it("should always return at least 1 damage", () => {
      const result = applyElementalMitigation(new Decimal(10), 0.75, 0);
      expect(result.toNumber()).toBeGreaterThanOrEqual(1);
    });

    it("should reduce damage with resistance", () => {
      const raw = new Decimal(100);
      const withResist = applyElementalMitigation(raw, 0.5, 0);
      const withoutResist = applyElementalMitigation(raw, 0, 0);
      expect(withResist.toNumber()).toBeLessThan(withoutResist.toNumber());
    });
  });

  describe("Effective Crit Multiplier", () => {
    it("should handle tenacity reduction correctly", () => {
      const noTenacity = calculateEffectiveCritMultiplier(2.0, 0);
      const withTenacity = calculateEffectiveCritMultiplier(2.0, 80);
      
      expect(noTenacity).toBe(2.0);
      expect(withTenacity).toBeLessThan(noTenacity);
      expect(withTenacity).toBeGreaterThanOrEqual(1);
    });

    it("should not go below 1x multiplier", () => {
      const result = calculateEffectiveCritMultiplier(1.0, 0);
      expect(result).toBe(1.0);
    });
  });

  describe("Action Progress Per Tick", () => {
    it("should calculate positive progress", () => {
      const progress = calculateActionProgressPerTick(10, 0, 0);
      expect(progress).toBeGreaterThan(0);
    });

    it("should increase with haste", () => {
      const base = calculateActionProgressPerTick(0, 0, 0);
      const withHaste = calculateActionProgressPerTick(100, 0, 0);
      expect(withHaste).toBeGreaterThan(base);
    });

    it("should increase with game speed", () => {
      const base = calculateActionProgressPerTick(10, 0, 0);
      const withSpeed = calculateActionProgressPerTick(10, 5, 0);
      expect(withSpeed).toBeGreaterThan(base);
    });

    it("should decrease with slow status", () => {
      const base = calculateActionProgressPerTick(10, 0, 0);
      const withSlow = calculateActionProgressPerTick(10, 0, 0.5);
      expect(withSlow).toBeLessThan(base);
    });

    it("should respect minimum multiplier from slow", () => {
      const result = calculateActionProgressPerTick(10, 0, 10);
      const expectedMin = (ATB_CONFIG.BASE_RATE + 10 * ATB_CONFIG.HASTE_RATE) * ATB_CONFIG.SLOW_MIN_MULTIPLIER;
      expect(result).toBeGreaterThanOrEqual(expectedMin * 0.99); // Allow small floating point variance
    });
  });

  describe("Clamp Function", () => {
    it("should clamp to minimum", () => {
      expect(clampChance(0, 1, -0.5)).toBe(0);
    });

    it("should clamp to maximum", () => {
      expect(clampChance(0, 1, 1.5)).toBe(1);
    });

    it("should return value within range", () => {
      expect(clampChance(0, 1, 0.5)).toBe(0.5);
    });
  });

  describe("Derived Stat Multipliers", () => {
    it("should have positive multipliers", () => {
      Object.entries(DERIVED_STAT_MULTIPLIERS).forEach(([key, value]) => {
        expect(value, `${key} should be positive`).toBeGreaterThan(0);
      });
    });
  });

  describe("Rating Attribute Multipliers", () => {
    it("should have valid multiplier structures", () => {
      Object.entries(RATING_ATTRIBUTE_MULTIPLIERS).forEach(([rating, attrs]) => {
        Object.entries(attrs).forEach(([attr, value]) => {
          expect(value, `${rating}.${attr} should be positive`).toBeGreaterThan(0);
        });
      });
    });
  });
});
