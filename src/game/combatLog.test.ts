import { describe, it, expect } from 'vitest';
import { prependCombatMessages } from './combatLog';

describe('combatLog', () => {
    it('enforces COMBAT_LOG_LIMIT', () => {
        const log: string[] = [];
        const messages = Array.from({ length: 100 }, (_, i) => `message ${i}`);
        const result = prependCombatMessages(log, ...messages);
        expect(result.length).toBe(50);
        // messages are prepended, so the oldest of the 100 messages (message 0) remains at the end if we were appending,
        // but since we prepend and slice, the first 50 of the combined array are kept.
        // Combined: [message 0, ..., message 99]
        // Slice 0-50: message 0...49
        expect(result[0]).toBe('message 0');
    });
});
