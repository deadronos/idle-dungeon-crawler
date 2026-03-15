import { describe, expect, it } from "vitest";

import {
    HERO_CLASS_ORDER,
    createBuildAwareMilestoneWinRates,
    createCurrentCombatSnapshot,
    createLegacyCombatSnapshot,
    createRecoveryAwareMilestoneWinRates,
    createRepresentativeMilestoneWinRates,
    getCombatIdentityDistribution,
} from "./balanceSnapshot";

const SHARED_ATTRIBUTES = { vit: 8, str: 6, dex: 9, int: 6, wis: 6 };

const roundValue = (value: unknown): unknown => {
    if (typeof value === "number") {
        return Number(value.toFixed(3));
    }

    if (Array.isArray(value)) {
        return value.map((entry) => roundValue(entry));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, roundValue(entry)]),
        );
    }

    return value;
};

describe("balance snapshots", () => {
    it("captures pre-refactor versus post-refactor class identity baselines", () => {
        const summary = HERO_CLASS_ORDER.map((heroClass) => ({
            heroClass,
            signatureBiasShare: getCombatIdentityDistribution(heroClass).signatureBiasShare,
            base: {
                legacy: createLegacyCombatSnapshot(heroClass),
                current: createCurrentCombatSnapshot(heroClass),
            },
            matchedAttributes: {
                legacy: createLegacyCombatSnapshot(heroClass, SHARED_ATTRIBUTES),
                current: createCurrentCombatSnapshot(heroClass, SHARED_ATTRIBUTES),
            },
        }));

        expect(roundValue(summary)).toMatchInlineSnapshot(`
          [
            {
              "base": {
                "current": {
                  "accuracyRating": 55.65,
                  "armor": 17,
                  "armorPenetration": 15,
                  "critChance": 0.064,
                  "elementalPenetration": 2.808,
                  "evasionRating": 40.69,
                  "magicDamage": 9.523,
                  "parryRating": 20.9,
                  "physicalDamage": 29.575,
                  "resistance": 0.073,
                  "tenacity": 9.29,
                },
                "legacy": {
                  "accuracyRating": 60.5,
                  "armor": 15,
                  "critChance": 0.075,
                  "evasionRating": 43,
                  "magicDamage": 11,
                  "parryRating": 18.75,
                  "physicalDamage": 25,
                  "resistance": 0.03,
                },
              },
              "heroClass": "Warrior",
              "matchedAttributes": {
                "current": {
                  "accuracyRating": 60.545,
                  "armor": 13.34,
                  "armorPenetration": 11.542,
                  "critChance": 0.076,
                  "elementalPenetration": 5.508,
                  "evasionRating": 42.88,
                  "magicDamage": 14.023,
                  "parryRating": 18.96,
                  "physicalDamage": 25.017,
                  "resistance": 0.097,
                  "tenacity": 10.56,
                },
                "legacy": {
                  "accuracyRating": 69.5,
                  "armor": 10,
                  "critChance": 0.095,
                  "evasionRating": 50,
                  "magicDamage": 17,
                  "parryRating": 12.75,
                  "physicalDamage": 19,
                  "resistance": 0.06,
                },
              },
              "signatureBiasShare": 0.278,
            },
            {
              "base": {
                "current": {
                  "accuracyRating": 61.01,
                  "armor": 6.83,
                  "armorPenetration": 4.409,
                  "critChance": 0.081,
                  "elementalPenetration": 11.786,
                  "evasionRating": 44.43,
                  "magicDamage": 26.18,
                  "parryRating": 8.3,
                  "physicalDamage": 16.335,
                  "resistance": 0.223,
                  "tenacity": 18.15,
                },
                "legacy": {
                  "accuracyRating": 64,
                  "armor": 7.5,
                  "critChance": 0.07,
                  "evasionRating": 49,
                  "magicDamage": 21,
                  "parryRating": 8,
                  "physicalDamage": 16,
                  "resistance": 0.1,
                },
              },
              "heroClass": "Cleric",
              "matchedAttributes": {
                "current": {
                  "accuracyRating": 63.145,
                  "armor": 8.94,
                  "armorPenetration": 6.222,
                  "critChance": 0.087,
                  "elementalPenetration": 10.268,
                  "evasionRating": 45.08,
                  "magicDamage": 22.422,
                  "parryRating": 10.56,
                  "physicalDamage": 18.918,
                  "resistance": 0.193,
                  "tenacity": 16.16,
                },
                "legacy": {
                  "accuracyRating": 69.5,
                  "armor": 10,
                  "critChance": 0.095,
                  "evasionRating": 50,
                  "magicDamage": 17,
                  "parryRating": 12.75,
                  "physicalDamage": 19,
                  "resistance": 0.06,
                },
              },
              "signatureBiasShare": 0.342,
            },
            {
              "base": {
                "current": {
                  "accuracyRating": 76.96,
                  "armor": 7.25,
                  "armorPenetration": 11.325,
                  "critChance": 0.134,
                  "elementalPenetration": 6.08,
                  "evasionRating": 48.41,
                  "magicDamage": 11.45,
                  "parryRating": 11.24,
                  "physicalDamage": 28.72,
                  "resistance": 0.073,
                  "tenacity": 6.04,
                },
                "legacy": {
                  "accuracyRating": 72,
                  "armor": 8,
                  "critChance": 0.11,
                  "evasionRating": 51,
                  "magicDamage": 13,
                  "parryRating": 11.75,
                  "physicalDamage": 28,
                  "resistance": 0.04,
                },
              },
              "heroClass": "Archer",
              "matchedAttributes": {
                "current": {
                  "accuracyRating": 75.945,
                  "armor": 8.94,
                  "armorPenetration": 10.022,
                  "critChance": 0.131,
                  "elementalPenetration": 7.268,
                  "evasionRating": 48.48,
                  "magicDamage": 14.323,
                  "parryRating": 12.56,
                  "physicalDamage": 26.198,
                  "resistance": 0.097,
                  "tenacity": 8.36,
                },
                "legacy": {
                  "accuracyRating": 69.5,
                  "armor": 10,
                  "critChance": 0.095,
                  "evasionRating": 50,
                  "magicDamage": 17,
                  "parryRating": 12.75,
                  "physicalDamage": 23.5,
                  "resistance": 0.06,
                },
              },
              "signatureBiasShare": 0.394,
            },
          ]
        `);
    });

    it("captures representative milestone pressure under the post-refactor runtime", () => {
        const summary = createRepresentativeMilestoneWinRates(4);

        expect(summary.floor3Solo.Warrior).toBeGreaterThanOrEqual(0.75);
        expect(summary.floor3Solo.Cleric).toBeGreaterThanOrEqual(0.75);
        expect(summary.floor3Solo.Archer).toBeGreaterThanOrEqual(0.75);
        expect(summary.floor8Duo.clericArcher).toBeGreaterThanOrEqual(summary.floor8Duo.warriorCleric);
        expect(summary.floor10Boss.duoWarriorCleric).toBeGreaterThan(summary.floor10Boss.soloWarrior);
        expect(summary.floor10Boss.duoClericArcher).toBeGreaterThan(summary.floor10Boss.soloArcher);
        expect(summary.floor20Boss.warriorClericArcher).toBeGreaterThanOrEqual(summary.floor18Gate.warriorClericArcher);
        expect(summary.floor28Gate.warriorClericClericArcher).toBeGreaterThanOrEqual(summary.floor18Gate.warriorClericArcher);
    });

    it("captures build-aware milestone pressure under baseline, expected, and curated assumptions", () => {
        const summary = createBuildAwareMilestoneWinRates(12);

        expect(summary.floor10Boss.duoWarriorCleric.expectedBuild).toBeGreaterThan(summary.floor10Boss.duoWarriorCleric.baseline);
        expect(summary.floor10Boss.duoClericArcher.curatedBuild).toBeGreaterThanOrEqual(summary.floor10Boss.duoClericArcher.expectedBuild);
        expect(summary.floor18Gate.warriorClericArcher.expectedBuild).toBeGreaterThan(summary.floor18Gate.warriorClericArcher.baseline);
        expect(summary.floor20Boss.warriorClericArcher.expectedBuild).toBeGreaterThanOrEqual(summary.floor20Boss.warriorClericArcher.baseline);
        expect(summary.floor28Gate.warriorClericClericArcher.expectedBuild).toBeGreaterThan(summary.floor28Gate.warriorClericClericArcher.baseline);

        expect(roundValue(summary)).toMatchInlineSnapshot(`
          {
            "floor10Boss": {
              "duoClericArcher": {
                "baseline": 0.333,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
              "duoWarriorCleric": {
                "baseline": 0.25,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
            },
            "floor18Gate": {
              "warriorClericArcher": {
                "baseline": 0,
                "curatedBuild": 0.75,
                "expectedBuild": 0.917,
              },
            },
            "floor20Boss": {
              "warriorClericArcher": {
                "baseline": 1,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
            },
            "floor28Gate": {
              "warriorClericClericArcher": {
                "baseline": 0,
                "curatedBuild": 0.083,
                "expectedBuild": 0.083,
              },
            },
            "floor8Duo": {
              "clericArcher": {
                "baseline": 0.667,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
              "warriorCleric": {
                "baseline": 0.5,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
            },
          }
        `);
    }, 20_000);

    it("captures recovery-aware checkpoint pressure under baseline, expected, and curated assumptions", () => {
        const summary = createRecoveryAwareMilestoneWinRates(12);

        expect(summary.floor10Boss.duoWarriorCleric.expectedBuild).toBeGreaterThan(
            summary.floor10Boss.duoWarriorCleric.baseline,
        );
        expect(summary.floor10Boss.duoClericArcher.expectedBuild).toBeGreaterThan(
            summary.floor10Boss.duoClericArcher.baseline,
        );
        expect(summary.floor18Gate.warriorClericArcher.expectedBuild).toBeGreaterThan(summary.floor18Gate.warriorClericArcher.baseline);
        expect(summary.floor20Boss.warriorClericArcher.expectedBuild).toBeGreaterThan(summary.floor20Boss.warriorClericArcher.baseline);
        expect(summary.floor28Gate.warriorClericClericArcher.expectedBuild).toBeGreaterThanOrEqual(summary.floor28Gate.warriorClericClericArcher.baseline);

        expect(roundValue(summary)).toMatchInlineSnapshot(`
          {
            "floor10Boss": {
              "duoClericArcher": {
                "baseline": 0.5,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
              "duoWarriorCleric": {
                "baseline": 0.833,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
            },
            "floor18Gate": {
              "warriorClericArcher": {
                "baseline": 0,
                "curatedBuild": 0.75,
                "expectedBuild": 0.833,
              },
            },
            "floor20Boss": {
              "warriorClericArcher": {
                "baseline": 0,
                "curatedBuild": 0.667,
                "expectedBuild": 0.667,
              },
            },
            "floor28Gate": {
              "warriorClericClericArcher": {
                "baseline": 0,
                "curatedBuild": 0,
                "expectedBuild": 0,
              },
            },
            "floor8Duo": {
              "clericArcher": {
                "baseline": 0.75,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
              "warriorCleric": {
                "baseline": 1,
                "curatedBuild": 1,
                "expectedBuild": 1,
              },
            },
          }
        `);
    }, 40_000);
});
