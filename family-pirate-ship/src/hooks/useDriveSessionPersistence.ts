/**
 * Keeps the on-disk voyage snapshot in step with `drivesStore`.
 *
 * Lives here rather than inside `driveSession.ts` so that module stays a
 * pure storage helper with no runtime dependency on the store — `drivesStore`
 * imports it during construction, and a store→session→store import cycle
 * would be a loaded gun.
 *
 * Mount once, from the app shell.
 */
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDrivesStore } from '../store/drivesStore';
import {
    SAVE_INTERVAL_MS,
    clearDriveSession,
    hasDriveSession,
    saveDriveSession,
} from '../store/driveSession';

/**
 * The fields whose movement means a deferred write would credit the eviction
 * gap to the wrong pirate — a tap, a roll-call change, or the drive starting
 * or ending. Any change here forces an immediate write; everything else
 * (which in practice is the once-a-second tick advancing `minutes` and
 * `lastTickAt` together) rides the throttle.
 */
function shapeOf(s: ReturnType<typeof useDrivesStore.getState>): string {
    return [s.driveInProgress, s.currentIdx, s.active.join(','), s.tapCounts.join(',')].join(
        '|',
    );
}

export function useDriveSessionPersistence() {
    useEffect(() => {
        let lastWriteAt = 0;
        let lastShape = '';
        let stored = hasDriveSession();

        const persist = (force: boolean) => {
            const s = useDrivesStore.getState();

            // No voyage running — drop the snapshot. Covers endDrive,
            // cancelDrive, resetAll, and the family-reset sequence without
            // any of them needing to know this module exists.
            if (!s.driveInProgress || s.lastTickAt === null) {
                if (stored) {
                    clearDriveSession();
                    stored = false;
                    lastShape = '';
                }
                return;
            }

            const shape = shapeOf(s);
            const now = Date.now();
            if (!force && shape === lastShape && now - lastWriteAt < SAVE_INTERVAL_MS) return;

            saveDriveSession(s);
            lastShape = shape;
            lastWriteAt = now;
            stored = true;
        };

        const flush = () => persist(true);

        const unsubscribeDrives = useDrivesStore.subscribe(() => persist(false));

        // A signed-out device must not hand the next person to sign in a
        // voyage that belonged to the previous family.
        let prevUser = useAuthStore.getState().user;
        const unsubscribeAuth = useAuthStore.subscribe((s) => {
            if (prevUser && !s.user) {
                useDrivesStore.getState().cancelDrive();
                clearDriveSession();
                stored = false;
                lastShape = '';
            }
            prevUser = s.user;
        });

        // Last-moment writes. `freeze` is the Chrome page-lifecycle event
        // fired immediately before a backgrounded tab is discarded — the
        // exact Android case this whole module exists for. `pagehide` and
        // `visibilitychange` cover the browsers that don't implement it.
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flush();
        };
        window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('freeze', flush);

        // Write once on mount so a voyage that is somehow already running
        // (a resumed one, mainly) is on disk before anything else happens.
        persist(true);

        return () => {
            unsubscribeDrives();
            unsubscribeAuth();
            window.removeEventListener('pagehide', flush);
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('freeze', flush);
        };
    }, []);
}
