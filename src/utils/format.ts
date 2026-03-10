import Decimal from "decimal.js";

const SUFFIXES = [
    "", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

export const formatNumber = (value: Decimal | number | string): string => {
    const dec = new Decimal(value);
    if (dec.lt(1000)) {
        // Return whole number or up to 1 decimal place if it's small but fractional
        return dec.toNumber().toLocaleString(undefined, { maximumFractionDigits: dec.isInteger() ? 0 : 1 });
    }

    // Determine the power of 1000
    const decLog = dec.log(1000);
    const suffixIndex = Math.floor(decLog.toNumber());

    if (suffixIndex >= SUFFIXES.length) {
        return dec.toExponential(2).replace("+", "");
    }

    const shortValue = dec.dividedBy(Decimal.pow(1000, suffixIndex));
    return `${shortValue.toNumber().toFixed(2)}${SUFFIXES[suffixIndex]}`;
};
