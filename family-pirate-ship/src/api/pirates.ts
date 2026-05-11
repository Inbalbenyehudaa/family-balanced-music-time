import { supabase } from './client';
import { mapError } from './errors';
import type { FlagColor, Pirate, PirateKind } from '../types';

interface PirateRow {
    id: string;
    family_id: string;
    slot: PirateKind;
    name: string;
    flag_color: FlagColor;
    updated_at: string;
}

const FLAG_TO_HEX: Record<FlagColor, string> = {
    red: '#E63946',
    green: '#2A9D8F',
    purple: '#7B4B94',
};

const ROLE_BY_SLOT: Record<PirateKind, string> = {
    kid: 'הקפטן הקטן',
    mom: 'אמא',
    dad: 'אבא',
};

/**
 * Translate a DB pirate row into the app-level Pirate shape the screens
 * expect. The app-level shape carries a CSS color + display "role" string
 * which aren't stored on the server — they're derived from the slot.
 */
function toPirate(r: PirateRow): Pirate {
    return {
        kind: r.slot,
        role: ROLE_BY_SLOT[r.slot],
        name: r.name,
        color: FLAG_TO_HEX[r.flag_color],
        serverId: r.id,
    };
}

export async function listPirates(familyId: string): Promise<Pirate[]> {
    const { data, error } = await supabase
        .from('pirate')
        .select('id, family_id, slot, name, flag_color, updated_at')
        .eq('family_id', familyId);
    if (error) throw mapError(error);
    const rows = data as PirateRow[];
    // Order kid → mom → dad so RTL display order is stable regardless of
    // insertion order.
    const order: Record<PirateKind, number> = { kid: 0, mom: 1, dad: 2 };
    rows.sort((a, b) => order[a.slot] - order[b.slot]);
    return rows.map(toPirate);
}

export interface PirateUpdate {
    familyId: string;
    slot: PirateKind;
    name?: string;
    flagColor?: FlagColor;
}

export async function updatePirate(u: PirateUpdate): Promise<void> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (u.name !== undefined) patch.name = u.name;
    if (u.flagColor !== undefined) patch.flag_color = u.flagColor;

    const { error } = await supabase
        .from('pirate')
        .update(patch)
        .eq('family_id', u.familyId)
        .eq('slot', u.slot);
    if (error) throw mapError(error);
}
