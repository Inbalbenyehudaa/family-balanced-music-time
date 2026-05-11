import { PlankButton } from '../components/PlankButton';

export function ConfirmEnd({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div onClick={onNo} className="absolute inset-0 bg-[rgba(30,40,50,0.6)]" />
            <div
                className="tex-grain relative z-10 w-full max-w-[420px] rounded-[20px] border-[3px] border-wood-deep bg-sand-cream p-6 text-center"
                style={{
                    animation: 'splash 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
            >
                <div className="mb-[10px] text-[40px]">⚓</div>
                <h3 className="mx-0 mb-[18px] mt-0 font-display text-2xl font-bold">
                    לסיים את ההפלגה?
                </h3>
                <div className="flex flex-row-reverse gap-[10px]">
                    <PlankButton onClick={onYes} size="md">
                        כן
                    </PlankButton>
                    <PlankButton onClick={onNo} variant="cream" size="md">
                        לא
                    </PlankButton>
                </div>
            </div>
        </div>
    );
}
