// Legacy v2 helper re-exported from lib/balance.ts so existing screens keep working.
export { computeTier } from './lib/balance';

export function hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r},${g},${b}`;
}

export function blendColor(hex: string, opacity: number): string {
    const a = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0');
    return `linear-gradient(0deg, ${hex}${a}, ${hex}${a}), var(--wood-light)`;
}

const CSS_VAR_TO_HEX: Record<string, string> = {
    'var(--flag-kid)': '#E63946',
    'var(--flag-mom)': '#2A9D8F',
    'var(--flag-dad)': '#7B4B94',
};

export function realColor(c: string): string {
    if (typeof c === 'string' && c.startsWith('var(')) {
        return CSS_VAR_TO_HEX[c] || c;
    }
    return c;
}
