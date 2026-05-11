import { ISLANDS } from '../data';

const ISLAND_ID_RENAMES: Record<string, string> = {
    'cocoa-coast': 'cocoa-beach',
    'origami-isle': 'origami-island',
    'candy-cay': 'candy-island',
    'spaghetti-strait': 'pasta-strait',
    'library-atoll': 'library-island',
};

export function migrateIslandId(id: string): string | null {
    const mapped = ISLAND_ID_RENAMES[id] ?? id;
    return ISLANDS.some((i) => i.id === mapped) ? mapped : null;
}

export function migrateIslandIds(ids: string[]): string[] {
    const out: string[] = [];
    for (const id of ids) {
        const mapped = migrateIslandId(id);
        if (mapped && !out.includes(mapped)) out.push(mapped);
    }
    return out;
}
