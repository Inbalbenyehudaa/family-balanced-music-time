import { useState } from 'react';
import type { Pirate } from '../types';
import { PirateAvatar, FlagBadge } from '../components/Art';
import { PlankButton } from '../components/PlankButton';

export function ScreenRollCall({
    pirates,
    onCancel,
    onSetSail,
}: {
    pirates: Pirate[];
    onCancel: () => void;
    onSetSail: (active: boolean[]) => void;
}) {
    const [active, setActive] = useState<boolean[]>(pirates.map(() => true));
    const [wakeKey, setWakeKey] = useState<number[]>(pirates.map(() => 0));
    const count = active.filter(Boolean).length;
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <div
                onClick={onCancel}
                className="absolute inset-0 animate-fade-up bg-[rgba(30,40,50,0.55)]"
            />
            <div
                data-screen-label="05 Roll Call"
                className="tex-grain relative z-10 w-full max-w-[560px] animate-slide-up rounded-t-[28px] bg-[rgba(240,212,155,0.97)] px-5 pb-[38px] pt-5 sm:mx-4 sm:rounded-[28px] sm:pb-6"
                style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}
            >
                <div
                    className="mb-[14px] h-2 rounded"
                    style={{
                        background:
                            'repeating-linear-gradient(45deg, #A87B5A 0 6px, #5D3F2A 6px 12px)',
                    }}
                />
                <div className="mx-auto mb-[14px] h-[5px] w-11 rounded bg-[rgba(93,63,42,0.4)] sm:hidden" />
                <h2 className="mx-0 mb-[18px] mt-0 text-center font-display text-[26px] font-bold text-text-primary">
                    מי בנסיעה היום?
                </h2>
                {pirates.map((p, i) => (
                    <div
                        key={p.kind}
                        className={`painted-shadow relative mb-[10px] flex flex-row-reverse items-center gap-3 rounded-[18px] border-2 border-[rgba(93,63,42,0.25)] bg-surface-card px-[14px] py-3 ${
                            active[i] ? 'opacity-100' : 'opacity-75'
                        }`}
                    >
                        <span
                            key={wakeKey[i]}
                            style={{
                                display: 'inline-flex',
                                animation:
                                    active[i] && wakeKey[i] > 0
                                        ? 'wakePop 360ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        : 'none',
                                transformOrigin: 'center',
                            }}
                        >
                            <PirateAvatar kind={p.kind} size={64} sleeping={!active[i]} />
                        </span>
                        <div className="flex-1">
                            <div className="font-display text-xl font-bold text-text-primary">
                                {p.name}
                            </div>
                            <div className="font-body text-sm text-text-secondary">
                                {active[i] ? 'בפנים!' : 'לא כאן'}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const next = [...active];
                                const wasOff = !next[i];
                                next[i] = !next[i];
                                setActive(next);
                                if (wasOff) {
                                    const nextWake = [...wakeKey];
                                    nextWake[i] = nextWake[i] + 1;
                                    setWakeKey(nextWake);
                                }
                            }}
                            aria-label={`${active[i] ? 'הסר' : 'הוסף'} ${p.name} מהפלגה`}
                            className="relative h-10 w-[76px] cursor-pointer rounded-[22px] border-none transition-colors duration-200"
                            style={{
                                background: active[i] ? p.color : '#C0B5A6',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25)',
                            }}
                        >
                            <div
                                className="absolute top-1 h-8 w-8 rounded-2xl bg-surface-card"
                                style={{
                                    left: active[i] ? 4 : 40,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    transition: 'left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                            />
                        </button>
                        <div className="absolute right-2 -top-1">
                            <FlagBadge color={p.color} size={20} waving={active[i]} />
                        </div>
                    </div>
                ))}

                <div className="mt-[14px]">
                    {count === 0 && (
                        <div className="mb-[10px] text-center font-body text-[15px] font-semibold text-treasure-red">
                            אף אחד לא מפליג? בלתי אפשרי! 🤨
                        </div>
                    )}
                    <PlankButton onClick={() => onSetSail(active)} disabled={count === 0}>
                        ⚓ מפליגים!
                    </PlankButton>
                </div>
            </div>
        </div>
    );
}
