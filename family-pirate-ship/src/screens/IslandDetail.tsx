import type { Drive, Island } from '../types';
import { IslandIllustration } from '../components/Art';
import { Stat } from './Map';

export function ScreenIslandDetail({
    island,
    drives,
    onClose,
}: {
    island: Island | null;
    drives: Drive[];
    onClose: () => void;
}) {
    if (!island) return null;
    const unlockDrive = drives.find((d) => d.islandId === island.id);
    const dateValue =
        unlockDrive?.startedAt != null
            ? new Date(unlockDrive.startedAt).toLocaleDateString('he-IL')
            : unlockDrive?.date;
    const voyageValue =
        unlockDrive?.totalMin != null ? `${unlockDrive.totalMin} דק׳` : undefined;
    return (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-[rgba(30,40,50,0.55)]"
            />
            <div
                data-screen-label="10 Island Detail"
                className="tex-grain relative z-10 h-[70dvh] w-full max-w-[560px] animate-slide-up overflow-y-auto rounded-t-[28px] bg-[rgba(240,212,155,0.97)] px-[22px] py-5 sm:h-auto sm:max-h-[85dvh] sm:rounded-[28px]"
            >
                <div className="mx-auto mb-2 h-[5px] w-11 rounded bg-[rgba(93,63,42,0.4)] sm:hidden" />
                <button
                    onClick={onClose}
                    className="absolute left-4 top-[18px] cursor-pointer border-none bg-transparent text-[22px] text-text-primary"
                >
                    ✕
                </button>
                <h2 className="mx-0 mb-1 mt-2 text-center font-map text-[26px] font-bold text-text-primary">
                    {island.name}
                </h2>
                <div className="my-[10px] flex justify-center text-center">
                    <IslandIllustration island={island} size={180} showLabel={false} />
                </div>
                <p className="px-3 text-center font-body text-[17px] leading-[1.5] text-text-primary">
                    {island.description}
                </p>
                {(dateValue || voyageValue) && (
                    <div className="mt-4 rounded-2xl border-[1.5px] border-dashed border-[rgba(93,63,42,0.3)] bg-[rgba(251,241,220,0.6)] p-[14px]">
                        {dateValue && <Stat label="התגלה ב" value={dateValue} />}
                        {voyageValue && <Stat label="זמן נסיעה" value={voyageValue} />}
                    </div>
                )}
            </div>
        </div>
    );
}
