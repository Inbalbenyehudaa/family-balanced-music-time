import { useEffect } from 'react';
import { useSyncStore } from '../store/syncStore';

/**
 * Keeps syncStore.isOnline synced with navigator.onLine. Also triggers
 * a flush when the device regains connectivity so queued work drains
 * without waiting for the 60s heartbeat.
 */
export function useOnlineStatus() {
    useEffect(() => {
        const setOnline = (b: boolean) => useSyncStore.getState().setOnline(b);

        const handleOnline = () => {
            setOnline(true);
            useSyncStore.getState().flush().catch(() => {});
        };
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
}
