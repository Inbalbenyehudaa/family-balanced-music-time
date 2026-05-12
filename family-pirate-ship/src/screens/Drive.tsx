import { useRef, useState } from 'react';
import type { Pirate } from '../types';
import { SpyglassIcon, PirateAvatar, FlagBadge } from '../components/Art';
import { ScreenBackground } from '../components/ScreenBackground';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { hexToRgb, blendColor } from '../utils';

function formatMMSS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = Math.floor(s / 60)
        .toString()
        .padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
}

export function ScreenDrive({
    pirates,
    active,
    minutes,
    currentIdx,
    setCurrentIdx,
    elapsed,
    onSpyglass,
    onEndVoyage,
}: {
    pirates: Pirate[];
    active: boolean[];
    minutes: number[];
    currentIdx: number;
    setCurrentIdx: (i: number) => void;
    elapsed: number;
    onSpyglass: () => void;
    onEndVoyage: () => void;
}) {
    const showSpyglassHint = elapsed > 5 * 60;
    const [holdProgress, setHoldProgress] = useState(0);
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startHold = () => {
        const start = Date.now();
        holdRef.current = setInterval(() => {
            const p = Math.min(1, (Date.now() - start) / 1000);
            setHoldProgress(p);
            if (p >= 1) {
                if (holdRef.current) clearInterval(holdRef.current);
                onEndVoyage();
            }
        }, 20);
    };
    const cancelHold = () => {
        if (holdRef.current) clearInterval(holdRef.current);
        setHoldProgress(0);
    };

    return (
        <ScreenBackground variant="waves">
            <div
                data-screen-label="06 During Drive"
                className="relative flex min-h-[100dvh] flex-col px-4 pb-4 pt-4"
            >
                {/* Top row — spyglass (RTL: leading = right) + offline indicator */}
                <div className="flex flex-row-reverse items-center justify-between">
                    <SpyglassIcon size={56} glow={showSpyglassHint} onClick={onSpyglass} />
                    <OfflineIndicator />
                </div>

                {/* Pirate buttons — take remaining height, one per row */}
                <div className="flex flex-1 flex-col items-stretch justify-center gap-[15px] py-4">
                    {pirates.map((p, i) => {
                        const isActive = active[i] && currentIdx === i;
                        const satOut = !active[i];
                        return (
                            <button
                                key={p.kind}
                                disabled={satOut}
                                onClick={() => active[i] && setCurrentIdx(i)}
                                className={`relative flex w-full flex-row-reverse items-center gap-[14px] rounded-[22px] border-none px-[18px] py-3 transition-[box-shadow,background,transform] duration-200 ${
                                    satOut
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'cursor-pointer opacity-100'
                                } ${isActive ? '-translate-y-px animate-glow-pulse' : ''}`}
                                style={{
                                    minHeight: 120,
                                    height: 'clamp(120px, 22vh, 170px)',
                                    background: `
                    linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.06)),
                    repeating-linear-gradient(180deg, rgba(93,63,42,0.10) 0 1px, transparent 1px 8px),
                    ${blendColor(p.color, isActive ? 0.45 : 0.15)}`,
                                    boxShadow: isActive
                                        ? `inset 0 0 0 3px ${p.color},
                       inset 0 -4px 0 rgba(93,63,42,0.18),
                       0 0 0 5px rgba(${hexToRgb(p.color)},0.25),
                       0 0 38px ${p.color}88,
                       0 0 80px ${p.color}55`
                                        : `inset 0 0 0 2px rgba(93,63,42,0.45),
                       inset 0 -3px 0 rgba(93,63,42,0.15),
                       0 4px 0 rgba(93,63,42,0.18),
                       0 6px 14px rgba(93,63,42,0.14)`,
                                }}
                            >
                                <PirateAvatar kind={p.kind} size={72} sleeping={satOut} />
                                <div className="flex-1 text-right">
                                    <div className="flex flex-row-reverse items-center justify-start gap-2 font-display text-2xl font-bold text-text-primary">
                                        {p.name}
                                        {isActive && (
                                            <span
                                                className="text-[22px]"
                                                style={{ animation: 'softPulse 1.4s infinite' }}
                                            >
                                                🎵
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <div className="mt-[2px] font-body text-[13px] font-medium italic tracking-[0.3px] text-black">
                                            מאזין/ה עכשיו
                                        </div>
                                    )}
                                    {satOut && (
                                        <div className="font-body text-[15px] text-text-secondary">
                                            לא כאן היום
                                        </div>
                                    )}
                                </div>
                                {isActive && (
                                    <div
                                        aria-hidden="true"
                                        className="absolute bottom-3 flex h-[18px] items-end gap-[3px] text-black"
                                        style={{ insetInlineEnd: 18 }}
                                    >
                                        {[0, 1, 2, 3].map((b) => (
                                            <span
                                                key={b}
                                                className="w-[3px] rounded-sm bg-[#1a1a1a]"
                                                style={{
                                                    animation: `musicBar 900ms ${b * 110}ms ease-in-out infinite`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {/* Per-pirate timer — mm:ss of seconds
                                    accumulated on this pirate. Placed on
                                    the opposite side of the music bars and
                                    horizontally aligned with them. */}
                                {!satOut && (
                                    <div
                                        aria-label={`זמן האזנה של ${p.name}`}
                                        className="absolute bottom-3 flex h-[18px] items-center rounded-md bg-[rgba(251,241,220,0.85)] px-[6px] font-body text-[11px] font-semibold tabular-nums text-text-primary"
                                        style={{
                                            insetInlineStart: 18,
                                            boxShadow:
                                                'inset 0 0 0 1px rgba(93,63,42,0.35)',
                                            letterSpacing: 0.2,
                                        }}
                                    >
                                        {formatMMSS(minutes[i] ?? 0)}
                                    </div>
                                )}
                                <div className="absolute left-3 top-3">
                                    <FlagBadge color={p.color} size={24} waving={isActive} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* End voyage — footer; in RTL-column the button sits on the trailing/left side */}
                <div className="flex justify-start pt-2">
                    <div
                        className="relative h-11 w-[130px] cursor-pointer select-none overflow-hidden rounded-[14px] touch-none"
                        style={{
                            background: `
              linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.05)),
              var(--wood-light)`,
                            boxShadow:
                                'inset 0 0 0 2px rgba(93,63,42,0.5), 0 3px 0 rgba(93,63,42,0.18)',
                        }}
                        onMouseDown={startHold}
                        onMouseUp={cancelHold}
                        onMouseLeave={cancelHold}
                        onTouchStart={startHold}
                        onTouchEnd={cancelHold}
                        onTouchCancel={cancelHold}
                    >
                        <div
                            className="absolute inset-y-0 left-0 bg-wood-deep transition-[width] duration-[50ms]"
                            style={{ width: `${holdProgress * 100}%` }}
                        />
                        <div
                            className="absolute inset-0 flex items-center justify-center font-body text-base font-semibold transition-colors duration-100"
                            style={{
                                color: holdProgress > 0.4 ? '#FBF1DC' : 'var(--text-primary)',
                            }}
                        >
                            סיימו הפלגה
                        </div>
                        <div
                            className="absolute -left-[2px] top-[6px] h-8 w-[6px] rounded-[3px] opacity-70"
                            style={{
                                background:
                                    'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)',
                            }}
                        />
                        <div
                            className="absolute -right-[2px] top-[6px] h-8 w-[6px] rounded-[3px] opacity-70"
                            style={{
                                background:
                                    'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)',
                            }}
                        />
                    </div>
                </div>
            </div>
        </ScreenBackground>
    );
}
