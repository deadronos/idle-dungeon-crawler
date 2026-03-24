import { describe, expect, it, vi } from "vitest";
import { secureRandom } from "./random";

describe("secureRandom", () => {
    it("returns a number between 0 and 1", () => {
        for (let i = 0; i < 100; i++) {
            const val = secureRandom();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });

    it("uses crypto.getRandomValues", () => {
        const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
        secureRandom();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("correctly scales Uint32 values to [0, 1)", () => {
        const mockValues = new Uint32Array([0, 0xffffffff]);
        let callCount = 0;
        vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((arr) => {
            (arr as Uint32Array)[0] = mockValues[callCount++];
            return arr;
        });

        const first = secureRandom();
        expect(first).toBe(0);

        const second = secureRandom();
        expect(second).toBe(0xffffffff / (0xffffffff + 1));
        expect(second).toBeLessThan(1);

        vi.restoreAllMocks();
    });

    it("throws an error when crypto.getRandomValues is not available", () => {
        vi.stubGlobal("crypto", {});

        expect(() => secureRandom()).toThrow("Secure random not available in this environment");

        vi.unstubAllGlobals();
    });
});
