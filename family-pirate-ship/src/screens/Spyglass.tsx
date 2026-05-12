import type { ReactNode } from 'react';
import type { Pirate, Tier } from '../types';
import { PirateShip, PirateAvatar, FrostedBanner } from '../components/Art';
import { ScreenBackground } from '../components/ScreenBackground';
import { computeTier } from '../utils';

export function ScreenSpyglass({
    pirates,
    active,
    minutes,
    onClose,
}: {
    pirates: Pirate[];
    active: boolean[];
    minutes: number[];
    onClose: () => void;
}) {
    const activeMins = minutes.filter((_, i) => active[i]);
    const max = Math.max(...activeMins, 1);
    const tier = computeTier(minutes, active);
    const stacks = minutes.map((m, i) => {
        if (!active[i]) return 0;
        if (m === 0) return 1;
        return Math.max(1, Math.round((m / max) * 7));
    });

    const harborIcon = (
        <svg
            width="22"
            height="18"
            viewBox="0 0 28 22"
            className="ms-1 inline-block align-middle"
            aria-hidden="true"
        >
            <path
                d="M1 18 Q5 16 9 18 T17 18 T27 18"
                stroke="#3a6b7a"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
            />
            <rect x="2" y="11" width="14" height="3" fill="#5D3F2A" />
            <rect x="3.5" y="14" width="1.6" height="4" fill="#5D3F2A" />
            <rect x="13" y="14" width="1.6" height="4" fill="#5D3F2A" />
            <path
                d="M16 14 L26 14 L24 17 L18 17 Z"
                fill="#A87B5A"
                stroke="#5D3F2A"
                strokeWidth="0.8"
            />
            <rect x="20.4" y="7" width="0.9" height="7" fill="#5D3F2A" />
            <path d="M21.3 7 L24.5 11 L21.3 11 Z" fill="#FBF1DC" />
            <path d="M14 13 Q15.5 12.5 17 13.5" stroke="#5D3F2A" strokeWidth="0.7" fill="none" />
        </svg>
    );

    const bannerMap: Record<Tier, { tier: Tier; text: ReactNode }> = {
        fair: { tier: 'fair', text: 'רוח גבית! זמן האזנה שווה ⛵' },
        coastal: { tier: 'coastal', text: 'הספינה קצת נטויה... אזנו את הזמן 🌊' },
        harbor: {
            tier: 'harbor',
            text: (
                <span className="inline-flex items-center gap-[6px]">
                    <span>מישהו משתלט, אתם לא זזים</span>
                    {harborIcon}
                </span>
            ),
        },
    };
    const banner = bannerMap[tier];

    const activeIdx = [0, 1, 2].filter((i) => active[i]);
    const ltrIdx = [...activeIdx].reverse();
    const filteredCargo = ltrIdx.map((i) => stacks[i]);
    const filteredColors = ltrIdx.map((i) => pirates[i].color);
    const maxStack = Math.max(...filteredCargo, 0);

    const shipW = 340;
    const avatarSize = 56;

    return (
        <ScreenBackground variant="sky">
            <div
                data-screen-label="07 Spyglass"
                className="relative flex min-h-[100dvh] flex-col px-4 pb-0 pt-4 animate-fade-up"
            >
                {/* Top row — close button (leading = start; in RTL flex-row-reverse
                    "start" is the right edge. The original design put the X on the
                    left — keep parity by using plain flex-row here.) */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onClose}
                        aria-label="סגור"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(251,241,220,0.9)] font-body text-[22px] font-bold text-wood-deep"
                        style={{
                            boxShadow:
                                '0 2px 0 rgba(93,63,42,0.35), 0 4px 12px rgba(0,0,0,0.18)',
                        }}
                    >
                        ✕
                    </button>
                    <div />
                </div>

                {/* Tier banner */}
                <div className="mt-6 px-6">
                    <div style={{ width: 'min(260px, 75vw)', marginInline: 'auto' }}>
                        <FrostedBanner tier={banner.tier}>{banner.text}</FrostedBanner>
                    </div>
                </div>

                {/* Ship scene — centered in remaining space */}
                <div className="relative flex flex-1 items-center justify-center py-8">
                    <div className="animate-fade-only relative" style={{ width: shipW }}>
                        <PirateShip
                            width={shipW}
                            cargo={filteredCargo}
                            colors={filteredColors}
                            sailing={tier === 'fair'}
                            sailsFull={tier === 'fair'}
                            bobbing
                        />
                        {/* Avatars hover 5px above the tallest cargo stack,
                            aligned to the mast pillars — same geometry as
                            Reveal. Cargo stack height: max(22, count*18+4). */}
                        <div
                            className="pointer-events-none absolute inset-x-0 z-[4] flex justify-around"
                            style={{ bottom: '34%', direction: 'ltr' }}
                        >
                            {ltrIdx.map((i) => {
                                const p = pirates[i];
                                return (
                                    <div
                                        key={p.kind}
                                        className="flex w-[70px] justify-center"
                                        style={{
                                            transform: `translateY(-${maxStack * 18 + 4 + 5 + avatarSize}px)`,
                                        }}
                                    >
                                        <PirateAvatar kind={p.kind} size={avatarSize} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Water foreground */}
                <div
                    className="relative h-[100px]"
                    style={{
                        background:
                            'linear-gradient(0deg, #1E5F7A 0%, #2E7794 70%, transparent 100%)',
                    }}
                >
                    <svg
                        viewBox="0 0 400 60"
                        preserveAspectRatio="none"
                        className="absolute inset-x-0 -top-5 h-10 w-full opacity-50"
                    >
                        <path
                            d="M0 30 Q 50 18 100 30 T 200 30 T 300 30 T 400 30 V60 H0 Z"
                            fill="#C5E0E8"
                        />
                    </svg>
                </div>
            </div>
        </ScreenBackground>
    );
}
