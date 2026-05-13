import { useState } from 'react';
import type { Island, Drive } from '../types';
import { CompassIcon, ISLAND_IMAGES, PirateShip } from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { ISLANDS } from '../data';

export function ScreenMap({
    unlockedIds,
    onBack,
    onIslandTap,
    drives = [],
}: {
    unlockedIds: string[];
    onBack: () => void;
    onIslandTap: (isl: Island) => void;
    drives?: Drive[];
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const COLS = 3;
    const ROWS = 5;
    const FIELD_LEFT = 10;
    const FIELD_TOP = 14;
    const FIELD_WIDTH = 78;
    const FIELD_HEIGHT = 72;

    const positions = ISLANDS.map((isl, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cellW = FIELD_WIDTH / COLS;
        const cellH = FIELD_HEIGHT / ROWS;
        const seed =
            isl.id.charCodeAt(0) + isl.id.charCodeAt(isl.id.length - 1) * 7 + i * 13;
        const jitterX = ((seed % 11) - 5) * 0.9;
        const jitterY = (((seed * 3) % 11) - 5) * 0.7;
        const rowOffset = row % 2 === 1 ? cellW * 0.35 : 0;
        const rotation = ((seed * 7) % 11) - 5;
        return {
            ...isl,
            x: FIELD_LEFT + col * cellW + cellW / 2 + jitterX + rowOffset,
            y: FIELD_TOP + row * cellH + cellH / 2 + jitterY,
            rotation,
        };
    });

    return (
        <ScreenBackground variant="map">
            <div
                data-screen-label="09 Treasure Map"
                className="relative flex min-h-[100dvh] flex-col px-6 pb-6 pt-4"
            >
                {/* Aged vignette + watercolor sea — absolute overlay */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        boxShadow:
                            'inset 0 0 60px rgba(93,63,42,0.4), inset 0 0 200px rgba(93,63,42,0.18)',
                    }}
                />
                <div
                    className="absolute inset-8 rounded-xl"
                    style={{
                        background:
                            'radial-gradient(ellipse at 60% 40%, rgba(95,168,199,0.35), transparent 80%)',
                    }}
                />

                {/* Top row: compass + stats chip */}
                <div className="relative z-[1] flex flex-row-reverse items-center justify-between">
                    <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="flex min-h-11 cursor-pointer items-center rounded-2xl border-2 border-[rgba(93,63,42,0.4)] bg-sand-cream px-[14px] py-2 font-display text-sm font-bold text-text-primary"
                        style={{ boxShadow: '0 3px 0 rgba(93,63,42,0.18)' }}
                    >
                        📜 הסטטיסטיקה
                    </button>
                    <CompassIcon size={50} />
                </div>

                {drawerOpen && (
                    <div
                        className="tex-grain absolute right-6 top-[72px] z-[2] w-[220px] animate-fade-up rounded-2xl border-2 border-[rgba(93,63,42,0.4)] bg-sand-cream p-[14px] font-body"
                        style={{ boxShadow: '0 6px 14px rgba(93,63,42,0.3)' }}
                    >
                        <Stat label="איים שהתגלו" value={unlockedIds.length} />
                        <Stat
                            label="מציאות חוף"
                            value={drives.filter((d) => d.tier === 'coastal').length}
                        />
                        <Stat label="הפלגות בסך הכל" value={drives.length} />
                    </div>
                )}

                {/* Island field — flexible, uses % for positioning so it scales */}
                <div className="relative flex-1">
                    {positions.map((isl) => {
                        const unlocked = unlockedIds.includes(isl.id);
                        return (
                            <button
                                key={isl.id}
                                onClick={() => (unlocked ? onIslandTap(isl) : null)}
                                className={`absolute border-none bg-transparent p-0 ${
                                    unlocked ? 'cursor-pointer' : 'cursor-default'
                                }`}
                                style={{
                                    left: `${isl.x}%`,
                                    top: `${isl.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${isl.rotation}deg)`,
                                }}
                            >
                                {unlocked ? (
                                    <div className="relative h-16 w-16 animate-soft-pulse">
                                        <div
                                            className="h-16 w-16 overflow-hidden rounded-full bg-[#C5E0E8]"
                                            style={{ boxShadow: '0 2px 4px rgba(93,63,42,0.3)' }}
                                        >
                                            <img
                                                src={ISLAND_IMAGES[isl.id]}
                                                alt={isl.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute left-1/2 top-full mt-[2px] -translate-x-1/2 whitespace-nowrap font-map text-[11px] font-bold text-wood-deep">
                                            {isl.name}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="h-14 w-14 rounded-full border-[1.5px] border-dashed border-[rgba(93,63,42,0.4)] bg-[rgba(197,224,232,0.85)]"
                                        style={{ filter: 'blur(1px)' }}
                                    />
                                )}
                            </button>
                        );
                    })}

                    {/* Home harbor marker */}
                    <div className="absolute bottom-2 right-2">
                        <PirateShip width={68} cargo={[0, 0, 0]} bobbing />
                        <div className="text-center font-map text-[11px] font-bold text-wood-deep">
                            הנמל שלנו
                        </div>
                    </div>
                </div>

                {/* Back button */}
                <div className="relative z-[1] pt-4">
                    <PlankButton onClick={onBack} variant="sand">
                        חזרה לנמל ←
                    </PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex justify-between border-b border-dashed border-[rgba(93,63,42,0.25)] py-[6px]">
            <span className="text-sm text-text-secondary">{label}</span>
            <span className="font-display text-lg font-bold">{value}</span>
        </div>
    );
}
