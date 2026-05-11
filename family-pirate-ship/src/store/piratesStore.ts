import { create } from 'zustand';
import type { Pirate } from '../types';
import { realColor } from '../utils';
import { useAuthStore } from './authStore';
import { useSyncStore } from './syncStore';

const DEFAULT_PIRATES: Pirate[] = [
    { kind: 'kid', role: 'הקפטן הקטן', name: 'קפטן ילד', color: realColor('var(--flag-kid)') },
    { kind: 'mom', role: 'אמא', name: 'אמא', color: realColor('var(--flag-mom)') },
    { kind: 'dad', role: 'אבא', name: 'אבא', color: realColor('var(--flag-dad)') },
];

export interface PiratesState {
    pirates: Pirate[];
    /**
     * Hydrate from the server — replaces the array, does NOT enqueue. Used
     * by pull + initial load.
     */
    setPirates: (p: Pirate[]) => void;
    /**
     * Diff-based edit — compares against current state and enqueues an
     * `update_pirate` write for each changed name/color. Used by the
     * Settings screen. Resolves after the writes have been persisted to
     * the IDB queue and a flush has been attempted.
     */
    savePirates: (next: Pirate[]) => Promise<void>;
    resetToDefaults: () => void;
}

export const usePiratesStore = create<PiratesState>((set, get) => ({
    pirates: DEFAULT_PIRATES.map((p) => ({ ...p })),

    setPirates: (p) => set({ pirates: p }),

    savePirates: async (next) => {
        const prev = get().pirates;
        set({ pirates: next });

        const { family } = useAuthStore.getState();
        if (!family) return;
        const sync = useSyncStore.getState();

        const prevByKind = new Map(prev.map((p) => [p.kind, p]));
        const changed = next.filter((p) => {
            const before = prevByKind.get(p.kind);
            return before && before.name !== p.name;
        });
        if (changed.length === 0) return;

        // Serial enqueue: parallel enqueues each do a read→modify→write
        // on the IDB queue, and without a lock the last writer clobbers
        // the others. Even with the queue mutex it's cleaner to keep
        // semantic order (kid→mom→dad) stable in the queue.
        try {
            for (const p of changed) {
                await sync.enqueue('update_pirate', {
                    familyId: family.id,
                    slot: p.kind,
                    name: p.name,
                });
            }
            // Flush runs after all writes are persisted. If offline, this
            // returns immediately and the worker picks up on the next
            // online/focus event.
            await sync.flush();
        } catch (err) {
            console.warn('[piratesStore] save failed', err);
        }
    },

    resetToDefaults: () => set({ pirates: DEFAULT_PIRATES.map((p) => ({ ...p })) }),
}));
