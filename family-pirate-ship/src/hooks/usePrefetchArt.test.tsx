import { readFileSync } from 'node:fs';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrefetchArt, __resetPrefetchForTests } from './usePrefetchArt';
import { ART_URLS } from '../components/Art';

// vitest runs with globals: false, so @testing-library/react registers no
// automatic cleanup.
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

/** Records every url the hook asks for, and reports each as loaded. */
function stubImage(seen: string[]) {
    vi.stubGlobal(
        'Image',
        class {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(url: string) {
                seen.push(url);
                setTimeout(() => this.onload?.(), 0);
            }
        },
    );
}

function setNavigator({ online = true, saveData = false } = {}) {
    Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => online,
    });
    Object.defineProperty(window.navigator, 'connection', {
        configurable: true,
        get: () => ({ saveData }),
    });
}

beforeEach(() => {
    __resetPrefetchForTests();
    vi.useFakeTimers();
    // The hook defers to idle so it never blocks first paint; run it now.
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
        cb();
        return 1;
    });
});

describe('usePrefetchArt', () => {
    it('pulls every island and coastal find onto the device', async () => {
        const seen: string[] = [];
        stubImage(seen);
        setNavigator();

        renderHook(() => usePrefetchArt());
        await vi.runAllTimersAsync();

        expect(seen.length).toBe(ART_URLS.length);
        expect(new Set(seen)).toEqual(new Set(ART_URLS));
    });

    it('waits for a network rather than failing a pile of requests', async () => {
        const seen: string[] = [];
        stubImage(seen);
        setNavigator({ online: false });

        renderHook(() => usePrefetchArt());
        await vi.runAllTimersAsync();
        expect(seen).toEqual([]);

        setNavigator({ online: true });
        window.dispatchEvent(new Event('online'));
        await vi.runAllTimersAsync();

        expect(seen.length).toBe(ART_URLS.length);
    });

    it('spends none of the family data plan when data saver is on', async () => {
        const seen: string[] = [];
        stubImage(seen);
        setNavigator({ saveData: true });

        renderHook(() => usePrefetchArt());
        await vi.runAllTimersAsync();

        expect(seen).toEqual([]);
    });

    it('runs once per device, not once per mount', async () => {
        const seen: string[] = [];
        stubImage(seen);
        setNavigator();

        renderHook(() => usePrefetchArt());
        await vi.runAllTimersAsync();
        renderHook(() => usePrefetchArt());
        await vi.runAllTimersAsync();

        expect(seen.length).toBe(ART_URLS.length);
    });
});

describe('App wiring', () => {
    /**
     * A source-level assertion, deliberately. Several hooks in this app are
     * referenced only from App.tsx — remove the call and the feature stops
     * silently with every unit test still green. HANDOFF-v13 records that
     * costing real debugging time. This pins the call site itself.
     */
    it('calls usePrefetchArt from the shell', () => {
        // Resolved from the project root: vitest runs with cwd there, and
        // import.meta.url is not a file: url under the test transform.
        const app = readFileSync('src/App.tsx', 'utf8');
        expect(app).toContain('usePrefetchArt()');
    });
});
