import { wipeFamilyData } from '../api/families';
import { updatePirate } from '../api/pirates';
import { updateSettings } from '../api/settings';
import { useAuthStore } from '../store/authStore';
import { useDrivesStore } from '../store/drivesStore';
import { usePiratesStore } from '../store/piratesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { DEFAULT_SETTINGS } from '../types';
import type { PirateKind } from '../types';

const DEFAULT_NAME_BY_SLOT: Record<PirateKind, string> = {
    kid: 'קפטן ילד',
    mom: 'אמא',
    dad: 'אבא',
};

/**
 * Reset the user's family data to defaults.
 *
 * Problem this solves: the old `resetAll()` only cleared local in-memory
 * state. The very next pull (focus/heartbeat) re-hydrated everything from
 * the server and the "reset" appeared to un-reset itself seconds later.
 *
 * Correct sequence:
 *   1. Drop any unflushed queued writes — they're about to be invalidated
 *      by the server wipe.
 *   2. Wipe server-side user-generated state and reset pirate names +
 *      settings to defaults, BYPASSING the queue (direct API calls). We
 *      can't let these go through the queue because the queue was just
 *      cleared; and we need the writes to complete before we let anyone
 *      pull again.
 *   3. Clear local stores so the UI shows defaults immediately.
 *   4. Pull — now returns the freshly-reset server state. Guaranteed to
 *      match what the user sees.
 *
 * If step 2 partially fails (network blip mid-wipe), local state is
 * already cleared but a subsequent pull will repopulate whatever didn't
 * get wiped. Calling reset again drains the rest.
 */
export async function resetFamilyData(): Promise<void> {
    const { family } = useAuthStore.getState();

    // Always wipe the client queue first, even in local-only mode, so
    // we're not holding stale writes that would re-apply after reset.
    await useSyncStore.getState().clear();

    // Local-only mode (no family yet) — just reset local stores.
    if (!family) {
        useDrivesStore.getState().resetAll();
        usePiratesStore.getState().resetToDefaults();
        useSettingsStore.getState().reset();
        return;
    }

    // Server-side wipe. Each call can throw; we let the error propagate so
    // the UI can surface it rather than silently leaving a half-reset DB.
    await wipeFamilyData(family.id);
    await Promise.all([
        updatePirate({ familyId: family.id, slot: 'kid', name: DEFAULT_NAME_BY_SLOT.kid }),
        updatePirate({ familyId: family.id, slot: 'mom', name: DEFAULT_NAME_BY_SLOT.mom }),
        updatePirate({ familyId: family.id, slot: 'dad', name: DEFAULT_NAME_BY_SLOT.dad }),
    ]);
    await updateSettings(family.id, DEFAULT_SETTINGS);

    // Local reset happens AFTER the server is confirmed clean. This
    // prevents the brief window where the UI shows defaults but a focus
    // pull would immediately re-hydrate the old server state.
    useDrivesStore.getState().resetAll();
    usePiratesStore.getState().resetToDefaults();
    useSettingsStore.getState().reset();

    // Re-pull to confirm the canonical state from the server. We skip
    // flush — the queue was just cleared and nothing above enqueues.
    const { pullFamilyState } = await import('./pull');
    await pullFamilyState();
}
