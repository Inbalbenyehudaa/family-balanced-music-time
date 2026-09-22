import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { readBuffer, resetBufferStateForTests } from '../telemetry/buffer';
import { usePiratesStore } from '../store/piratesStore';
import type { ReactElement } from 'react';
import type { Pirate } from '../types';

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'יונתן', color: '#E63946', serverId: 'p-kid' },
];

/**
 * Always throws. The explicit return type is load-bearing: without it TS
 * infers `never` and refuses to accept the function as a JSX component.
 */
function Boom({ message = 'render exploded' }: { message?: string }): ReactElement {
    throw new Error(message);
}

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetBufferStateForTests();
    usePiratesStore.setState({ pirates: PIRATES });
    // React logs the caught error to console.error; that is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup(); // vitest runs with globals:false — no automatic cleanup
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('renders children when nothing throws', () => {
        render(
            <ErrorBoundary>
                <div>ALL WELL</div>
            </ErrorBoundary>,
        );
        expect(screen.getByText('ALL WELL')).toBeTruthy();
    });

    it('shows a recovery screen instead of a white page', () => {
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );
        // Before this component existed, a render throw took the tree down
        // and left the family staring at nothing.
        expect(screen.getByText('משהו השתבש')).toBeTruthy();
        expect(screen.getByText('רענון')).toBeTruthy();
    });

    it('records a render_error diagnostic', () => {
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );

        const entry = readBuffer().find((r) => r.code === 'render_error');
        expect(entry).toBeDefined();
        expect(entry!.level).toBe('error');
        expect(entry!.detail).toBe('Error: render exploded');
        expect(entry!.context?.stackDepth).toBeGreaterThan(0);
    });

    it('scrubs the thrown message — a crash can carry a child’s name', () => {
        render(
            <ErrorBoundary>
                <Boom message="failed rendering יונתן" />
            </ErrorBoundary>,
        );

        const entry = readBuffer().find((r) => r.code === 'render_error');
        expect(entry!.detail).toBe('Error: failed rendering [name]');
        expect(entry!.detail).not.toContain('יונתן');
    });
});
