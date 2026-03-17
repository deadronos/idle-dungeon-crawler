const COMBAT_LOG_LIMIT = 10;

export const prependCombatMessages = (combatLog: string[], ...messages: string[]) => {
    return [...messages.filter(Boolean), ...combatLog].slice(0, COMBAT_LOG_LIMIT);
};
