import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { useAuthStore } from './authStore';
import { useSyncStore } from './syncStore';

/**
 * v3 settings store. `setSettings` writes locally (optimistic) and enqueues
 * a server update via the sync queue. If no family is loaded (pre-auth),
 * the enqueue step is skipped — changes stay local-only.
 */
export interface SettingsState {
    settings: Settings;
    setSettings: (patch: Partial<Settings>) => void;
    /** Same as setSettings but without enqueueing — used by pull to hydrate. */
    hydrateSettings: (settings: Settings) => void;
    reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: { ...DEFAULT_SETTINGS },

    setSettings: (patch) => {
        const next = { ...get().settings, ...patch };
        set({ settings: next });

        const { family } = useAuthStore.getState();
        if (!family) return;
        useSyncStore
            .getState()
            .enqueue('update_settings', { familyId: family.id, patch })
            .then(() => useSyncStore.getState().flush().catch(() => {}))
            .catch((err) => console.warn('[settingsStore] enqueue failed', err));
    },

    hydrateSettings: (settings) => set({ settings }),

    reset: () => set({ settings: { ...DEFAULT_SETTINGS } }),
}));
