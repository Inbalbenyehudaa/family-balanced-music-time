import { useEffect } from 'react';
import { ART_URLS } from '../components/Art';

/**
 * Pulls every island and coastal-find image onto the device ahead of time.
 *
 * The reveal screen is the only place a *locked* island's art is ever
 * requested: the map draws a padlock for anything still locked, and
 * IslandDetail only opens for islands already unlocked. So the image for
 * the island you are about to unlock has, by definition, never been
 * fetched on this device — there is nothing in any cache to hit, and no
 * cache header can change that. A voyage that ends underground has
 * nothing to draw at the one moment the drawing matters most.
 *
 * The art therefore has to arrive before the unlock does. All 23 pieces
 * total ~900KB and are served `immutable`, so in practice this runs once
 * per install and then lives in the HTTP cache.
 */

/** Small enough to be polite on cellular, large enough to finish quickly. */
const CONCURRENCY = 3;

/**
 * Module-level rather than a ref: the prefetch is per-device, not per-mount,
 * and React StrictMode invokes effects twice in development.
 */
let started = false;

/** Exposed only so tests can reason about a fresh device. */
export function __resetPrefetchForTests() {
    started = false;
}

function whenIdle(fn: () => void) {
    const ric = (
        window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
    ).requestIdleCallback;
    // Never block first paint. Safari has no requestIdleCallback, so fall
    // back to a delay long enough for the app to settle.
    if (ric) ric(fn, { timeout: 4000 });
    else setTimeout(fn, 1200);
}

/** Resolves either way — a failed warm-up is not worth reporting. */
function load(url: string): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
    });
}

async function warm(urls: string[]) {
    const queue = [...urls];
    await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
            for (let next = queue.shift(); next; next = queue.shift()) {
                await load(next);
            }
        }),
    );
}

export function usePrefetchArt() {
    useEffect(() => {
        if (started) return;

        // Honour the family's data saver rather than spending ~900KB of
        // someone's plan on art they may never unlock.
        const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection;
        if (conn?.saveData) return;

        const run = () => {
            if (started || !navigator.onLine) return;
            started = true;
            whenIdle(() => {
                void warm(ART_URLS);
            });
        };

        run();
        // First load was offline — try again the moment there is a network.
        if (started) return;
        window.addEventListener('online', run);
        return () => window.removeEventListener('online', run);
    }, []);
}
