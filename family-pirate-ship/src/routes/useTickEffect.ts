/**
 * Drives the per-second tick on the active drive.
 *
 * Two responsibilities:
 *   1. setInterval(1s) → tick — the normal-case heartbeat.
 *   2. visibilitychange → tick — fires the moment the tab becomes visible
 *      again so the wall-clock delta gets credited immediately, instead of
 *      waiting up to a second for the next interval boundary. Mobile
 *      browsers (iOS Safari especially) suspend timers while backgrounded;
 *      the visibility listener is what closes the gap on return.
 *
 * The store's `tick` is wall-clock based — it credits (now − lastTickAt) to
 * the active pirate — so a single fire after a long suspension catches up
 * the elapsed time without losing any of it.
 */
import { useEffect } from 'react';
import { useDrivesStore } from '../store/drivesStore';
import { tweakState } from './tweakState';

export function useTickEffect() {
    useEffect(() => {
        const fire = () => {
            const speed = tweakState.demoFastClock ? 8 : 1;
            useDrivesStore.getState().tick(speed);
        };
        const id = setInterval(fire, 1000);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') fire();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);
}
