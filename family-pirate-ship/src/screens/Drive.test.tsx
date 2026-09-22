import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScreenDrive } from './Drive';
import type { Pirate } from '../types';

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'יונתן', color: '#E63946', serverId: 'p-kid' },
    { kind: 'mom', role: 'mom', name: 'אמא', color: '#2A9D8F', serverId: 'p-mom' },
    { kind: 'dad', role: 'dad', name: 'אבא', color: '#7B4B94', serverId: 'p-dad' },
];

// vitest runs with globals: false, so @testing-library/react registers no
// automatic cleanup. Without this every test renders into the previous one's
// DOM and the queries go ambiguous.
afterEach(cleanup);

function renderDrive(over: Partial<Parameters<typeof ScreenDrive>[0]> = {}) {
    const props = {
        pirates: PIRATES,
        active: [true, true, true],
        minutes: [90, 30, 0],
        currentIdx: 0,
        pausedFrom: -1,
        onPirateTap: vi.fn(),
        onTogglePause: vi.fn(),
        elapsed: 120,
        onSpyglass: vi.fn(),
        onEndVoyage: vi.fn(),
        ...over,
    };
    render(<ScreenDrive {...props} />);
    return props;
}

describe('ScreenDrive — sailing', () => {
    it('offers a break and shows no paused strip', () => {
        renderDrive();
        expect(screen.getByRole('button', { name: 'הפסקה' })).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('');
    });

    it('routes a tap on the glowing pirate through onPirateTap', () => {
        // The fast door. This tap used to be a no-op.
        const props = renderDrive();
        fireEvent.click(screen.getByRole('button', { name: /יונתן/ }));
        expect(props.onPirateTap).toHaveBeenCalledWith(0);
    });

    it('disables the break button before anyone has been tapped', () => {
        // Straight off roll call: nobody is listening, so there is nothing to
        // stop. currentIdx is -1 here but this is NOT a break.
        renderDrive({ currentIdx: -1, pausedFrom: -1 });
        const btn = screen.getByRole('button', { name: 'הפסקה' }) as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        expect(screen.getByRole('status').textContent).toBe('');
    });
});

describe('ScreenDrive — on a break', () => {
    const PAUSED = { currentIdx: -1, pausedFrom: 0 };

    it('announces the break in a live region', () => {
        // The one thing standing between a family and twenty minutes of
        // driving with the timer silently stopped.
        renderDrive(PAUSED);
        const strip = screen.getByRole('status');
        expect(strip.getAttribute('aria-live')).toBe('polite');
        expect(strip.textContent).toContain('בהפסקה');
    });

    it('labels the paused pirate as on a break', () => {
        renderDrive(PAUSED);
        expect(screen.getByRole('button', { name: 'יונתן — בהפסקה' })).toBeTruthy();
    });

    it('turns the break button into resume', () => {
        const props = renderDrive(PAUSED);
        const btn = screen.getByRole('button', { name: 'המשיכו' }) as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
        expect(btn.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(btn);
        expect(props.onTogglePause).toHaveBeenCalledOnce();
    });

    it('offers the other pirates as a resume target', () => {
        const props = renderDrive(PAUSED);
        fireEvent.click(screen.getByRole('button', { name: /אמא/ }));
        expect(props.onPirateTap).toHaveBeenCalledWith(1);
    });

    it('does not give the paused treatment to a pirate who is not in the car', () => {
        // Guards the one confusion the visual language must never permit:
        // gold means "on a break", grey means "not here today".
        renderDrive({ ...PAUSED, active: [true, true, false] });
        expect(screen.queryByRole('button', { name: 'אבא — בהפסקה' })).toBeNull();
        expect(screen.getByText('לא כאן היום')).toBeTruthy();
        // And the break belongs to exactly one pirate.
        expect(screen.getAllByText('בהפסקה')).toHaveLength(2); // strip + the held row
    });

    it('keeps End Voyage available during a break', () => {
        renderDrive(PAUSED);
        expect(screen.getByText('סיימו הפלגה')).toBeTruthy();
    });
});
