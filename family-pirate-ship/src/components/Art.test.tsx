import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoastalFindIcon, IslandIllustration } from './Art';
import { ScreenMap } from '../screens/Map';
import { COASTAL_FINDS, ISLANDS } from '../data';

// vitest runs with globals: false, so @testing-library/react registers no
// automatic cleanup. Without this every test renders into the previous one's
// DOM and the queries go ambiguous.
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const ISLAND = ISLANDS[0];
const FIND = COASTAL_FINDS[0];

/**
 * An Image that always fails, standing in for the real reason this code
 * exists: a voyage ending underground, where the asset URL is perfectly
 * valid and the network simply is not there.
 */
function stubFailingImage() {
    vi.stubGlobal(
        'Image',
        class {
            complete = false;
            naturalWidth = 0;
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_url: string) {
                setTimeout(() => this.onerror?.(), 0);
            }
        },
    );
}

describe('IslandIllustration', () => {
    it('draws the island art while it is still loading', () => {
        const { container } = render(<IslandIllustration island={ISLAND} />);
        expect(container.querySelector('image')).toBeTruthy();
        expect(screen.queryByText('?')).toBeNull();
    });

    it('falls back to the ? marker when the art cannot be fetched', async () => {
        stubFailingImage();
        const { container } = render(<IslandIllustration island={ISLAND} />);
        await waitFor(() => expect(screen.getByText('?')).toBeTruthy());
        expect(container.querySelector('image')).toBeNull();
    });

    it('falls back for an island with no art at all', () => {
        render(
            <IslandIllustration
                island={{ id: 'no-such-island', name: 'x', description: 'y' }}
            />,
        );
        expect(screen.getByText('?')).toBeTruthy();
    });
});

describe('CoastalFindIcon', () => {
    it('falls back to the ? marker when the art cannot be fetched', async () => {
        stubFailingImage();
        const { container } = render(<CoastalFindIcon find={FIND} />);
        await waitFor(() => expect(screen.getByText('?')).toBeTruthy());
        expect(container.querySelector('image')).toBeNull();
    });
});

/**
 * The map places its islands in measured pixels, and jsdom reports every
 * element as 0x0 — so without a size the field computes no positions and
 * renders no pins at all. ResizeObserver likewise does not exist here.
 */
function stubLayout() {
    const size = (prop: string, value: number) =>
        Object.defineProperty(HTMLElement.prototype, prop, {
            configurable: true,
            get: () => value,
        });
    size('clientWidth', 800);
    size('clientHeight', 600);
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
    return () => {
        Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
        Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    };
}

describe('Map island pins', () => {
    it('swaps a broken pin for the ? marker and leaves the others alone', () => {
        const restore = stubLayout();
        const { container } = render(
            <ScreenMap
                unlockedIds={[ISLANDS[0].id, ISLANDS[1].id]}
                onBack={vi.fn()}
                onIslandTap={vi.fn()}
            />,
        );
        const pins = container.querySelectorAll('img');
        expect(pins.length).toBe(2);

        fireEvent.error(pins[0]);

        expect(screen.getByText('?')).toBeTruthy();
        expect(container.querySelectorAll('img').length).toBe(1);
        restore();
    });
});
