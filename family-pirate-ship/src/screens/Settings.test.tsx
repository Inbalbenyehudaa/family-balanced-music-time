import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ScreenSettings, type SettingsValues } from './Settings';
import { DEFAULT_SETTINGS, type Pirate } from '../types';

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'יונתן', color: '#E63946', serverId: 'p-kid' },
    { kind: 'mom', role: 'mom', name: 'מאיה', color: '#2A9D8F', serverId: 'p-mom' },
    { kind: 'dad', role: 'dad', name: 'אבא', color: '#7B4B94', serverId: 'p-dad' },
];

function values(over: Partial<SettingsValues> = {}): SettingsValues {
    return {
        fairThreshold: DEFAULT_SETTINGS.fairWindsThreshold,
        harborThreshold: DEFAULT_SETTINGS.harborThreshold,
        audio: DEFAULT_SETTINGS.audioEnabled,
        fog: DEFAULT_SETTINGS.fogEnabled,
        demoFastClock: false,
        telemetryEnabled: DEFAULT_SETTINGS.telemetryEnabled,
        pirates: PIRATES,
        ...over,
    };
}

function setup(over: Partial<SettingsValues> = {}) {
    const setSettings = vi.fn();
    const onSavePirates = vi.fn();
    const view = render(
        <ScreenSettings
            onBack={() => {}}
            settings={values(over)}
            setSettings={setSettings}
            drives={[]}
            onReset={() => {}}
            onSavePirates={onSavePirates}
        />,
    );
    return { setSettings, onSavePirates, view };
}

const saveButton = () => screen.getByText('שמירה') as HTMLButtonElement;
const fairSlider = () => screen.getAllByRole('slider')[0];
const telemetryToggle = () => screen.getByRole('checkbox');
const nameInputs = () => screen.getAllByRole('textbox') as HTMLInputElement[];

afterEach(() => {
    cleanup(); // vitest runs with globals:false — no automatic cleanup
    vi.restoreAllMocks();
});

describe('ScreenSettings — one save button for the whole screen', () => {
    it('starts with the save button disabled and nothing pending', () => {
        setup();
        expect(saveButton().disabled).toBe(true);
        expect(screen.queryByText('יש שינויים שלא נשמרו')).toBeNull();
    });

    it('enables save when a threshold slider moves', () => {
        setup();
        fireEvent.change(fairSlider(), { target: { value: '0.65' } });

        expect(saveButton().disabled).toBe(false);
        expect(screen.getByText('יש שינויים שלא נשמרו')).toBeTruthy();
    });

    it('enables save when the telemetry toggle changes', () => {
        setup();
        fireEvent.click(telemetryToggle());
        expect(saveButton().disabled).toBe(false);
    });

    it('enables save when a crew name changes', () => {
        setup();
        fireEvent.change(nameInputs()[0], { target: { value: 'נועם' } });
        expect(saveButton().disabled).toBe(false);
    });

    it('does not write a slider change through until save is pressed', () => {
        // The bug this fixes: sliders used to commit on every drag, so the
        // screen had two save models and the button looked dead while you
        // were changing things it did not govern.
        const { setSettings } = setup();

        fireEvent.change(fairSlider(), { target: { value: '0.65' } });
        expect(setSettings).not.toHaveBeenCalled();

        fireEvent.click(saveButton());
        expect(setSettings).toHaveBeenCalledOnce();
        expect(setSettings.mock.calls[0][0]).toMatchObject({ fairThreshold: 0.65 });
    });

    it('does not write the telemetry toggle through until save is pressed', () => {
        const { setSettings } = setup({ telemetryEnabled: true });

        fireEvent.click(telemetryToggle());
        expect(setSettings).not.toHaveBeenCalled();

        fireEvent.click(saveButton());
        expect(setSettings.mock.calls[0][0]).toMatchObject({ telemetryEnabled: false });
    });

    it('commits thresholds, toggle and names together in one press', () => {
        const { setSettings, onSavePirates } = setup();

        fireEvent.change(fairSlider(), { target: { value: '0.65' } });
        fireEvent.click(telemetryToggle());
        fireEvent.change(nameInputs()[0], { target: { value: 'נועם' } });
        fireEvent.click(saveButton());

        expect(setSettings.mock.calls[0][0]).toMatchObject({
            fairThreshold: 0.65,
            telemetryEnabled: false,
        });
        expect(onSavePirates).toHaveBeenCalledOnce();
        expect(onSavePirates.mock.calls[0][0][0].name).toBe('נועם');
    });

    it('skips the pirate write when only a threshold moved', () => {
        // savePirates enqueues a server write per pirate; a slider nudge
        // should not cost three of them.
        const { onSavePirates } = setup();

        fireEvent.change(fairSlider(), { target: { value: '0.65' } });
        fireEvent.click(saveButton());

        expect(onSavePirates).not.toHaveBeenCalled();
    });

    it('confirms the save and disables the button again', () => {
        const { view } = setup();
        fireEvent.change(fairSlider(), { target: { value: '0.65' } });
        fireEvent.click(saveButton());

        expect(screen.getByText('✓ נשמר')).toBeTruthy();

        // The parent re-renders with the committed values; the draft matches
        // them, so nothing is pending any more.
        view.rerender(
            <ScreenSettings
                onBack={() => {}}
                settings={values({ fairThreshold: 0.65 })}
                setSettings={vi.fn()}
                drives={[]}
                onReset={() => {}}
                onSavePirates={vi.fn()}
            />,
        );

        expect(saveButton().disabled).toBe(true);
        expect(screen.queryByText('יש שינויים שלא נשמרו')).toBeNull();
    });

    it('keeps an in-progress edit across an unrelated re-render', () => {
        // The route adapter rebuilds the settings object on every render. If
        // the re-sync keyed on object identity it would blow away the draft
        // on the next render, which is the trap this guards.
        const { view } = setup();
        fireEvent.change(nameInputs()[0], { target: { value: 'נועם' } });

        view.rerender(
            <ScreenSettings
                onBack={() => {}}
                settings={values()}
                setSettings={vi.fn()}
                drives={[]}
                onReset={() => {}}
                onSavePirates={vi.fn()}
            />,
        );

        expect(nameInputs()[0].value).toBe('נועם');
        expect(saveButton().disabled).toBe(false);
    });

    it('takes on new server values when they actually change', () => {
        const { view } = setup();

        // Another device saved a different threshold, and a pull brought it in.
        view.rerender(
            <ScreenSettings
                onBack={() => {}}
                settings={values({ fairThreshold: 0.68 })}
                setSettings={vi.fn()}
                drives={[]}
                onReset={() => {}}
                onSavePirates={vi.fn()}
            />,
        );

        expect((fairSlider() as HTMLInputElement).value).toBe('0.68');
        expect(saveButton().disabled).toBe(true);
    });
});
