import { useRef, useState } from 'react';
import type { Pirate } from '../types';
import { SpyglassIcon, PirateAvatar, FlagBadge, AnchorIcon } from '../components/Art';
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

/**
 * The standard transport pause mark, deliberately not a nautical metaphor. A
 * five-year-old already knows this shape from every screen they have touched;
 * the pirate world lives in the words and the art, and the controls stay
 * obvious. (The anchor was not available anyway — it is already on End
 * Voyage, where it reads as "finish".)
 */
function PauseMark({ size = 22, color = '#5D3F2A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
            <rect x="7" y="5" width="3.6" height="14" rx="1.6" />
            <rect x="13.4" y="5" width="3.6" height="14" rx="1.6" />
        </svg>
    );
}

/** The counterpart to PauseMark, for the button that ends a break. */
function PlayMark({ size = 22, color = '#5D3F2A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
            <path d="M8 5.6c0-.9 1-1.5 1.8-1L18 11c.7.4.7 1.5 0 1.9l-8.2 5.5c-.8.5-1.8-.1-1.8-1V5.6z" />
        </svg>
    );
}

export function ScreenDrive({
    pirates,
    active,
    minutes,
    currentIdx,
    pausedFrom,
    onPirateTap,
    onTogglePause,
    elapsed,
    onSpyglass,
    onEndVoyage,
}: {
    pirates: Pirate[];
    active: boolean[];
    minutes: number[];
    currentIdx: number;
    pausedFrom: number;
    onPirateTap: (i: number) => void;
    onTogglePause: () => void;
    elapsed: number;
    onSpyglass: () => void;
    onEndVoyage: () => void;
}) {
    const showSpyglassHint = elapsed > 5 * 60;
    const [holdProgress, setHoldProgress] = useState(0);
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Paused is the PAIR, never currentIdx alone: a voyage also sits at -1
    // straight off roll call, before anyone has been tapped, and that is not
    // a break.
    const paused = currentIdx < 0 && pausedFrom >= 0;
    // Nothing to pause until someone is listening, and nothing to resume
    // until a break is running.
    const canToggle = currentIdx >= 0 || pausedFrom >= 0;

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
                {/* Paused strip — the only defence against a family driving
                    twenty minutes with the timer silently stopped. The live
                    region is always mounted so the announcement fires when
                    the content appears; it costs nothing while sailing. */}
                <div role="status" aria-live="polite">
                    {paused && (
                        <div
                            className="mb-2 flex flex-row-reverse items-center justify-center gap-2 rounded-[12px] px-3 py-[6px] font-body text-[15px] font-semibold text-text-primary"
                            style={{
                                background: `
                    linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.05)),
                    var(--treasure-gold)`,
                                boxShadow: 'inset 0 0 0 2px rgba(93,63,42,0.35)',
                            }}
                        >
                            <span>בהפסקה</span>
                            <PauseMark size={18} />
                        </div>
                    )}
                </div>

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
                        // On a break: present and participating, which is why
                        // this is never the sleeping treatment worn by a child
                        // who is not in the car.
                        const held = active[i] && paused && pausedFrom === i;
                        return (
                            <button
                                key={p.kind}
                                disabled={satOut}
                                aria-label={held ? `${p.name} — בהפסקה` : undefined}
                                onClick={() => active[i] && onPirateTap(i)}
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
                    ${blendColor(p.color, isActive ? 0.45 : held ? 0.3 : 0.15)}`,
                                    boxShadow: isActive
                                        ? `inset 0 0 0 3px ${p.color},
                       inset 0 -4px 0 rgba(93,63,42,0.18),
                       0 0 0 5px rgba(${hexToRgb(p.color)},0.25),
                       0 0 38px ${p.color}88,
                       0 0 80px ${p.color}55`
                                        : held
                                          ? // Gold, never grey. Grey already
                                            // means "not in the car", and gold
                                            // is the app's attention-without-
                                            // danger hue — nowhere near the red
                                            // of End Voyage.
                                            `inset 0 0 0 3px var(--treasure-gold),
                       inset 0 -4px 0 rgba(93,63,42,0.18),
                       0 0 0 5px rgba(229,178,58,0.22),
                       0 4px 0 rgba(93,63,42,0.18)`
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
                                        {held && <PauseMark size={20} />}
                                    </div>
                                    {isActive && (
                                        <div className="mt-[2px] font-body text-[13px] font-medium italic tracking-[0.3px] text-black">
                                            מאזין/ה עכשיו
                                        </div>
                                    )}
                                    {held && (
                                        <div className="mt-[2px] font-body text-[13px] font-medium italic tracking-[0.3px] text-black">
                                            בהפסקה
                                        </div>
                                    )}
                                    {satOut && (
                                        <div className="font-body text-[15px] text-text-secondary">
                                            לא כאן היום
                                        </div>
                                    )}
                                </div>
                                {/* Music bars. On a break they do not vanish —
                                    they stop mid-height. The negative delay is
                                    what parks each bar part-way through its
                                    cycle instead of flat at 4px, so the shape
                                    reads as frozen rather than off. */}
                                {(isActive || held) && (
                                    <div
                                        aria-hidden="true"
                                        className="absolute bottom-3 flex h-[18px] items-end gap-[3px]"
                                        style={{ insetInlineEnd: 18 }}
                                    >
                                        {[0, 1, 2, 3].map((b) => (
                                            <span
                                                key={b}
                                                className="w-[3px] rounded-sm"
                                                style={{
                                                    background: held ? '#6B5836' : '#1a1a1a',
                                                    animation: `musicBar 900ms ${
                                                        held ? -(225 + b * 110) : b * 110
                                                    }ms ease-in-out infinite`,
                                                    animationPlayState: held
                                                        ? 'paused'
                                                        : 'running',
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {/* Per-pirate timer — mm:ss of seconds
                                    accumulated on this pirate. Placed on
                                    the opposite side of the music bars and
                                    horizontally aligned with them. Goes gold
                                    while held: the chip stops climbing, and
                                    that is the thing a parent checks. */}
                                {!satOut && (
                                    <div
                                        aria-label={`זמן האזנה של ${p.name}`}
                                        className="absolute bottom-3 flex h-[18px] items-center rounded-md px-[6px] font-body text-[11px] font-semibold tabular-nums text-text-primary"
                                        style={{
                                            insetInlineStart: 18,
                                            background: held
                                                ? 'var(--treasure-gold)'
                                                : 'rgba(251,241,220,0.85)',
                                            boxShadow: held
                                                ? 'inset 0 0 0 1px rgba(93,63,42,0.55)'
                                                : 'inset 0 0 0 1px rgba(93,63,42,0.35)',
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

                {/* Footer. The two controls sit at opposite ends on purpose:
                    End Voyage is one 1s hold from irreversible and this screen
                    is used in a moving car. In RTL the first child lands on the
                    leading (right) side. */}
                <div className="flex items-center justify-between gap-3 pt-2">
                    {/* End voyage — leading side */}
                    <div
                        className="relative h-14 w-[150px] cursor-pointer select-none overflow-hidden rounded-[14px] touch-none"
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
                            className="absolute inset-y-0 left-0 transition-[width] duration-[50ms]"
                            style={{
                                width: `${holdProgress * 100}%`,
                                background:
                                    'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.05)), var(--treasure-gold)',
                            }}
                        />
                        <div
                            className="absolute inset-0 flex flex-row-reverse items-center justify-center gap-2 font-body text-base font-semibold transition-colors duration-100"
                            style={{
                                color: 'var(--text-primary)',
                            }}
                        >
                            <span>סיימו הפלגה</span>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    animation:
                                        holdProgress === 0
                                            ? 'softPulse 1.8s ease-in-out infinite'
                                            : 'none',
                                    transformOrigin: 'center',
                                }}
                            >
                                <AnchorIcon size={22} color="#5D3F2A" />
                            </span>
                        </div>
                        <div
                            className="absolute -left-[2px] top-[10px] h-9 w-[6px] rounded-[3px] opacity-70"
                            style={{
                                background:
                                    'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)',
                            }}
                        />
                        <div
                            className="absolute -right-[2px] top-[10px] h-9 w-[6px] rounded-[3px] opacity-70"
                            style={{
                                background:
                                    'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)',
                            }}
                        />
                    </div>

                    {/* Break — trailing side. Labelled, because the tap-the-
                        glowing-pirate gesture is how you use it and this is how
                        you find out it exists. Goes gold while paused, where
                        resuming is the primary thing on screen. */}
                    <button
                        type="button"
                        disabled={!canToggle}
                        aria-pressed={paused}
                        onClick={onTogglePause}
                        className={`relative flex h-14 w-[150px] flex-row-reverse select-none items-center justify-center gap-2 rounded-[14px] border-none font-body text-base font-semibold text-text-primary transition-transform duration-100 ${
                            canToggle
                                ? 'cursor-pointer opacity-100 active:translate-y-[2px]'
                                : 'cursor-not-allowed opacity-50'
                        }`}
                        style={{
                            background: paused
                                ? `linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.05)),
                   var(--treasure-gold)`
                                : `linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.05)),
                   var(--wood-light)`,
                            boxShadow:
                                'inset 0 0 0 2px rgba(93,63,42,0.5), 0 3px 0 rgba(93,63,42,0.18)',
                        }}
                    >
                        <span>{paused ? 'המשיכו' : 'הפסקה'}</span>
                        {paused ? <PlayMark size={22} /> : <PauseMark size={22} />}
                    </button>
                </div>
            </div>
        </ScreenBackground>
    );
}
