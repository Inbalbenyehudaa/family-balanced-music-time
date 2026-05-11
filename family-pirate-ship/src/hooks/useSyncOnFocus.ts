import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';

/**
 * Re-pull family state and flush any pending writes when the window
 * regains focus (or visibility). This keeps the two-device story honest:
 * when mom comes back to the app, dad's drive shows up immediately.
 *
 * Also runs a 60s heartbeat while the tab is visible + online to cover
 * the "tab left open but network was flaky" case.
 */
export function useSyncOnFocus() {
    useEffect(() => {
        let cancelled = false;

        const doPull = async () => {
            if (cancelled) return;
            const { user, family } = useAuthStore.getState();
            if (!user || !family) return;
            try {
                // Flush BEFORE pulling. Pull rewrites local state from the
                // server; if we pulled first, any queued-but-unflushed local
                // edits (e.g. a just-saved crew rename) would get clobbered
                // by stale server rows.
                await useSyncStore.getState().flush();
                const { pullFamilyState } = await import('../sync/pull');
                await pullFamilyState();
            } catch (err) {
                // Keep errors quiet — UI already reflects online/offline.
                console.warn('[useSyncOnFocus] flush/pull failed', err);
            }
        };

        const handleFocus = () => doPull();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') doPull();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        // Heartbeat
        const heartbeat = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                useSyncStore.getState().flush().catch(() => {});
            }
        }, 60_000);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(heartbeat);
        };
    }, []);
}
