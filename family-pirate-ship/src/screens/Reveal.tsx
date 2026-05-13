import { useEffect, useState } from 'react';
import type { Pirate, Island, CoastalFind } from '../types';
import {
    PirateShip,
    PirateAvatar,
    FrostedBanner,
    IslandIllustration,
    CoastalFindIcon,
    AnchorIcon,
} from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { computeTier } from '../utils';

function TinyIslandIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#5FA8C7" opacity="0.35" />
            <path d="M4 16 Q12 9 20 16 L20 18 L4 18 Z" fill="#F0D49B" />
            <path d="M13 14 L13 8 M13 8 Q11 8.5 10 10 M13 8 Q15 8.5 16 10" stroke="#3F7A3F" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
    );
}

function WaveIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 13 Q6 9 10 13 T18 13 T22 13" stroke="#5FA8C7" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M2 17 Q6 13 10 17 T18 17 T22 17" stroke="#5FA8C7" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
}

export function ScreenReveal({
    pirates,
    active,
    minutes,
    onDone,
    unlockIsland,
    coastalFind,
}: {
    pirates: Pirate[];
    active: boolean[];
    minutes: number[];
    onDone: () => void;
    unlockIsland: Island | null;
    coastalFind: CoastalFind | null;
}) {
    const tier = computeTier(minutes, active);
    const [stage, setStage] = useState(0);
    const [outcomeSize, setOutcomeSize] = useState(160);

    useEffect(() => {
        const timers = [
            setTimeout(() => setStage(1), 1500),
            setTimeout(() => setStage(2), 2200),
            setTimeout(() => setStage(3), 3000),
            setTimeout(() => setStage(4), 3800),
            setTimeout(() => setStage(5), 5800),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        const update = () => {
            const vw = window.innerWidth;
            setOutcomeSize(Math.max(140, Math.min(170, vw * 0.42)));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const max = Math.max(...minutes, 1);
    const stacks = minutes.map((m) => Math.max(0, Math.round((m / max) * 8)));

    const activeIdx = [0, 1, 2].filter((i) => active[i]);
    const ltrIdx = [...activeIdx].reverse();
    const filteredCargo = ltrIdx.map((i) => (stage >= 2 ? stacks[i] : 0));
    const filteredColors = ltrIdx.map((i) => pirates[i].color);

    return (
        <div
            data-screen-label="08 Reveal"
            className="relative min-h-[100dvh] overflow-hidden bg-[#1E1612]"
        >
            {/* Harbor scene does the iris-in on stage >= 1 */}
            <div
                className="absolute inset-0"
                style={{ animation: stage >= 1 ? 'irisIn 1500ms ease-in-out' : 'none' }}
            >
                <ScreenBackground variant="harbor">
                    <div className="min-h-[100dvh]" />
                </ScreenBackground>
            </div>

            {stage === 0 && <div className="absolute inset-0 bg-[#1E1612]" />}

            {/* Stage 1 title */}
            {stage >= 1 && stage < 3 && (
                <div
                    className="absolute inset-x-0 z-[5] text-center"
                    style={{
                        top: 'clamp(80px, 15vh, 150px)',
                        animation: 'splash 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    <div
                        className="inline-block rounded-3xl border-[3px] border-wood-deep bg-treasure-gold px-8 py-[18px]"
                        style={{
                            transform: 'rotate(-2deg)',
                            boxShadow:
                                '0 8px 0 rgba(93,63,42,0.5), 0 12px 30px rgba(0,0,0,0.4)',
                        }}
                    >
                        <div
                            className="font-display text-4xl font-bold text-text-primary"
                            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
                        >
                            סוף ההפלגה!
                        </div>
                    </div>
                </div>
            )}

            {/* Ship layer — anchored near bottom */}
            {stage >= 2 && (
                <div
                    className="absolute inset-x-0"
                    style={{
                        bottom: 'clamp(80px, 14dvh, 180px)',
                        animation: 'fadeUp 600ms',
                    }}
                >
                    <div className="flex justify-center">
                        <div className="relative" style={{ width: 'min(340px, 90vw)' }}>
                            <PirateShip
                                width={340}
                                cargo={filteredCargo}
                                colors={filteredColors}
                                sailing={stage >= 2 && tier === 'fair'}
                                sailsFull={stage >= 2 && tier === 'fair'}
                                bobbing={stage < 4}
                            />
                            {/* Avatars float above the ship's top edge.
                                Top of ship art (center-mast flag) is at
                                SVG y=12 within a 400×290 viewBox, which
                                maps to 12/290 ≈ 4.138% of the ship
                                container's height. Avatar bottom sits
                                ≥7px above that, so avatar top =
                                (4.138% of container height) − 7px − 56px
                                (avatar size) = calc(4.138% − 63px). */}
                            <div
                                className="pointer-events-none absolute inset-x-0 flex justify-around"
                                style={{
                                    top: 'calc(4.138% - 63px)',
                                    direction: 'ltr',
                                    animation: 'fadeUp 500ms ease-out',
                                }}
                            >
                                {ltrIdx.map((i) => {
                                    const p = pirates[i];
                                    return (
                                        <div
                                            key={p.kind}
                                            className="flex w-[70px] justify-center"
                                        >
                                            <PirateAvatar kind={p.kind} size={56} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Verdict banner */}
            {stage >= 4 && (
                <div
                    className="absolute inset-x-0 z-[6] flex justify-center"
                    style={{
                        top: 'clamp(16px, 3.5vh, 40px)',
                        animation: 'fadeUp 700ms',
                    }}
                >
                    <div style={{ width: 'min(260px, 75vw)' }}>
                    <FrostedBanner tier={tier}>
                        <span className="inline-flex flex-row-reverse items-center justify-center gap-2">
                            {tier === 'fair' && (
                                <>
                                    <span>האזנה משותפת - אי חדש התגלה!</span>
                                    <TinyIslandIcon size={24} />
                                </>
                            )}
                            {tier === 'coastal' && (
                                <>
                                    <span>האזנה קצת נטויה - מצאתם משהו על החוף!</span>
                                    <WaveIcon size={24} />
                                </>
                            )}
                            {tier === 'harbor' && (
                                <span>נתקעתם בנמל - נסו לחלוק יותר פעם הבאה</span>
                            )}
                        </span>
                    </FrostedBanner>
                    </div>
                </div>
            )}

            {/* Fair — unlock reveal */}
            {stage >= 4 && tier === 'fair' && unlockIsland && (
                <div
                    className="absolute inset-x-0 flex justify-center"
                    style={{
                        top: 'clamp(81px, 19vh, 171px)',
                        animation: 'fadeUp 1200ms ease-out 800ms backwards',
                    }}
                >
                    <div className="relative">
                        <div
                            className="absolute -inset-5 rounded-full"
                            style={{
                                background:
                                    'radial-gradient(circle, rgba(197,224,232,0.95) 30%, transparent 80%)',
                                animation: 'fogClear 2000ms ease-out 1000ms forwards',
                            }}
                        />
                        <IslandIllustration island={unlockIsland} size={outcomeSize} />
                    </div>
                </div>
            )}

            {/* Coastal find */}
            {stage >= 4 && tier === 'coastal' && coastalFind && (
                <div
                    className="absolute inset-x-0 flex justify-center"
                    style={{
                        top: 'clamp(81px, 19vh, 171px)',
                        animation: 'fadeUp 1200ms ease-out 600ms backwards',
                    }}
                >
                    <CoastalFindIcon find={coastalFind} size={outcomeSize} />
                </div>
            )}

            {/* Save button */}
            {stage >= 5 && (
                <div
                    className="absolute inset-x-6 z-10"
                    style={{
                        bottom: 'clamp(24px, 5vh, 56px)',
                        animation: 'fadeUp 500ms ease-out',
                    }}
                >
                    <PlankButton onClick={onDone}>
                        <span className="inline-flex flex-row-reverse items-center gap-2">
                            <span>שמור והתחל</span>
                            <AnchorIcon size={22} color="#5D3F2A" />
                        </span>
                    </PlankButton>
                </div>
            )}
        </div>
    );
}
