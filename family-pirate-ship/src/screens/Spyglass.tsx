import type { ReactNode } from 'react';
import type { Pirate, Tier } from '../types';
import {
    PirateShip,
    PirateAvatar,
    FrostedBanner,
    AnchorIcon,
    SailingShipIcon,
    WaveIcon,
} from '../components/Art';
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
        if (m === 0) return 0;
        return Math.max(1, Math.round((m / max) * 7));
    });

    const tierIcon: Record<Tier, ReactNode> = {
        fair: <SailingShipIcon size={64} />,
        coastal: <WaveIcon size={64} />,
        harbor: <AnchorIcon size={64} color="#8C7A6B" />,
    };
    const tierText: Record<Tier, string> = {
        fair: 'רוח גבית! זמן האזנה שווה',
        coastal: 'הספינה קצת נטויה... אזנו את הזמן',
        harbor: 'מישהו משתלט, אתם לא זזים',
    };

    const activeIdx = [0, 1, 2].filter((i) => active[i]);
    const ltrIdx = [...activeIdx].reverse();
    const filteredCargo = ltrIdx.map((i) => stacks[i]);
    const filteredColors = ltrIdx.map((i) => pirates[i].color);

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
                        className="tap-feedback flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(251,241,220,0.9)] font-body text-[22px] font-bold text-wood-deep"
                        style={{
                            boxShadow:
                                '0 2px 0 rgba(93,63,42,0.35), 0 4px 12px rgba(0,0,0,0.18)',
                        }}
                    >
                        ✕
                    </button>
                    <div />
                </div>

                {/* Tier banner — icon leads, Hebrew text drops to a secondary line. */}
                <div className="mt-6 px-6">
                    <div style={{ width: 'min(280px, 80vw)', marginInline: 'auto' }}>
                        <FrostedBanner tier={tier}>
                            <span className="flex flex-col items-center gap-2 py-1">
                                {tierIcon[tier]}
                                <span className="text-center text-[13px] leading-tight">
                                    {tierText[tier]}
                                </span>
                            </span>
                        </FrostedBanner>
                    </div>
                </div>

                {/* Ship scene — bottom-anchored so the hull rides on the water foreground. */}
                <div className="relative flex flex-1 items-end justify-center pt-4 pb-0">
                    <div className="animate-fade-only relative" style={{ width: shipW }}>
                        <PirateShip
                            width={shipW}
                            cargo={filteredCargo}
                            colors={filteredColors}
                            sailing={tier === 'fair'}
                            sailsFull={tier === 'fair'}
                            bobbing
                        />
                        {/* Avatars float at a fixed position above the ship,
                            aligned to the mast pillars — same geometry as
                            Reveal. Anchored to the top of the ship (mast
                            tops at SVG y=12 in 400×290 viewBox = 4.138%);
                            avatar bottom sits 7px above that, so avatar top =
                            calc(4.138% − 7px − avatarSize). Constant
                            position regardless of cargo height; the cargo
                            stacks themselves show listening progress. */}
                        <div
                            className="pointer-events-none absolute inset-x-0 z-[4] flex justify-around"
                            style={{
                                top: `calc(4.138% - ${avatarSize + 7}px)`,
                                direction: 'ltr',
                            }}
                        >
                            {ltrIdx.map((i) => {
                                const p = pirates[i];
                                return (
                                    <div
                                        key={p.kind}
                                        className="flex w-[70px] justify-center"
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
