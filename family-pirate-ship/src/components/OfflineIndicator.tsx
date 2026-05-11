import { useSyncStore } from '../store/syncStore';

/**
 * Surfaces offline + queue-depth state to the user. Lives in the
 * during-drive screen's top corner; stays out of the way when everything
 * is healthy.
 *
 * Per product spec §5:
 *   - When offline: "אופליין — ההפלגה תישמר כשתהיה רשת"
 *   - When queue ≥ 3 (even online): show a "queued drives" notice that
 *     the parent settings screen can act on. Kid context sees no alarm.
 */
export function OfflineIndicator() {
    const isOnline = useSyncStore((s) => s.isOnline);
    const queueLen = useSyncStore((s) => s.queueLen);

    if (isOnline && queueLen < 3) return null;

    const message = !isOnline
        ? 'אופליין — ההפלגה תישמר כשתהיה רשת'
        : `${queueLen} הפלגות מחכות לסנכרון`;

    return (
        <div
            dir="rtl"
            className="flex items-center gap-2 rounded-full border border-[rgba(93,63,42,0.3)] bg-[rgba(251,241,220,0.95)] px-3 py-1 font-body text-xs font-medium text-wood-deep"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
            <span aria-hidden="true">☁️</span>
            <span>{message}</span>
        </div>
    );
}
