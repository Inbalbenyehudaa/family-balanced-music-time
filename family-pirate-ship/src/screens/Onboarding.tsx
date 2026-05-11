import type { Pirate } from '../types';
import { PirateShip, PirateAvatar, FlagBadge } from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';

function OnboardingDots({ step }: { step: number }) {
    return (
        <div className="flex justify-center gap-2 py-4">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={`h-2 rounded transition-all duration-[240ms] ${
                        i === step ? 'w-[22px] bg-text-primary' : 'w-2 bg-[rgba(42,38,32,0.3)]'
                    }`}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Welcome
// ─────────────────────────────────────────────────────────────
export function ScreenWelcome({ onNext }: { onNext: () => void }) {
    return (
        <ScreenBackground variant="harbor">
            <div
                data-screen-label="01 Welcome"
                className="relative flex min-h-[100dvh] flex-col px-6 pb-8 pt-6"
            >
                <OnboardingDots step={0} />

                <div className="flex flex-1 items-center justify-center">
                    <div
                        className="flex flex-col items-center gap-4"
                        style={{ animation: 'bob 3s ease-in-out infinite' }}
                    >
                        <div style={{ width: 'clamp(220px, 55vw, 360px)' }}>
                            <PirateShip width={360} cargo={[0, 0, 0]} sailing={false} bobbing={false} />
                        </div>
                        <div
                            className="h-5 w-full max-w-[420px] rounded-sm"
                            style={{
                                background: 'linear-gradient(180deg, #A87B5A, #5D3F2A)',
                                boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                            }}
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <PlankButton onClick={onNext}>בואו נתחיל! ⚓</PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}

// ─────────────────────────────────────────────────────────────
// Names
// ─────────────────────────────────────────────────────────────
export function ScreenNames({
    pirates,
    setPirates,
    onNext,
    onSkip,
}: {
    pirates: Pirate[];
    setPirates: (p: Pirate[]) => void;
    onNext: () => void;
    onSkip: () => void;
}) {
    return (
        <ScreenBackground variant="parchment">
            <div
                data-screen-label="02 Names"
                className="relative flex min-h-[100dvh] flex-col px-5 pb-8 pt-6"
            >
                <OnboardingDots step={1} />
                <h2 className="mx-0 mb-2 mt-3 text-center font-display text-[26px] font-bold text-text-primary">
                    תנו שם לצוות שלכם
                </h2>
                <p className="mx-0 mb-[22px] mt-0 text-center text-base text-text-secondary">
                    כל פיראט מקבל דגל בצבע משלו
                </p>

                <div className="flex flex-col gap-[14px]">
                    {pirates.map((p, i) => (
                        <div
                            key={p.kind}
                            className="painted-shadow relative flex flex-row-reverse items-center gap-[14px] rounded-[20px] border-2 border-[rgba(93,63,42,0.25)] bg-surface-card px-[18px] py-4"
                        >
                            <PirateAvatar kind={p.kind} size={72} />
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 font-display text-sm font-semibold text-text-secondary">
                                    {p.role}
                                </div>
                                <input
                                    value={p.name}
                                    onChange={(e) => {
                                        const next = [...pirates];
                                        next[i] = { ...next[i], name: e.target.value };
                                        setPirates(next);
                                    }}
                                    className="w-full border-none border-b-2 border-b-[rgba(93,63,42,0.4)] bg-transparent px-[2px] py-1 text-right font-body text-[19px] font-medium text-text-primary outline-none"
                                    style={{ borderBottomStyle: 'dashed', direction: 'rtl' }}
                                />
                            </div>
                            <div className="absolute -left-[2px] -top-[6px]">
                                <FlagBadge color={p.color} size={26} waving />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto flex gap-[10px] pt-[22px]">
                    <PlankButton variant="cream" size="md" onClick={onSkip}>
                        דלג
                    </PlankButton>
                    <PlankButton onClick={onNext} size="md">
                        צא לדרך! ⚓
                    </PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}

// ─────────────────────────────────────────────────────────────
// Crew ready
// ─────────────────────────────────────────────────────────────
export function ScreenCrewReady({
    pirates,
    onNext,
}: {
    pirates: Pirate[];
    onNext: () => void;
}) {
    return (
        <ScreenBackground variant="harbor">
            <div
                data-screen-label="03 Crew Ready"
                className="relative flex min-h-[100dvh] flex-col items-center px-6 pb-8 pt-6"
            >
                <OnboardingDots step={2} />

                <h1
                    className="mx-0 mb-6 mt-4 text-center font-display text-[28px] font-bold text-text-primary sm:text-[32px]"
                    style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
                >
                    הצוות שלכם מוכן!
                </h1>

                <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="flex items-end justify-center gap-[14px]">
                        {pirates.map((p, i) => (
                            <div
                                key={p.kind}
                                className="flex flex-col items-center"
                                style={{
                                    transform: `translateY(${[0, -10, 0][i]}px) rotate(${[-3, 0, 3][i]}deg)`,
                                }}
                            >
                                <PirateAvatar kind={p.kind} size={92} />
                                <div className="mt-[6px] rounded-xl border-[1.5px] border-[rgba(93,63,42,0.3)] bg-sand-cream px-[10px] py-[2px] font-display text-base font-bold text-text-primary">
                                    {p.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="mt-4 h-[14px] w-full max-w-[320px]"
                        style={{
                            background: 'linear-gradient(180deg, #A87B5A, #5D3F2A)',
                            borderRadius: '50% 50% 6px 6px / 100% 100% 6px 6px',
                        }}
                    />
                </div>

                <div className="w-full max-w-md pt-6">
                    <PlankButton onClick={onNext}>🏴‍☠️ הפלגה חדשה</PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}
