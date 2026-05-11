import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
    Drive,
    FamilyMember,
    PendingInvite,
    Pirate,
    TweakValues,
} from '../types';
import { PirateAvatar, FlagBadge } from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';

// ─────────────────────────────────────────────────────────────
// Math Gate
// ─────────────────────────────────────────────────────────────
export function ScreenMathGate({
    onPass,
    onCancel,
}: {
    onPass: () => void;
    onCancel: () => void;
}) {
    const [a] = useState(() => 2 + Math.floor(Math.random() * 6));
    const [b] = useState(() => 2 + Math.floor(Math.random() * 6));
    const [val, setVal] = useState('');
    const correct = a + b;
    const wrong = val !== '' && parseInt(val) !== correct;
    return (
        <ScreenBackground variant="parchment">
            <div
                data-screen-label="11 Math Gate"
                className="relative flex min-h-[100dvh] flex-col px-7 pb-8 pt-4"
            >
                <div className="flex flex-row-reverse items-center">
                    <button
                        onClick={onCancel}
                        className="cursor-pointer border-none bg-transparent font-body text-lg text-text-primary"
                    >
                        ← חזרה
                    </button>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-6">
                    <div className="text-center">
                        <h2 className="mx-0 mb-[6px] mt-0 font-display text-2xl font-bold text-text-primary">
                            הגדרות הורים
                        </h2>
                        <p className="text-text-secondary">רק לקפטנים בוגרים — נא לפתור:</p>
                    </div>

                    <div
                        className="text-center font-display text-[56px] font-bold text-text-primary"
                        style={{ fontSize: 'clamp(40px, 12vw, 72px)' }}
                    >
                        {a} + {b} = ?
                    </div>

                    <input
                        type="number"
                        inputMode="numeric"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        placeholder="?"
                        className="h-16 w-full max-w-xs rounded-[18px] bg-surface-card text-center font-display text-[32px] font-bold text-text-primary outline-none"
                        style={{
                            border: `3px solid ${wrong ? 'var(--treasure-red)' : 'rgba(93,63,42,0.4)'}`,
                        }}
                    />
                </div>

                <div className="pt-4">
                    <PlankButton
                        onClick={() => (parseInt(val) === correct ? onPass() : null)}
                        disabled={parseInt(val) !== correct}
                    >
                        המשך
                    </PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}

// ─────────────────────────────────────────────────────────────
// Settings Form
// ─────────────────────────────────────────────────────────────
export interface SettingsValues extends TweakValues {
    pirates: Pirate[];
}

export interface FamilySectionProps {
    familyName: string;
    members: FamilyMember[];
    currentUserId: string;
    isOwner: boolean;
    pendingInvites: PendingInvite[];
    memberCap: number;
    onInvite: (email: string) => Promise<void>;
    onRevokeInvite: (inviteId: string) => Promise<void>;
    onRemoveMember: (userId: string) => Promise<void>;
}

export function ScreenSettings({
    onBack,
    settings,
    setSettings,
    drives,
    onReset,
    onSavePirates,
    familySection,
}: {
    onBack: () => void;
    settings: SettingsValues;
    setSettings: (s: SettingsValues) => void;
    drives: Drive[];
    onReset: () => void;
    onSavePirates?: (pirates: Pirate[]) => void;
    familySection?: FamilySectionProps;
}) {
    const [localPirates, setLocalPirates] = useState<Pirate[]>(settings.pirates);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        setLocalPirates(settings.pirates);
    }, [settings.pirates]);

    const piratesDirty = localPirates.some(
        (p, i) => p.name !== (settings.pirates[i]?.name ?? ''),
    );

    const handleSavePirates = () => {
        if (!piratesDirty) return;
        onSavePirates?.(localPirates);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);
    };
    return (
        <ScreenBackground variant="parchment">
            <div
                data-screen-label="12 Settings"
                className="relative flex min-h-[100dvh] flex-col px-4 pb-8 pt-4"
            >
                <div className="flex flex-row-reverse items-center justify-between">
                    <button
                        onClick={onBack}
                        className="cursor-pointer border-none bg-transparent font-body text-[17px] text-text-primary"
                    >
                        ← חזרה
                    </button>
                    <h2 className="font-display text-[22px] font-bold">הגדרות הורים</h2>
                </div>

                <div className="mt-4 flex flex-col gap-[14px]">
                    {familySection && <FamilySection {...familySection} />}

                    <SettingsSection title="ספים לאיזון">
                        <SettingSlider
                            label="סף רוח גבית - האזנה שווה בין הורים וילדים"
                            min={0.5}
                            max={0.7}
                            step={0.01}
                            value={settings.fairThreshold}
                            onChange={(v) => setSettings({ ...settings, fairThreshold: v })}
                            format={(v) => `≤ ${Math.round(v * 100)}% חלק הגדול`}
                        />
                        <SettingSlider
                            label="סף נמל - רק אחד רוב הזמן"
                            min={0.7}
                            max={0.9}
                            step={0.01}
                            value={settings.harborThreshold}
                            onChange={(v) => setSettings({ ...settings, harborThreshold: v })}
                            format={(v) => `> ${Math.round(v * 100)}%`}
                        />
                    </SettingsSection>

                    <SettingsSection title="כללי">
                        <SettingToggle
                            label="🔊 צלילים"
                            value={settings.audio}
                            onChange={(v) => setSettings({ ...settings, audio: v })}
                        />
                        <SettingToggle
                            label="🌫️ ערפל על איים בלתי מגולים"
                            value={settings.fog}
                            onChange={(v) => setSettings({ ...settings, fog: v })}
                        />
                    </SettingsSection>

                    <SettingsSection title="היסטוריה">
                        {drives.length === 0 ? (
                            <div className="py-[14px] text-center text-text-secondary">
                                אין הפלגות עדיין
                            </div>
                        ) : (
                            drives
                                .slice(-5)
                                .reverse()
                                .map((d, i) => {
                                    const tierLabel =
                                        d.tier === 'fair'
                                            ? '🌞 רוח גבית'
                                            : d.tier === 'coastal'
                                              ? '🌊 חוף'
                                              : '⚓ נמל';
                                    const topIdx = d.perPirate.reduce(
                                        (best, min, idx) =>
                                            min > d.perPirate[best] ? idx : best,
                                        0,
                                    );
                                    const topPirate = settings.pirates[topIdx];
                                    // Show the max-listener chip even when
                                    // per-pirate rounds to 0 minutes, as long
                                    // as someone listened (totalMin > 0 OR
                                    // any of perPirate > 0). Display falls
                                    // back to "<1 דק׳" below.
                                    const hasMax =
                                        d.perPirate.length > 0 &&
                                        d.perPirate.some((m) => m > 0) &&
                                        topPirate;
                                    return (
                                        <div
                                            key={i}
                                            className="flex flex-row-reverse items-center justify-between gap-3 border-b border-dashed border-[rgba(93,63,42,0.25)] px-3 py-[10px] font-body text-sm"
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-text-primary">
                                                    {tierLabel}
                                                </span>
                                                <span className="text-xs text-text-secondary">
                                                    {d.date} ·{' '}
                                                    {d.totalMin < 1
                                                        ? '<1 דק׳'
                                                        : `${d.totalMin} דק׳`}
                                                </span>
                                            </div>
                                            {hasMax && (
                                                <div className="flex flex-row-reverse items-center gap-[6px] text-xs text-text-secondary">
                                                    <FlagBadge
                                                        color={topPirate.color}
                                                        size={14}
                                                    />
                                                    <span>
                                                        {topPirate.name} ({d.perPirate[topIdx]} דק׳)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                        )}
                    </SettingsSection>

                    <SettingsSection title="עריכת הצוות">
                        {localPirates.map((p, i) => (
                            <div
                                key={p.kind}
                                className="flex flex-row-reverse items-center gap-[10px] py-2"
                            >
                                <PirateAvatar kind={p.kind} size={40} />
                                <input
                                    value={p.name}
                                    onChange={(e) => {
                                        const next = [...localPirates];
                                        next[i] = { ...p, name: e.target.value };
                                        setLocalPirates(next);
                                    }}
                                    className="flex-1 rounded-[10px] border-[1.5px] border-[rgba(93,63,42,0.3)] bg-surface-card px-2 py-[6px] text-right font-body text-base"
                                    style={{ direction: 'rtl' }}
                                />
                                <FlagBadge color={p.color} size={20} />
                            </div>
                        ))}
                        {justSaved && (
                            <div className="mt-2 text-center font-body text-sm text-text-secondary">
                                ✓ נשמר
                            </div>
                        )}
                    </SettingsSection>

                    <button
                        onClick={handleSavePirates}
                        disabled={!piratesDirty}
                        className="w-full cursor-pointer rounded-[14px] border-2 border-[var(--flag-mom)] bg-[var(--flag-mom)] px-4 py-3 font-body text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        שמירה
                    </button>

                    <button
                        onClick={onReset}
                        className="w-full cursor-pointer rounded-[14px] border-2 border-treasure-red bg-transparent px-4 py-3 font-body text-base font-semibold text-treasure-red"
                    >
                        איפוס נתונים
                    </button>
                </div>
            </div>
        </ScreenBackground>
    );
}

function SettingsSection({ title, children }: { title: string; children?: ReactNode }) {
    return (
        <div className="rounded-2xl border-[1.5px] border-[rgba(93,63,42,0.25)] bg-surface-card p-[14px]">
            <h3 className="mx-0 mb-[10px] mt-0 font-display text-lg font-bold text-text-primary">
                {title}
            </h3>
            {children}
        </div>
    );
}

function SettingSlider({
    label,
    min,
    max,
    step,
    value,
    onChange,
    format,
}: {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
}) {
    return (
        <div className="py-2">
            <div className="mb-[6px] flex justify-between text-sm">
                <span className="font-semibold text-text-primary">{label}</span>
                <span className="text-text-secondary">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--treasure-gold)' }}
            />
        </div>
    );
}

function SettingToggle({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between border-b border-dashed border-[rgba(93,63,42,0.2)] py-[10px]">
            <span className="text-base text-text-primary">{label}</span>
            <button
                onClick={() => onChange(!value)}
                className="relative h-8 w-14 cursor-pointer rounded-[18px] border-none transition-colors duration-200"
                style={{ background: value ? 'var(--flag-mom)' : '#C0B5A6' }}
            >
                <div
                    className="absolute top-[3px] h-[26px] w-[26px] rounded-[13px] bg-[#FBF1DC] transition-[left] duration-200"
                    style={{
                        left: value ? 3 : 27,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Family section (members + pending invites + invite form)
// ─────────────────────────────────────────────────────────────

function isValidEmail(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function formatJoinedDate(ts: number): string {
    try {
        return new Date(ts).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
}

function FamilySection({
    familyName,
    members,
    currentUserId,
    isOwner,
    pendingInvites,
    memberCap,
    onInvite,
    onRevokeInvite,
    onRemoveMember,
}: FamilySectionProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);

    const atCap = members.length >= memberCap;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2400);
    };

    const submit = async () => {
        const trimmed = email.trim();
        if (!isValidEmail(trimmed)) {
            setError('כתובת אימייל לא תקינה');
            return;
        }
        setError(null);
        setBusy(true);
        try {
            await onInvite(trimmed);
            showToast(`הזמנה נשלחה ל־${trimmed}`);
            setEmail('');
            setFormOpen(false);
        } catch (err) {
            const code = (err as { code?: string }).code;
            const msg = err instanceof Error ? err.message : String(err);
            setError(inviteErrorToHebrew(code, msg));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-2xl border-[1.5px] border-[rgba(93,63,42,0.25)] bg-surface-card p-[14px]">
            <div className="mb-[10px] flex flex-row-reverse items-center justify-between">
                <h3 className="m-0 font-display text-lg font-bold text-text-primary">
                    משפחה
                </h3>
                <span className="font-body text-sm text-text-secondary">
                    {familyName}
                </span>
            </div>

            {/* Crew list */}
            <div>
                {members.map((m) => {
                    const isMe = m.userId === currentUserId;
                    const canRemove = isOwner && !isMe && m.role !== 'owner';
                    return (
                        <div
                            key={m.userId}
                            className="flex flex-row-reverse items-center justify-between gap-3 border-b border-dashed border-[rgba(93,63,42,0.25)] py-[8px]"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-body text-sm font-semibold text-text-primary">
                                    {m.displayName || m.email || 'חבר/ה'}
                                    {isMe && (
                                        <span className="ms-1 text-text-secondary">
                                            (זה אתם)
                                        </span>
                                    )}
                                </span>
                                {m.email && (
                                    <span className="font-body text-xs text-text-secondary">
                                        {m.email}
                                    </span>
                                )}
                                {m.joinedAt > 0 && (
                                    <span className="font-body text-[11px] text-text-secondary">
                                        הצטרפו: {formatJoinedDate(m.joinedAt)}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-row-reverse items-center gap-2">
                                <span
                                    className={`rounded-full px-2 py-[2px] font-body text-[11px] font-semibold ${
                                        m.role === 'owner'
                                            ? 'bg-[rgba(218,165,32,0.2)] text-wood-deep'
                                            : 'bg-[rgba(93,63,42,0.1)] text-text-secondary'
                                    }`}
                                >
                                    {m.role === 'owner' ? 'קפטן' : 'צוות'}
                                </span>
                                {canRemove && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm(
                                                `להסיר את ${m.displayName || m.email} מהמשפחה?`,
                                            )) return;
                                            setRemovingUserId(m.userId);
                                            try {
                                                await onRemoveMember(m.userId);
                                                showToast('הוסר מהמשפחה');
                                            } catch (err) {
                                                setError(
                                                    err instanceof Error
                                                        ? err.message
                                                        : String(err),
                                                );
                                            } finally {
                                                setRemovingUserId(null);
                                            }
                                        }}
                                        disabled={removingUserId === m.userId}
                                        className="cursor-pointer border-none bg-transparent font-body text-sm text-treasure-red underline disabled:opacity-50"
                                    >
                                        הסרה
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pending invites (owner only) */}
            {isOwner && pendingInvites.length > 0 && (
                <div className="mt-3">
                    <div className="mb-1 font-body text-xs font-semibold text-text-secondary">
                        הזמנות ממתינות
                    </div>
                    {pendingInvites.map((inv) => (
                        <div
                            key={inv.id}
                            className="flex flex-row-reverse items-center justify-between gap-2 border-b border-dashed border-[rgba(93,63,42,0.2)] py-[6px]"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-body text-sm text-text-primary">
                                    {inv.inviteeEmail}
                                </span>
                                <span className="font-body text-[11px] text-text-secondary">
                                    נשלחה: {formatJoinedDate(inv.createdAt)}
                                </span>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await onRevokeInvite(inv.id);
                                        showToast('ההזמנה בוטלה');
                                    } catch (err) {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : String(err),
                                        );
                                    }
                                }}
                                className="cursor-pointer border-none bg-transparent font-body text-sm text-treasure-red underline"
                            >
                                ביטול
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Invite form (owner only) */}
            {isOwner && (
                <div className="mt-3">
                    {!formOpen && (
                        <>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setFormOpen(true);
                                }}
                                disabled={atCap}
                                className="w-full cursor-pointer rounded-[12px] border-2 border-wood-deep bg-sand-warm px-4 py-2 font-body text-sm font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                + הזמנת בן/בת משפחה
                            </button>
                            {atCap && (
                                <p className="mt-2 text-center font-body text-xs text-text-secondary">
                                    הספינה מלאה ({memberCap}). הסירו חבר כדי להזמין חדש.
                                </p>
                            )}
                        </>
                    )}
                    {formOpen && (
                        <div className="flex flex-col gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                dir="ltr"
                                className="h-11 w-full rounded-[12px] border-[1.5px] border-[rgba(93,63,42,0.3)] bg-surface-card px-3 font-body text-sm text-text-primary outline-none focus:border-treasure-gold"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !busy) submit();
                                    if (e.key === 'Escape') {
                                        setFormOpen(false);
                                        setEmail('');
                                        setError(null);
                                    }
                                }}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={submit}
                                    disabled={busy || !email.trim()}
                                    className="flex-1 cursor-pointer rounded-[12px] border-2 border-wood-deep bg-sand-warm px-4 py-2 font-body text-sm font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {busy ? '...שולח' : 'שליחת הזמנה'}
                                </button>
                                <button
                                    onClick={() => {
                                        setFormOpen(false);
                                        setEmail('');
                                        setError(null);
                                    }}
                                    disabled={busy}
                                    className="flex-1 cursor-pointer rounded-[12px] border-2 border-[rgba(93,63,42,0.4)] bg-transparent px-4 py-2 font-body text-sm text-text-primary disabled:opacity-50"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-lg border border-treasure-red bg-[rgba(200,75,59,0.08)] px-3 py-2 text-center font-body text-sm text-treasure-red">
                    {error}
                </div>
            )}
            {toast && (
                <div className="mt-3 rounded-lg bg-[rgba(42,157,143,0.12)] px-3 py-2 text-center font-body text-sm text-[var(--flag-mom)]">
                    {toast}
                </div>
            )}
        </div>
    );
}

function inviteErrorToHebrew(code: string | undefined, fallback: string): string {
    switch (code) {
        case 'ALREADY_MEMBER':
            return 'האדם הזה כבר חלק מהמשפחה שלכם.';
        case 'IN_OTHER_FAMILY':
            return 'האימייל הזה כבר שייך למשפחת Pirate Ship אחרת.';
        case 'FAMILY_FULL':
            return 'הצוות מלא (5). הסירו חבר כדי להזמין חדש.';
        case 'INVITE_SELF':
            return 'לא ניתן להזמין את עצמכם.';
        case 'RATE_LIMITED':
            return 'שליחת האימייל נחסמה זמנית. נסו שוב בעוד דקה.';
        case 'SEND_FAILED':
            return 'לא הצלחנו לשלוח את ההזמנה כרגע. נסו שוב.';
        case 'INVALID_EMAIL':
            return 'כתובת אימייל לא תקינה.';
        case 'NOT_OWNER':
            return 'רק בעל המשפחה יכול לשלוח הזמנות.';
        default:
            return fallback || 'שגיאה לא ידועה.';
    }
}
