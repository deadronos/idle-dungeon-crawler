const uint32Buffer = new Uint32Array(1);

export const secureRandom = (): number => {
    if (!globalThis.crypto?.getRandomValues) {
        throw new Error("Secure random not available in this environment");
    }

    globalThis.crypto.getRandomValues(uint32Buffer);
    return uint32Buffer[0] / 0x100000000;
};
