import type { Pirate } from '../types';
import { PirateShip, CompassIcon, MapIcon } from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';

export function ScreenHome({
    pirates,
    onNewVoyage,
    onMap,
    onSettings,
    islandsCount = 0,
}: {
    pirates: Pirate[];
    onNewVoyage: () => void;
    onMap: () => void;
    onSettings: () => void;
    islandsCount?: number;
}) {
    return (
        <ScreenBackground variant="harbor">
            <div
                data-screen-label="04 Home"
                className="relative flex min-h-[100dvh] flex-col px-6 pb-8 pt-4"
            >
                {/* Top row — map chip (RTL: start = right in flex-row-reverse) */}
                <div className="flex flex-row-reverse items-center justify-between">
                    <button
                        onClick={onSettings}
                        aria-label="הגדרות"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(251,241,220,0.85)]"
                        style={{
                            boxShadow:
                                '0 2px 6px rgba(93,63,42,0.25), inset 0 0 0 1.5px rgba(93,63,42,0.4)',
                        }}
                    >
                        <CompassIcon size={26} />
                    </button>

                    <button
                        onClick={onMap}
                        aria-label="פתח מפה"
                        className="flex cursor-pointer items-center gap-[6px] rounded-[20px] border-none bg-[rgba(251,241,220,0.85)] px-3 py-[6px] font-display text-base font-bold text-text-primary"
                        style={{
                            boxShadow:
                                '0 2px 6px rgba(93,63,42,0.25), inset 0 0 0 1.5px rgba(93,63,42,0.4)',
                        }}
                    >
                        <MapIcon size={20} /> {islandsCount} איים
                    </button>
                </div>

                {/* Ship — hero */}
                <div className="flex flex-1 items-center justify-center py-6">
                    <div
                        className="w-full"
                        style={{ maxWidth: 'min(100%, clamp(240px, 72vw, 420px))' }}
                    >
                        <PirateShip
                            width={420}
                            cargo={[0, 0, 0]}
                            colors={pirates.map((p) => p.color)}
                            sailing
                            bobbing
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-[14px]">
                    <PlankButton
                        onClick={onNewVoyage}
                        size="lg"
                        style={{ height: 72, fontSize: 24 }}
                    >
                        🏴‍☠️ הפלגה חדשה
                    </PlankButton>
                    <PlankButton
                        onClick={onMap}
                        variant="sand"
                        size="md"
                        style={{ height: 56 }}
                    >
                        🗺️ מפת האוצר
                    </PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}
