import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { TweakValues, Screen, Pirate, Drive, Island, CoastalFind } from './types';
import { ISLANDS } from './data';

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:pointer;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
  .twk-launcher{position:fixed;right:16px;bottom:16px;z-index:2147483645;
    width:36px;height:36px;border-radius:50%;border:.5px solid rgba(0,0,0,.1);
    background:rgba(250,249,247,.85);
    -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
    box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;font-size:16px}
`;

function TweakSection({ label, children }: { label: string; children?: ReactNode }) {
    return (
        <>
            <div className="twk-sect">{label}</div>
            {children}
        </>
    );
}

function TweakSlider({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="twk-row">
            <div className="twk-lbl">
                <span>{label}</span>
                <span className="twk-val">{value}</span>
            </div>
            <input
                type="range"
                className="twk-slider"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}

function TweakToggle({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="twk-row twk-row-h">
            <div className="twk-lbl">
                <span>{label}</span>
            </div>
            <button
                type="button"
                className="twk-toggle"
                data-on={value ? '1' : '0'}
                role="switch"
                aria-checked={!!value}
                onClick={() => onChange(!value)}
            >
                <i />
            </button>
        </div>
    );
}

const smallBtn: CSSProperties = {
    flex: 1,
    padding: '6px 8px',
    fontSize: 11,
    borderRadius: 8,
    background: '#F0D49B',
    color: '#2A2620',
    border: '1.5px solid #5D3F2A',
    fontFamily: 'sans-serif',
    cursor: 'pointer',
    fontWeight: 600,
};

const NAV_SCREENS: Screen[] = [
    'welcome',
    'names',
    'crew',
    'home',
    'drive',
    'spyglass',
    'reveal',
    'map',
    'gate',
    'settings',
];

export interface TweaksBridge {
    values: TweakValues;
    setValues: (patch: Partial<TweakValues>) => void;
    screen: Screen;
    setScreen: (s: Screen) => void;
    setMinutes: (m: number[]) => void;
    setActive: (a: boolean[]) => void;
    setCurrentIdx: (i: number) => void;
    setLatestUnlock: (isl: Island | null) => void;
    setLatestFind: (f: CoastalFind | null) => void;
    unlockedIslandIds: string[];
    setUnlockedIslandIds: (ids: string[]) => void;
    pirates: Pirate[];
    drives: Drive[];
}

export function TweaksPanel({ bridge }: { bridge: TweaksBridge }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        try {
            setOpen(localStorage.getItem('tweaks.open') === '1');
        } catch {
            /* noop */
        }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem('tweaks.open', open ? '1' : '0');
        } catch {
            /* noop */
        }
    }, [open]);

    const { values, setValues, screen, setScreen } = bridge;

    if (!open) {
        return (
            <>
                <style>{TWEAKS_STYLE}</style>
                <button
                    className="twk-launcher"
                    onClick={() => setOpen(true)}
                    aria-label="Open tweaks"
                    title="Tweaks"
                >
                    ⚙
                </button>
            </>
        );
    }

    return (
        <>
            <style>{TWEAKS_STYLE}</style>
            <div className="twk-panel">
                <div className="twk-hd">
                    <b>Tweaks</b>
                    <button className="twk-x" aria-label="Close" onClick={() => setOpen(false)}>
                        ✕
                    </button>
                </div>
                <div className="twk-body">
                    <TweakSection label="Navigation">
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 6,
                            }}
                        >
                            {NAV_SCREENS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        if (s === 'drive') {
                                            bridge.setMinutes([180, 90, 60]);
                                            bridge.setActive([true, true, true]);
                                            bridge.setCurrentIdx(0);
                                        }
                                        if (s === 'spyglass') {
                                            bridge.setMinutes([180, 90, 60]);
                                            bridge.setActive([true, true, true]);
                                        }
                                        if (s === 'reveal') {
                                            bridge.setMinutes([240, 220, 180]);
                                            bridge.setActive([true, true, true]);
                                            bridge.setLatestUnlock(ISLANDS[0]);
                                            bridge.setLatestFind(null);
                                        }
                                        setScreen(s);
                                    }}
                                    style={{
                                        ...smallBtn,
                                        background: screen === s ? '#E5B23A' : '#FBF1DC',
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </TweakSection>

                    <TweakSection label="Drive simulation">
                        <TweakToggle
                            label="Demo fast clock (4s/sec)"
                            value={values.demoFastClock}
                            onChange={(v) => setValues({ demoFastClock: v })}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button onClick={() => bridge.setMinutes([180, 60, 30])} style={smallBtn}>
                                Lopsided
                            </button>
                            <button onClick={() => bridge.setMinutes([120, 110, 100])} style={smallBtn}>
                                Balanced
                            </button>
                            <button onClick={() => bridge.setMinutes([300, 80, 80])} style={smallBtn}>
                                Harbor
                            </button>
                        </div>
                    </TweakSection>

                    <TweakSection label="Tier thresholds">
                        <TweakSlider
                            label="Fair-Winds threshold (≤)"
                            value={values.fairThreshold}
                            min={0.5}
                            max={0.7}
                            step={0.01}
                            onChange={(v) => setValues({ fairThreshold: v })}
                        />
                        <TweakSlider
                            label="Harbor threshold (>)"
                            value={values.harborThreshold}
                            min={0.7}
                            max={0.9}
                            step={0.01}
                            onChange={(v) => setValues({ harborThreshold: v })}
                        />
                    </TweakSection>

                    <TweakSection label="Reveal preview">
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={() => {
                                    bridge.setMinutes([200, 180, 160]);
                                    bridge.setActive([true, true, true]);
                                    const locked = ISLANDS.filter(
                                        (i) => !bridge.unlockedIslandIds.includes(i.id),
                                    );
                                    bridge.setLatestUnlock(locked[0] || ISLANDS[0]);
                                    bridge.setLatestFind(null);
                                    setScreen('reveal');
                                }}
                                style={smallBtn}
                            >
                                Fair
                            </button>
                            <button
                                onClick={() => {
                                    bridge.setMinutes([200, 80, 80]);
                                    bridge.setActive([true, true, true]);
                                    bridge.setLatestUnlock(null);
                                    setScreen('reveal');
                                }}
                                style={smallBtn}
                            >
                                Coastal
                            </button>
                            <button
                                onClick={() => {
                                    bridge.setMinutes([300, 60, 40]);
                                    bridge.setActive([true, true, true]);
                                    bridge.setLatestUnlock(null);
                                    bridge.setLatestFind(null);
                                    setScreen('reveal');
                                }}
                                style={smallBtn}
                            >
                                Harbor
                            </button>
                        </div>
                    </TweakSection>

                    <TweakSection label="Map">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                                style={smallBtn}
                                onClick={() =>
                                    bridge.setUnlockedIslandIds(ISLANDS.slice(0, 6).map((i) => i.id))
                                }
                            >
                                Unlock 6
                            </button>
                            <button
                                style={smallBtn}
                                onClick={() => bridge.setUnlockedIslandIds(ISLANDS.map((i) => i.id))}
                            >
                                Unlock all
                            </button>
                            <button style={smallBtn} onClick={() => bridge.setUnlockedIslandIds([])}>
                                Lock all
                            </button>
                        </div>
                    </TweakSection>
                </div>
            </div>
        </>
    );
}
