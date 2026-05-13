import { useLayoutEffect, useRef, useState } from 'react';
import type { Island, Drive } from '../types';
import { CompassIcon, ISLAND_IMAGES, LockIcon, PirateShip } from '../components/Art';
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

    // Measure the island-field container so placement is responsive.
    // We position in pixels (not %) because each island is a fixed-px
    // element — scaling % positions across screen widths makes labels
    // clip the edge and overlap the harbor on smaller phones.
    const fieldRef = useRef<HTMLDivElement>(null);
    const [fieldSize, setFieldSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const el = fieldRef.current;
        if (!el) return;
        const update = () =>
            setFieldSize({ width: el.clientWidth, height: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Layout constants — pixel-based, derived from the actual island visuals:
    // ISLAND_RADIUS  half of h-16 w-16 unlocked island
    // LABEL_BELOW    name label sits ~16px below the circle
    // ROT_PAD        circles rotate ±5deg, leave a small buffer
    // HARBOR_W/H     reserved bottom-right zone for home harbor + label
    // MIN_DIST       minimum center-to-center spacing between any two islands
    const ISLAND_RADIUS = 32;
    const LABEL_BELOW = 18;
    const ROT_PAD = 6;
    const HARBOR_W = 96;
    const HARBOR_H = 100;
    const MIN_DIST = 78;

    const seedFor = (s: string, salt: number) => {
        let h = 2166136261 ^ salt;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        }
        return (h >>> 0) / 4294967296;
    };

    const positions =
        fieldSize.width > 0 && fieldSize.height > 0
            ? ISLANDS.reduce<Array<Island & { x: number; y: number; rotation: number }>>(
                  (acc, isl) => {
                      const minX = ISLAND_RADIUS + ROT_PAD;
                      const maxX = fieldSize.width - ISLAND_RADIUS - ROT_PAD;
                      const minY = ISLAND_RADIUS + ROT_PAD;
                      const maxY =
                          fieldSize.height - ISLAND_RADIUS - LABEL_BELOW - ROT_PAD;
                      const harborMinX = fieldSize.width - HARBOR_W;
                      const harborMinY = fieldSize.height - HARBOR_H;
                      // If the screen is so small the bounds cross, skip — render no islands rather than overflow.
                      if (maxX <= minX || maxY <= minY) return acc;
                      for (let attempt = 0; attempt < 300; attempt++) {
                          const x = minX + seedFor(isl.id, attempt * 2 + 1) * (maxX - minX);
                          const y = minY + seedFor(isl.id, attempt * 2 + 2) * (maxY - minY);
                          // Reserve the bottom-right harbor zone.
                          if (x > harborMinX && y > harborMinY) continue;
                          const collides = acc.some(
                              (p) => Math.hypot(x - p.x, y - p.y) < MIN_DIST,
                          );
                          if (!collides || attempt === 299) {
                              const rotSeed = seedFor(isl.id, 9999);
                              acc.push({ ...isl, x, y, rotation: rotSeed * 10 - 5 });
                              return acc;
                          }
                      }
                      return acc;
                  },
                  [],
              )
            : [];

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
                        className="tex-grain right-6 top-[72px] z-[2] w-[220px] animate-fade-up rounded-2xl border-2 border-[rgba(93,63,42,0.4)] bg-sand-cream p-[14px] font-body"
                        style={{
                            position: 'absolute',
                            boxShadow: '0 6px 14px rgba(93,63,42,0.3)',
                        }}
                    >
                        <Stat label="איים שהתגלו" value={unlockedIds.length} />
                        <Stat
                            label="מציאות חוף"
                            value={drives.filter((d) => d.tier === 'coastal').length}
                        />
                        <Stat label="הפלגות בסך הכל" value={drives.length} />
                    </div>
                )}

                {/* Island field — measured in pixels so placement is responsive. */}
                <div ref={fieldRef} className="relative flex-1">
                    {positions.map((isl) => {
                        const unlocked = unlockedIds.includes(isl.id);
                        return (
                            <button
                                key={isl.id}
                                onClick={() => (unlocked ? onIslandTap(isl) : null)}
                                className={`island-tap absolute border-none bg-transparent p-0 ${
                                    unlocked ? 'cursor-pointer' : 'cursor-default'
                                }`}
                                style={{
                                    left: `${isl.x}px`,
                                    top: `${isl.y}px`,
                                    transform: `translate(-50%, -50%) rotate(${isl.rotation}deg)`,
                                }}
                            >
                                {unlocked ? (
                                    <div className="island-tap-inner relative h-16 w-16 animate-soft-pulse">
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
                                    <div className="relative h-14 w-14">
                                        <div
                                            className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-[rgba(93,63,42,0.4)] bg-[rgba(197,224,232,0.85)]"
                                            style={{ filter: 'blur(1px)' }}
                                        />
                                        <div
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ opacity: 0.7 }}
                                        >
                                            <LockIcon size={22} />
                                        </div>
                                    </div>
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
