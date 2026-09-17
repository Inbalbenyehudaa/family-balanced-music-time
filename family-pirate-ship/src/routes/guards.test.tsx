import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireActiveDrive } from './guards';
import { useDrivesStore } from '../store/drivesStore';

/**
 * Stand-ins for the real screens — this is about the guard and the routing
 * around it, not about what Drive or Reveal paint.
 */
function Harness({ onEnd }: { onEnd?: () => void } = {}) {
    return (
        <Routes>
            <Route path="/home" element={<div>HOME</div>} />
            <Route
                path="/drive/active"
                element={
                    <RequireActiveDrive>
                        <div>
                            DRIVE
                            {onEnd && (
                                <button onClick={onEnd} type="button">
                                    end
                                </button>
                            )}
                        </div>
                    </RequireActiveDrive>
                }
            />
            <Route path="/drive/reveal" element={<div>REVEAL</div>} />
            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    );
}

beforeEach(() => {
    useDrivesStore.getState().resetAll();
});

afterEach(() => {
    cleanup();
});

describe('RequireActiveDrive', () => {
    it('renders the drive screen while a voyage is running', () => {
        useDrivesStore.getState().startDrive([true, true, true]);

        render(
            <MemoryRouter initialEntries={['/drive/active']}>
                <Harness />
            </MemoryRouter>,
        );

        expect(screen.getByText('DRIVE')).toBeTruthy();
    });

    it('sends a cold reload home when there is no voyage to resume', () => {
        // The eviction case with a snapshot too stale to restore: the URL
        // still says /drive/active, but the store came back empty.
        render(
            <MemoryRouter initialEntries={['/drive/active']}>
                <Harness />
            </MemoryRouter>,
        );

        expect(screen.getByText('HOME')).toBeTruthy();
        expect(screen.queryByText('DRIVE')).toBeNull();
    });

    it('lands on Reveal — not Home — when a voyage is ended', () => {
        // The one place this guard could bite. ConfirmEnd's handler ends the
        // voyage and navigates in a single click (screens.tsx), but the store
        // update and the router update arrive in separate renders — so the
        // guard gets one render at /drive/active with the voyage already
        // finished. It must not bounce home there, or the family never sees
        // the reveal they just earned.
        //
        // No auth is set up in this file, so endDrive writes the drive
        // locally and returns before any server enqueue.
        useDrivesStore.getState().startDrive([true, true, true]);
        useDrivesStore.getState().setCurrentIdx(0);

        function EndVoyage() {
            const nav = useNavigate();
            return (
                <Harness
                    onEnd={() => {
                        useDrivesStore.getState().endDrive([]);
                        nav('/drive/reveal');
                    }}
                />
            );
        }

        render(
            <MemoryRouter initialEntries={['/drive/active']}>
                <EndVoyage />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByText('end'));

        expect(screen.getByText('REVEAL')).toBeTruthy();
        expect(screen.queryByText('HOME')).toBeNull();
    });

    it('still sends a reload home after the voyage that ended is cleared away', () => {
        // resetAll / cancelDrive put the store back to pristine, which is the
        // state a cold reload starts from.
        useDrivesStore.getState().startDrive([true, true, true]);
        useDrivesStore.getState().cancelDrive();

        render(
            <MemoryRouter initialEntries={['/drive/active']}>
                <Harness />
            </MemoryRouter>,
        );

        expect(screen.getByText('HOME')).toBeTruthy();
    });


});
